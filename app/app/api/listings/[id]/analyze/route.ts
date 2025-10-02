
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
   
   CONDITION NOTES FORMAT:
   "Current State: [describe observed condition]
    Issues Detected: [list all damage/wear/dirt]
    Value Impact: [how condition affects price - be honest]
    Seller Actions: [specific steps to improve: 'Clean with X', 'Repair Y', 'Replace Z', 'Photograph from better angle']"
   
   BE BRUTALLY HONEST - Buyers will see these issues, so detecting them helps sellers prepare!

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

8. REQUIRED FIELD VALIDATION:
   Check if these critical fields can be determined:
   - brand, model, condition, category, size (if applicable)
   If any REQUIRED field is uncertain, add a question to "questionsForUser"

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
  "conditionNotes": "DETAILED condition assessment with specific issues and improvement suggestions",
  "tags": ["relevant", "keywords"],
  "recommendedPlatforms": ["top 2-3 platforms"],
  "qualifiedPlatforms": ["all qualifying platforms"],
  "avgMarketPrice": number or null (baseline for GOOD condition),
  "suggestedPriceMin": number or null,
  "suggestedPriceMax": number or null,
  "marketInsights": "detailed market analysis with condition impact",
  "needsMoreInfo": true/false,
  "questionsForUser": ["specific questions about missing required fields"],
  "missingRequiredFields": ["field names that are required but uncertain"]
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
                        weight: finalResult.estimatedWeight ?? null,
                        dimensions: finalResult.estimatedDimensions ?? null,
                        shippingCostEst: finalResult.shippingCostEst ?? null,
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
                    if (finalResult.conditionNotes && (
                      finalResult.conditionNotes.toLowerCase().includes('clean') ||
                      finalResult.conditionNotes.toLowerCase().includes('repair') ||
                      finalResult.conditionNotes.toLowerCase().includes('damage') ||
                      finalResult.conditionNotes.toLowerCase().includes('stain')
                    )) {
                      await prisma.aINotification.create({
                        data: {
                          listingId,
                          type: 'ALERT',
                          message: `Condition Assessment: ${finalResult.conditionNotes}`,
                          field: 'condition',
                        },
                      });
                    }

                    // Create notifications for missing required fields
                    if (finalResult.missingRequiredFields?.length > 0) {
                      for (const field of finalResult.missingRequiredFields) {
                        await prisma.aINotification.create({
                          data: {
                            listingId,
                            type: 'ALERT',
                            message: `Required field "${field}" could not be determined. Please provide this information.`,
                            field: field,
                          },
                        });
                      }
                    }

                    // Create notifications if AI has questions
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
