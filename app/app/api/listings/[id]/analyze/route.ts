
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

  try {
    // Get listing with photos and user info
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

    // Check if premium is requested and available
    // Only use premium if checkbox is checked AND not already used for this listing
    const wantsPremium = listing.usePremium;
    const premiumAvailable = (listing.user?.premiumPostsUsed || 0) < (listing.user?.premiumPostsTotal || 4);
    const alreadyUsedPremium = !!(listing.premiumFacts || listing.usefulLinks); // Check if premium data already exists
    const shouldUsePremium = wantsPremium && premiumAvailable && !alreadyUsedPremium;

    // Get signed URL for the photo
    const photoUrl = await downloadFile(listing.photos[0].cloudStoragePath);

    // Fetch the image and convert to base64
    const imageResponse = await fetch(photoUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    console.log('🔍 Starting AI analysis for listing:', listingId);
    console.log('📸 Photo URL generated successfully');
    console.log('🎯 Premium requested:', wantsPremium, 'Available:', premiumAvailable, 'Using:', shouldUsePremium);
    console.log('🔑 API Key present:', !!process.env.ABACUSAI_API_KEY);
    
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
   INSPECT THE ITEM LIKE A PROFESSIONAL APPRAISER.
   
   CONDITION DEFINITIONS:
   - New / Brand New: Sealed in original package or box, never opened
   - Like New / Open Box: Box has been opened but all parts accounted for, perfect condition
   - Very Good: Used and clean, no visible flaws
   - Good: Used with minor wear (dust, smudges, light scratches)
   - Fair: Used with noticeable wear (dirty, light damage, visible wear)
   - Poor: Used and damaged or heavily worn with missing parts but still works
   - For Parts: Any condition but inoperable/broken
   
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

5. PRICE INTELLIGENCE (CRITICAL - COMPREHENSIVE PRICING):
   Fetch comprehensive market pricing data:
   
   A. Brand New/Sealed Price (brandNewPrice):
      - Average resale price for BRAND NEW SEALED items on eBay
      - For electronics, distinguish between:
        * Current/recent models: 5-10% below retail
        * Dated/older electronics (non-collectible): ~20% of retail
      - If item is 100% confirmed brand new/sealed OR user notes "Brand New", use this price
   
   B. Resale Average Range (for used items):
      - priceRangeHigh: High average for "Very Good" condition (clean, no visible flaws)
      - priceRangeMid: Median average for "Good" condition (used with minor wear)
      - priceRangeLow: Low average for "Fair/Poor" condition (visible damage/wear)
      - priceForParts: Fixed average for "For Parts" (inoperable)
   
   C. Market Insights:
      - How many similar items are currently listed
      - What prices they're actually SELLING for (not just listed)
      - Demand level (high/medium/low)
      - Best time to list (if known)
      - Condition impact breakdown
   
   D. Price Assignment Logic:
      1. IF 100% confident item is brand new/sealed OR user gist says "Brand New":
         → Set price to brandNewPrice
         → Set condition to "New"
      
      2. ELSE (used items), set price based on detected condition:
         - "Like New" → priceRangeHigh * 0.80 (20% less than brand new tier)
         - "Very Good" → priceRangeHigh
         - "Good" → priceRangeMid
         - "Fair" → priceRangeLow
         - "Poor" → priceRangeLow
         - "For Parts" → priceForParts
      
      3. Return ALL price points in response for frontend to use when condition changes
   
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
   - If AI cannot determine a field but it's not critical, auto-fill with "N/A" or "Unknown" (no alert)
   
   QUESTIONS (?) - BLUE - Actionable insights (always optional):
   - All other notifications go here
   - Always state the insight/observation and ask if user wants to address it
   - Always optional - user can tap Yes or ignore/close
   
   Examples of QUESTIONS:
   - Unknown fields auto-filled: { "actionType": "unknown_fields", "message": "Unknown fields (brand, model, year, size) were set to N/A.", "data": { "fields": ["brand", "model", "year", "size"] } }
   - Electronics without power supply visible: { "actionType": "question", "message": "No power supply detected in photo. Should I assume it's missing? (will adjust price and note in description)" }
   - Electronics with damage + not powered on: { "actionType": "inoperable_check", "message": "Damage detected and item not shown powered on. Is it inoperable/does it not work? (will set condition to For Parts and adjust pricing)" }
   - Blurry/poor photo: { "actionType": "retake_photo", "message": "Image is blurry and poorly lit. Retake for better results?" }
   - Missing details: { "actionType": "question", "message": "Cannot see serial number/model plate. Add photo for transparency?" }
   - Cleaning needed: { "actionType": "question", "message": "Item shows visible dirt/dust. Clean before photographing for better presentation?" }
   - Price concern: { "actionType": "insight", "message": "Your price seems high for 'Poor' condition. Market suggests $X-Y. Adjust?" }
   
   CRITICAL FOR UNKNOWN FIELDS:
   - If AI correctly identifies the item BUT cannot determine brand, model, year, or size, auto-set them to "N/A" or "Unknown"
   - Create a question notification listing all unknown fields that were auto-set
   - This notification should always be optional and user can ignore it if the N/A values are correct
   
   CRITICAL FOR DAMAGE QUESTIONS:
   - Since users can only answer "Yes" to questions, ALWAYS phrase damage/functionality questions in the NEGATIVE
   - Ask "Is it inoperable?" or "Does it NOT work?" NOT "Is it operable?" or "Does it work?"
   - If user doesn't answer or ignores the question, assume the item DOES work (default assumption)
   - Only ask if there's visible damage AND item is not shown powered on/working
   - Questions should NOT be triggered if the condition is already clearly shown in the image.
   - For example: If electronics are shown powered on and working, do NOT ask if they're inoperable.

${shouldUsePremium ? `10. PREMIUM FACTS & USEFUL LINKS:
    Go the extra mile to provide valuable information that helps the seller and buyer:
    
    Premium Facts (Random/useful/valuable information):
    - Interesting history or trivia about the item
    - What makes this item special or valuable
    - Common issues or things buyers should know
    - Maintenance tips or care instructions
    - What accessories or parts typically come with it
    - Collector information (if applicable)
    - Limited editions or rare features
    - Performance specs or capabilities
    
    Useful Links (JSON array of objects):
    - Official product manuals or documentation
    - Local repair shops or service centers
    - Parts suppliers or accessories dealers
    - User guides or tutorials
    - Community forums or resources
    - Similar items for comparison
    Format: [{ "title": "Link description", "url": "https://..." }, ...]` : `10. PREMIUM FEATURES:
    SKIP - User did not request premium analysis.
    Set premiumFacts and usefulLinks to null.`}

Provide a JSON response:
{
  "imageQualityIssue": null or "Specific issue: blurry/poor lighting/unrecognizable/need more angles",
  "itemIdentified": true or false,
  "confidence": 0.0 to 1.0,
  "alternativeItems": [{"item": "Alternative item name 1", "confidence": 0.8}, {"item": "Alternative item name 2", "confidence": 0.6}] or null (list 2-3 alternatives if uncertain),
  "category": "specific category",
  "brand": "exact brand name or null or 'N/A' if unknown",
  "model": "exact model number/name or null or 'N/A' if unknown",
  "year": "year or version or null or 'Unknown' if unknown",
  "color": "color/finish or null",
  "material": "material(s) or null",
  "size": "size/dimensions or null or 'N/A' if unknown",
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
  "brandNewPrice": number or null (resale price for brand new sealed items),
  "priceRangeHigh": number or null (high average for Very Good condition),
  "priceRangeMid": number or null (median average for Good condition),
  "priceRangeLow": number or null (low average for Fair/Poor condition),
  "priceForParts": number or null (fixed average for For Parts),
  "avgMarketPrice": number or null (DEPRECATED - for backwards compatibility, use priceRangeMid),
  "suggestedPriceMin": number or null (DEPRECATED),
  "suggestedPriceMax": number or null (DEPRECATED),
  "marketInsights": "detailed market analysis with condition impact",
  "premiumFacts": "Premium/special facts and valuable information about the item" or null,
  "usefulLinks": [{ "title": "Link description", "url": "https://..." }] or null,
  "alerts": [{ "field": "field_name", "message": "Required field message" }],
  "questions": [{ "actionType": "retake_photo|add_photo|inoperable_check|question|insight|unknown_fields", "message": "Question message (state insight and ask)", "data": {} }]
}

Respond with raw JSON only. No markdown, no code blocks.`,
          },
        ],
      },
    ];

    console.log('🚀 Calling Abacus LLM API...');
    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.ABACUSAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
        messages,
        stream: true,
        max_tokens: 2500,
        response_format: { type: 'json_object' },
      }),
    });

    console.log('📡 LLM API Response Status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ LLM API error:', response.status, errorText);
      throw new Error(`AI analysis failed: ${response.status} - ${errorText.substring(0, 200)}`);
    }
    
    console.log('✅ LLM API call successful, starting stream...');

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
                    
                    // Smart Condition Logic: Only update condition if NEW damage found
                    // Check if existing condition notes mention damage
                    const existingConditionNotes = listing.conditionNotes || '';
                    const existingHasDamage = existingConditionNotes.toLowerCase().includes('damage') || 
                                             existingConditionNotes.toLowerCase().includes('scratch') ||
                                             existingConditionNotes.toLowerCase().includes('dent') ||
                                             existingConditionNotes.toLowerCase().includes('crack') ||
                                             existingConditionNotes.toLowerCase().includes('chip') ||
                                             existingConditionNotes.toLowerCase().includes('tear') ||
                                             existingConditionNotes.toLowerCase().includes('worn') ||
                                             existingConditionNotes.toLowerCase().includes('stain');
                    
                    const newConditionNotes = finalResult.conditionNotes || '';
                    const newHasDamage = newConditionNotes.toLowerCase().includes('damage') || 
                                        newConditionNotes.toLowerCase().includes('scratch') ||
                                        newConditionNotes.toLowerCase().includes('dent') ||
                                        newConditionNotes.toLowerCase().includes('crack') ||
                                        newConditionNotes.toLowerCase().includes('chip') ||
                                        newConditionNotes.toLowerCase().includes('tear') ||
                                        newConditionNotes.toLowerCase().includes('worn') ||
                                        newConditionNotes.toLowerCase().includes('stain');
                    
                    // Only update condition if: 
                    // 1. No existing condition notes, OR
                    // 2. New damage discovered when there wasn't any before
                    let finalConditionNotes = existingConditionNotes;
                    let finalCondition = listing.condition;
                    
                    if (!existingConditionNotes) {
                      // First analysis - use all new condition info
                      finalConditionNotes = newConditionNotes;
                      finalCondition = finalResult.condition;
                    } else if (!existingHasDamage && newHasDamage) {
                      // NEW damage discovered - append to existing notes
                      finalConditionNotes = `${existingConditionNotes}\n\nADDITIONAL FINDINGS: ${newConditionNotes}`;
                      finalCondition = finalResult.condition; // Degrade condition
                      
                      // Create notification for new damage
                      await prisma.aINotification.create({
                        data: {
                          listingId,
                          type: 'QUESTION',
                          message: `New damage detected in additional photo: ${newConditionNotes.split('\n')[0]}. Would you like to update the condition description?`,
                          field: null,
                          actionType: 'new_damage_detected',
                          actionData: JSON.stringify({ newDamage: newConditionNotes }),
                        },
                      });
                    }
                    // Otherwise: keep existing condition notes (don't overwrite if new photo shows cleaner angle)

                    // Update listing in database
                    await prisma.listing.update({
                      where: { id: listingId },
                      data: {
                        itemIdentified: finalResult.itemIdentified ?? false,
                        confidence: finalResult.confidence ?? 0,
                        alternativeItems: finalResult.alternativeItems ? JSON.stringify(finalResult.alternativeItems) : null,
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
                        condition: finalCondition,
                        conditionNotes: finalConditionNotes,
                        tags: finalResult.tags ?? [],
                        searchTags: finalResult.searchTags ?? [],
                        recommendedPlatforms: finalResult.recommendedPlatforms ?? [],
                        qualifiedPlatforms: finalResult.qualifiedPlatforms ?? [],
                        brandNewPrice: finalResult.brandNewPrice ?? null,
                        priceRangeHigh: finalResult.priceRangeHigh ?? null,
                        priceRangeMid: finalResult.priceRangeMid ?? null,
                        priceRangeLow: finalResult.priceRangeLow ?? null,
                        priceForParts: finalResult.priceForParts ?? null,
                        avgMarketPrice: finalResult.avgMarketPrice ?? finalResult.priceRangeMid ?? null, // Backwards compatibility
                        suggestedPriceMin: finalResult.suggestedPriceMin ?? null,
                        suggestedPriceMax: finalResult.suggestedPriceMax ?? null,
                        marketInsights: finalResult.marketInsights ?? null,
                        imageQualityIssue: finalResult.imageQualityIssue ?? null,
                        premiumFacts: shouldUsePremium ? (finalResult.premiumFacts ?? null) : null,
                        usefulLinks: shouldUsePremium && finalResult.usefulLinks ? JSON.stringify(finalResult.usefulLinks) : null,
                        // Auto-set price from AI based on condition if not already set
                        price: listing.price ?? (() => {
                          const condition = finalCondition;
                          
                          // Use comprehensive pricing if available
                          if (finalResult.brandNewPrice || finalResult.priceRangeHigh) {
                            switch (condition) {
                              case 'New':
                                return finalResult.brandNewPrice ?? finalResult.priceRangeHigh ?? null;
                              case 'Like New':
                                // Like New = +20% of Very Good (priceRangeHigh)
                                return finalResult.priceRangeHigh ? finalResult.priceRangeHigh * 1.20 : null;
                              case 'Very Good':
                                return finalResult.priceRangeHigh ?? null;
                              case 'Good':
                                return finalResult.priceRangeMid ?? finalResult.priceRangeHigh ?? null;
                              case 'Fair':
                                return finalResult.priceRangeLow ?? finalResult.priceRangeMid ?? null;
                              case 'Poor':
                                // Poor = -25% of Fair (priceRangeLow)
                                return finalResult.priceRangeLow ? finalResult.priceRangeLow * 0.75 : null;
                              case 'For Parts':
                                return finalResult.priceForParts ?? finalResult.priceRangeLow ?? null;
                              default:
                                return finalResult.priceRangeMid ?? null;
                            }
                          }
                          
                          // Fallback to old logic for backwards compatibility
                          if (!finalResult.avgMarketPrice) return null;
                          const basePrice = finalResult.avgMarketPrice;
                          if (!condition) return basePrice * 0.65;
                          const multipliers: Record<string, number> = {
                            'New': 1.0,
                            'Like New': 0.90,  // Updated from 0.85
                            'Very Good': 0.75,
                            'Good': 0.65,
                            'Fair': 0.50,
                            'Poor': 0.375,  // Updated: 0.50 * 0.75 = 0.375
                            'For Parts': 0.20
                          };
                          return basePrice * (multipliers[condition] || 0.65);
                        })(),
                      },
                    });

                    // Increment premium usage counter if premium was used
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
                    console.log('✅ Analysis completed successfully!');
                  } catch (e) {
                    console.error('❌ Error parsing final result:', e);
                    throw e;
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
    console.error('Error stack:', error?.stack);
    
    // Return a more detailed error message
    const errorMessage = error?.message || 'Analysis failed - unknown error';
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error?.stack?.substring(0, 500) 
      },
      { status: 500 }
    );
  }
}
