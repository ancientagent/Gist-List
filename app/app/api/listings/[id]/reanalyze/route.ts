
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { downloadFile } from '@/lib/s3';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const listingId = params.id;
  const { selectedItem } = await request.json();

  if (!selectedItem) {
    return NextResponse.json({ error: 'Selected item required' }, { status: 400 });
  }

  try {
    // Get listing with photos
    const listing = await prisma.listing.findUnique({
      where: { id: listingId, userId },
      include: { 
        photos: { orderBy: { order: 'asc' } },
        user: {
          select: {
            premiumPostsUsed: true,
            premiumPostsTotal: true,
          }
        }
      },
    });

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (!listing.photos?.[0]) {
      return NextResponse.json({ error: 'No photo found' }, { status: 400 });
    }

    const wantsPremium = listing.usePremium;
    const premiumAvailable = (listing.user?.premiumPostsUsed || 0) < (listing.user?.premiumPostsTotal || 4);
    const alreadyUsedPremium = !!(listing.premiumFacts || listing.usefulLinks);
    const shouldUsePremium = wantsPremium && premiumAvailable && !alreadyUsedPremium;

    // Get signed URL for the photo
    const photoUrl = await downloadFile(listing.photos[0].cloudStoragePath);

    // Fetch the image and convert to base64
    const imageResponse = await fetch(photoUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    console.log('🔄 Re-analyzing with selected item:', selectedItem);
    
    // Call LLM API with the specific item selected
    const messages = [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`,
            },
          },
          {
            type: 'text',
            text: `CRITICAL: The user has confirmed this item is: "${selectedItem}"

You are an EXPERT resale inspector and market analyst. Re-analyze this image specifically as "${selectedItem}".

${listing.theGist ? `User notes: "${listing.theGist}"` : ''}

Perform complete analysis as before, but use "${selectedItem}" as the confirmed item identification.

Generate complete response with all fields (title, description, pricing, condition, etc.) for "${selectedItem}".

Provide a JSON response:
{
  "itemIdentified": true,
  "confidence": 1.0,
  "alternativeItems": null,
  "category": "specific category for ${selectedItem}",
  "brand": "brand name",
  "model": "model name",
  "year": "year or null",
  "color": "color or null",
  "material": "material or null",
  "size": "size or null",
  "specs": "specifications",
  "estimatedWeight": number or null,
  "estimatedDimensions": "LxWxH" or null,
  "shippingCostEst": number or null,
  "title": "optimized title for ${selectedItem}",
  "description": "complete description for ${selectedItem}",
  "condition": "New/Like New/Very Good/Good/Fair/Poor",
  "conditionNotes": "condition assessment",
  "tags": ["tags"],
  "searchTags": ["search tags"],
  "recommendedPlatforms": ["platforms"],
  "qualifiedPlatforms": ["all platforms"],
  "brandNewPrice": number or null,
  "priceRangeHigh": number or null,
  "priceRangeMid": number or null,
  "priceRangeLow": number or null,
  "priceForParts": number or null,
  "avgMarketPrice": number or null,
  "suggestedPriceMin": number or null,
  "suggestedPriceMax": number or null,
  "marketInsights": "market analysis",
  "premiumFacts": ${shouldUsePremium ? '"premium facts"' : 'null'},
  "usefulLinks": ${shouldUsePremium ? '[{"title": "Link", "url": "https://..."}]' : 'null'},
  "alerts": [],
  "questions": []
}

Respond with raw JSON only. No markdown, no code blocks.`,
          },
        ],
      },
    ];

    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.ABACUSAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
        messages,
        stream: false,
        max_tokens: 2500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ LLM API error:', response.status, errorText);
      throw new Error(`Re-analysis failed: ${response.status}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    // Update listing with new analysis
    await prisma.listing.update({
      where: { id: listingId },
      data: {
        itemIdentified: true,
        confidence: 1.0,
        alternativeItems: null, // Clear alternatives after selection
        category: result.category ?? null,
        brand: result.brand ?? null,
        model: result.model ?? null,
        year: result.year ?? null,
        color: result.color ?? null,
        material: result.material ?? null,
        size: result.size ?? null,
        specs: result.specs ?? null,
        weight: result.estimatedWeight ?? null,
        dimensions: result.estimatedDimensions ?? null,
        shippingCostEst: result.shippingCostEst ?? null,
        title: result.title ?? null,
        description: result.description ?? null,
        condition: result.condition ?? null,
        conditionNotes: result.conditionNotes ?? null,
        tags: result.tags ?? [],
        searchTags: result.searchTags ?? [],
        recommendedPlatforms: result.recommendedPlatforms ?? [],
        qualifiedPlatforms: result.qualifiedPlatforms ?? [],
        brandNewPrice: result.brandNewPrice ?? null,
        priceRangeHigh: result.priceRangeHigh ?? null,
        priceRangeMid: result.priceRangeMid ?? null,
        priceRangeLow: result.priceRangeLow ?? null,
        priceForParts: result.priceForParts ?? null,
        avgMarketPrice: result.avgMarketPrice ?? result.priceRangeMid ?? null,
        suggestedPriceMin: result.suggestedPriceMin ?? null,
        suggestedPriceMax: result.suggestedPriceMax ?? null,
        marketInsights: result.marketInsights ?? null,
        premiumFacts: shouldUsePremium ? (result.premiumFacts ?? null) : null,
        usefulLinks: shouldUsePremium && result.usefulLinks ? JSON.stringify(result.usefulLinks) : null,
        price: (() => {
          const condition = result.condition;
          
          if (result.brandNewPrice || result.priceRangeHigh) {
            switch (condition) {
              case 'New':
                return result.brandNewPrice ?? result.priceRangeHigh ?? null;
              case 'Like New':
                return result.priceRangeHigh ? result.priceRangeHigh * 1.20 : null;
              case 'Very Good':
                return result.priceRangeHigh ?? null;
              case 'Good':
                return result.priceRangeMid ?? result.priceRangeHigh ?? null;
              case 'Fair':
                return result.priceRangeLow ?? result.priceRangeMid ?? null;
              case 'Poor':
                return result.priceRangeLow ? result.priceRangeLow * 0.75 : null;
              case 'For Parts':
                return result.priceForParts ?? result.priceRangeLow ?? null;
              default:
                return result.priceRangeMid ?? null;
            }
          }
          
          if (!result.avgMarketPrice) return null;
          const basePrice = result.avgMarketPrice;
          if (!condition) return basePrice * 0.65;
          const multipliers: Record<string, number> = {
            'New': 1.0,
            'Like New': 0.90,
            'Very Good': 0.75,
            'Good': 0.65,
            'Fair': 0.50,
            'Poor': 0.375,
            'For Parts': 0.20
          };
          return basePrice * (multipliers[condition] || 0.65);
        })(),
      },
    });

    // Increment premium usage if used
    if (shouldUsePremium) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          premiumPostsUsed: {
            increment: 1
          }
        }
      });
    }

    // Clear existing notifications
    await prisma.aINotification.deleteMany({
      where: { listingId }
    });

    console.log('✅ Re-analysis completed!');

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('Re-analysis error:', error);
    return NextResponse.json(
      { error: error?.message || 'Re-analysis failed' },
      { status: 500 }
    );
  }
}
