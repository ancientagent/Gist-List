
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { downloadFile } from '@/lib/s3';

const prisma = new PrismaClient();

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

  try {
    // Get listing with photos
    const listing = await prisma.listing.findUnique({
      where: { id: listingId, userId },
      include: { photos: { orderBy: { order: 'asc' } } },
    });

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (!listing.photos?.[0]) {
      return NextResponse.json({ error: 'No photo found' }, { status: 400 });
    }

    // Get signed URL for the photo
    const photoUrl = await downloadFile(listing.photos[0].cloudStoragePath);

    // Fetch the image and convert to base64
    const imageResponse = await fetch(photoUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    // Call LLM API with streaming
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
            text: `You are an expert resale assistant and market researcher. Analyze this image thoroughly.

${listing.theGist ? `User notes: "${listing.theGist}"` : ''}

CRITICAL REQUIREMENTS:

1. IMAGE QUALITY CHECK:
   - Assess if the image is blurry, poorly lit, or unrecognizable
   - If quality is poor, set "imageQualityIssue" with specific feedback
   - Only proceed with analysis if image quality is acceptable

2. ITEM CONDITION ASSESSMENT:
   - Detect any damage, dirt, dust, scratches, wear, dents, or defects
   - Note if cleaning or repairs could improve selling chances
   - Provide specific condition insights in "conditionNotes"

3. TITLE GENERATION (CRITICAL):
   Use proven, classic title formats based on market research:
   - Format: [Brand] [Model] [Key Feature/Specs] - [Condition] [Size/Year]
   - Examples:
     * "Nike Air Jordan 1 Retro High OG Chicago - Size 10 - Excellent"
     * "Apple iPhone 13 Pro 256GB Pacific Blue - Unlocked - Like New"
     * "Vintage Fender Stratocaster Electric Guitar 1978 - Sunburst - Good"
     * "Sony PlayStation 5 Digital Edition Console - New in Box"
   - Include specific model numbers, years, sizes, colors, materials
   - Front-load important keywords (brand, model, condition)

4. COMPREHENSIVE FIELD EXTRACTION:
   Extract ALL relevant details:
   - Brand (exact name)
   - Model (exact model number/name)
   - Year/Version (if applicable)
   - Color/Finish
   - Material
   - Dimensions/Size
   - Specifications (for electronics: storage, RAM, screen size, etc.)
   - Serial numbers or identifying marks (if visible)
   - Original packaging status

5. PRICE INTELLIGENCE:
   - Research current market prices for this exact item
   - Provide avgMarketPrice, suggestedPriceMin, suggestedPriceMax
   - Include marketInsights with:
     * How many similar items are currently listed
     * What prices they're selling for
     * Demand level (high/medium/low)
     * Best time to list (if known)

6. PLATFORM RECOMMENDATIONS:
   Based on item category and condition:
   - eBay: Electronics, collectibles, vintage items
   - Mercari: Fashion, home goods, general items
   - Poshmark: Clothing, shoes, accessories
   - Facebook Marketplace: Local pickup items, furniture
   - OfferUp: Local items, larger goods
   - Reverb: Musical instruments, audio equipment
   - Vinted: Fashion and accessories
   Recommend top 2-3 platforms, list all qualified platforms

Provide a JSON response:
{
  "imageQualityIssue": null or "Specific issue: blurry/poor lighting/unrecognizable",
  "itemIdentified": true or false,
  "confidence": 0.0 to 1.0,
  "category": "specific category",
  "brand": "exact brand name",
  "model": "exact model number/name",
  "year": "year or version",
  "color": "color/finish",
  "material": "material(s)",
  "size": "size/dimensions",
  "specs": "key specifications",
  "title": "optimized title using classic format",
  "description": "comprehensive, compelling description with all details",
  "condition": "New/Like New/Good/Fair/Poor",
  "conditionNotes": "damage, wear, cleanliness assessment, improvement suggestions",
  "tags": ["relevant", "keywords"],
  "recommendedPlatforms": ["top 2-3 platforms"],
  "qualifiedPlatforms": ["all qualifying platforms"],
  "avgMarketPrice": number or null,
  "suggestedPriceMin": number or null,
  "suggestedPriceMax": number or null,
  "marketInsights": "detailed market analysis",
  "needsMoreInfo": true/false,
  "questionsForUser": []
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
        model: 'gpt-4.1-mini',
        messages,
        stream: true,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error('AI analysis failed');
    }

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        let buffer = '';
        let partialRead = '';

        try {
          while (true) {
            const { done, value } = await reader!.read();
            if (done) break;

            partialRead += decoder.decode(value, { stream: true });
            let lines = partialRead.split('\n');
            partialRead = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  // Parse final result
                  try {
                    const finalResult = JSON.parse(buffer);
                    
                    // Check for image quality issues
                    if (finalResult.imageQualityIssue) {
                      await prisma.aINotification.create({
                        data: {
                          listingId,
                          type: 'ALERT',
                          message: `Image Quality Issue: ${finalResult.imageQualityIssue}. Please retake the photo.`,
                          field: 'photo',
                        },
                      });
                    }
                    
                    // Update listing in database
                    await prisma.listing.update({
                      where: { id: listingId },
                      data: {
                        itemIdentified: finalResult.itemIdentified ?? false,
                        confidence: finalResult.confidence ?? 0,
                        category: finalResult.category ?? null,
                        brand: finalResult.brand ?? null,
                        model: finalResult.model ?? null,
                        year: finalResult.year ?? null,
                        color: finalResult.color ?? null,
                        material: finalResult.material ?? null,
                        size: finalResult.size ?? null,
                        specs: finalResult.specs ?? null,
                        title: finalResult.title ?? null,
                        description: finalResult.description ?? null,
                        condition: finalResult.condition ?? null,
                        conditionNotes: finalResult.conditionNotes ?? null,
                        tags: finalResult.tags ?? [],
                        recommendedPlatforms: finalResult.recommendedPlatforms ?? [],
                        qualifiedPlatforms: finalResult.qualifiedPlatforms ?? [],
                        avgMarketPrice: finalResult.avgMarketPrice ?? null,
                        suggestedPriceMin: finalResult.suggestedPriceMin ?? null,
                        suggestedPriceMax: finalResult.suggestedPriceMax ?? null,
                        marketInsights: finalResult.marketInsights ?? null,
                        imageQualityIssue: finalResult.imageQualityIssue ?? null,
                      },
                    });

                    // Create condition improvement notification
                    if (finalResult.conditionNotes && finalResult.conditionNotes.toLowerCase().includes('clean')) {
                      await prisma.aINotification.create({
                        data: {
                          listingId,
                          type: 'ALERT',
                          message: `Condition Suggestion: ${finalResult.conditionNotes}`,
                          field: 'condition',
                        },
                      });
                    }

                    // Create notifications if needed
                    if (finalResult.needsMoreInfo && finalResult.questionsForUser?.length > 0) {
                      for (const question of finalResult.questionsForUser) {
                        await prisma.aINotification.create({
                          data: {
                            listingId,
                            type: 'PREFERENCE',
                            message: question,
                          },
                        });
                      }
                    }

                    const finalData = JSON.stringify({
                      status: 'completed',
                      result: finalResult,
                    });
                    controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
                  } catch (e) {
                    console.error('Error parsing final result:', e);
                  }
                  controller.close();
                  return;
                }

                try {
                  const parsed = JSON.parse(data);
                  buffer += parsed.choices?.[0]?.delta?.content || '';
                  
                  const progressData = JSON.stringify({
                    status: 'processing',
                    message: 'Analyzing image...',
                  });
                  controller.enqueue(encoder.encode(`data: ${progressData}\n\n`));
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: error?.message || 'Analysis failed' },
      { status: 500 }
    );
  }
}
