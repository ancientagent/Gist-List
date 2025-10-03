
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
            text: `You are an EXPERT resale inspector and market analyst with years of experience evaluating items for condition and value. Analyze this image with EXTREME ATTENTION TO DETAIL.

${listing.theGist ? `User notes: "${listing.theGist}"` : ''}

CRITICAL REQUIREMENTS:

1. IMAGE QUALITY CHECK:
   - Assess if the image is blurry, poorly lit, or unrecognizable
   - Check if all angles are visible or if more photos are needed
   - If quality is poor, set "imageQualityIssue" with specific feedback
   - Only proceed with analysis if image quality is acceptable

2. INTENSIVE CONDITION INSPECTION (CRITICAL - BE THOROUGH):
   INSPECT THE ITEM LIKE A PROFESSIONAL APPRAISER:
   
   Physical Damage:
   - Scratches (surface, deep, hairline)
   - Dents, dings, or deformations
   - Cracks, chips, or breaks
   - Scuffs, scrapes, or abrasions
   - Tears, rips, or holes (for textiles)
   - Rust, corrosion, or oxidation (for metals)
   - Discoloration or fading
   - Missing parts or pieces
   
   Cleanliness & Maintenance:
   - Dirt, dust, or grime buildup
   - Stains (oil, water, ink, food)
   - Pet hair or odors (if visible)
   - Mold or mildew signs
   - Fingerprints or smudges
   - Need for cleaning or polishing
   
   Wear & Aging:
   - Normal wear patterns
   - Edge wear or fraying
   - Sole wear (for shoes)
   - Button or zipper condition
   - Elastic condition (for clothing)
   - Creasing or cracking (leather)
   - Yellowing (for plastics/white items)
   
   Functionality (if assessable):
   - Signs of working condition
   - Battery compartment condition
   - Screen condition (for electronics)
   - Stitching integrity (for items with seams)
   
   CONDITION NOTES FORMAT (CRITICAL - SELLER POV):
   Write from the perspective of the SELLER, not an observer. Use FACTS from the image, NO UNCERTAINTY.
   BAD: "The item appears to have some scratches and may need cleaning"
   GOOD: "Light surface scratches on the top cover. Dust visible in the crevices."
   
   Structure:
   "Item shows: [specific observed issues - be factual]
    Functional status: [if assessable from image]
    Recommended before listing: [specific actions: 'Clean with microfiber cloth', 'Repair torn seam', 'Replace missing button']"
   
   BE FACTUAL - No "appears to be", "seems like", "might have". State what IS visible.

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
   - Dimensions/Size (both physical and packaging)
   - Weight (estimate if visible)
   - Specifications (for electronics: storage, RAM, screen size, etc.)
   - Serial numbers or identifying marks (if visible)
   - Original packaging status

5. PRICE INTELLIGENCE:
   - Research current market prices for this exact item in this condition
   - Provide avgMarketPrice for GOOD condition as baseline
   - Include marketInsights with:
     * How many similar items are currently listed
     * What prices they're actually SELLING for (not just listed)
     * Demand level (high/medium/low)
     * Best time to list (if known)
     * Condition impact on price
   
6. SHIPPING ESTIMATION:
   - Estimate weight based on item type and size
   - Estimate dimensions (L×W×H in inches)
   - Calculate rough shipping cost using standard carrier rates
   - Format: estimatedWeight (lbs), estimatedDimensions (string), shippingCostEst (number)

7. PLATFORM RECOMMENDATIONS:
   Based on item category, condition, and shipping needs:
   - eBay: Electronics, collectibles, vintage items, anything shippable
   - Mercari: Fashion, home goods, general items
   - Poshmark: Clothing, shoes, accessories (fashion focus)
   - Facebook Marketplace: Local pickup items, furniture, large items
   - OfferUp: Local items, larger goods
   - Craigslist: Local only, larger items, vehicles
   - Nextdoor: Local neighborhood items
   - Reverb: Musical instruments, audio equipment
   - Vinted: Fashion and accessories
   Recommend top 2-3 platforms, list all qualified platforms

8. SEARCH TAGS (SEO OPTIMIZATION):
   Generate up to 20 search tags ordered by effectiveness:
   - Primary keywords (brand, model, category)
   - Secondary keywords (color, material, size, condition)
   - Style/aesthetic keywords (vintage, modern, retro, etc.)
   - Use case keywords (gift, collector, daily use, etc.)
   - Platform-specific popular search terms
   Example: ["nike air jordan", "jordan 1 retro", "high top sneakers", "red white shoes", "size 10 mens", "basketball shoes", "collectible sneakers"]

9. ALERTS & QUESTIONS:
   Generate smart notifications with clear distinction:
   
   ALERTS (!) - RED - Required fields only:
   - ONLY for fields that MUST be filled to continue
   - Examples: brand, model (if applicable), category
   - Format: { "field": "brand", "message": "Brand is required for this item" }
   - If AI cannot determine a field but it's not critical, auto-fill with "N/A" (no alert)
   
   QUESTIONS (?) - BLUE - Actionable insights (always optional):
   - All other notifications go here
   - Always state the insight/observation and ask if user wants to address it
   - Always optional - user can tap Yes or ignore/close
   
   Examples of QUESTIONS:
   - Electronics without power supply visible: { "actionType": "question", "message": "No power supply detected in photo. Should I assume it's missing? (will adjust price and note in description)" }
   - Electronics with damage + not powered on: { "actionType": "inoperable_check", "message": "Damage detected and item not shown powered on. Is it inoperable/does it not work? (will set condition to For Parts and adjust pricing)" }
   - Blurry/poor photo: { "actionType": "retake_photo", "message": "Image is blurry and poorly lit. Retake for better results?" }
   - Missing details: { "actionType": "question", "message": "Cannot see serial number/model plate. Add photo for transparency?" }
   - Cleaning needed: { "actionType": "question", "message": "Item shows visible dirt/dust. Clean before photographing for better presentation?" }
   - Price concern: { "actionType": "insight", "message": "Your price seems high for 'Poor' condition. Market suggests $X-Y. Adjust?" }
   
   CRITICAL FOR DAMAGE QUESTIONS:
   - Since users can only answer "Yes" to questions, ALWAYS phrase damage/functionality questions in the NEGATIVE
   - Ask "Is it inoperable?" or "Does it NOT work?" NOT "Is it operable?" or "Does it work?"
   - If user doesn't answer or ignores the question, assume the item DOES work (default assumption)
   - Only ask if there's visible damage AND item is not shown powered on/working
   - Questions should NOT be triggered if the condition is already clearly shown in the image.
   - For example: If electronics are shown powered on and working, do NOT ask if they're inoperable.

Provide a JSON response:
{
  "imageQualityIssue": null or "Specific issue: blurry/poor lighting/unrecognizable/need more angles",
  "itemIdentified": true or false,
  "confidence": 0.0 to 1.0,
  "category": "specific category",
  "brand": "exact brand name or null",
  "model": "exact model number/name or null",
  "year": "year or version or null",
  "color": "color/finish or null",
  "material": "material(s) or null",
  "size": "size/dimensions or null",
  "specs": "key specifications or null",
  "estimatedWeight": number (in lbs) or null,
  "estimatedDimensions": "LxWxH" or null,
  "shippingCostEst": number or null,
  "title": "optimized title using classic format",
  "description": "comprehensive, compelling description with all details",
  "condition": "New/Like New/Very Good/Good/Fair/Poor",
  "conditionNotes": "FACTUAL condition assessment from seller POV - no uncertainty",
  "tags": ["relevant", "keywords"],
  "searchTags": ["up to 20 SEO-optimized search tags ordered by effectiveness"],
  "recommendedPlatforms": ["top 2-3 platforms"],
  "qualifiedPlatforms": ["all qualifying platforms"],
  "avgMarketPrice": number or null (baseline for GOOD condition),
  "suggestedPriceMin": number or null,
  "suggestedPriceMax": number or null,
  "marketInsights": "detailed market analysis with condition impact",
  "isPremiumItem": true or false (expensive/technical/collectible/rare items),
  "alerts": [{ "field": "field_name", "message": "Required field message" }],
  "questions": [{ "actionType": "retake_photo|add_photo|inoperable_check|question|insight", "message": "Question message (state insight and ask)", "data": {} }]
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
        model: 'gpt-4o',
        messages,
        stream: true,
        max_tokens: 2500,
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
                        weight: finalResult.estimatedWeight ?? null,
                        dimensions: finalResult.estimatedDimensions ?? null,
                        shippingCostEst: finalResult.shippingCostEst ?? null,
                        title: finalResult.title ?? null,
                        description: finalResult.description ?? null,
                        condition: finalResult.condition ?? null,
                        conditionNotes: finalResult.conditionNotes ?? null,
                        tags: finalResult.tags ?? [],
                        searchTags: finalResult.searchTags ?? [],
                        recommendedPlatforms: finalResult.recommendedPlatforms ?? [],
                        qualifiedPlatforms: finalResult.qualifiedPlatforms ?? [],
                        avgMarketPrice: finalResult.avgMarketPrice ?? null,
                        suggestedPriceMin: finalResult.suggestedPriceMin ?? null,
                        suggestedPriceMax: finalResult.suggestedPriceMax ?? null,
                        marketInsights: finalResult.marketInsights ?? null,
                        imageQualityIssue: finalResult.imageQualityIssue ?? null,
                        isPremiumItem: finalResult.isPremiumItem ?? false,
                        // Auto-set price from AI based on condition if not already set
                        price: listing.price ?? (() => {
                          if (!finalResult.avgMarketPrice) return null;
                          const basePrice = finalResult.avgMarketPrice;
                          const condition = finalResult.condition;
                          const multipliers: Record<string, number> = {
                            'New': 1.0,
                            'Like New': 0.85,
                            'Very Good': 0.75,
                            'Good': 0.65,
                            'Fair': 0.50,
                            'Poor': 0.35,
                            'For Parts': 0.20
                          };
                          return basePrice * (multipliers[condition] || 0.65);
                        })(),
                      },
                    });

                    // Create ALERTS (required fields only - red)
                    if (finalResult.alerts?.length > 0) {
                      for (const alert of finalResult.alerts) {
                        await prisma.aINotification.create({
                          data: {
                            listingId,
                            type: 'ALERT',
                            message: alert.message,
                            field: alert.field,
                            actionType: null,
                            actionData: null,
                          },
                        });
                      }
                    }

                    // Create QUESTIONS (actionable insights - blue)
                    if (finalResult.questions?.length > 0) {
                      for (const question of finalResult.questions) {
                        await prisma.aINotification.create({
                          data: {
                            listingId,
                            type: 'QUESTION',
                            message: question.message,
                            field: null,
                            actionType: question.actionType,
                            actionData: question.data ? JSON.stringify(question.data) : null,
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
