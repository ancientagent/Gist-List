
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { downloadFile } from '@/lib/s3';
import { queueReindex } from '@/lib/search-indexing';

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
    // Parse request body to check for skipImageAnalysis flag
    let body: any = {};
    try {
      const contentType = request.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const text = await request.text();
        body = text ? JSON.parse(text) : {};
      }
    } catch (e) {
      console.log('No request body or invalid JSON, using defaults');
    }
    const theGist = body.theGist || '';

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

    // Auto-detect if we should skip image analysis based on whether photos exist
    const hasPhotos = !!(listing.photos && listing.photos.length > 0 && listing.photos[0]?.cloudStoragePath);
    const skipImageAnalysis = body.skipImageAnalysis || !hasPhotos;
    
    console.log('📸 Photo check:', { 
      hasPhotos, 
      photoCount: listing.photos?.length || 0,
      skipImageAnalysis,
      requestedSkip: body.skipImageAnalysis 
    });

    // Check if premium is requested and available
    // Only use premium if checkbox is checked AND not already used for this listing
    const wantsPremium = listing.usePremium;
    const premiumAvailable = (listing.user?.premiumPostsUsed || 0) < (listing.user?.premiumPostsTotal || 4);
    const alreadyUsedPremium = !!(listing.premiumFacts || listing.usefulLinks); // Check if premium data already exists
    const shouldUsePremium = wantsPremium && premiumAvailable && !alreadyUsedPremium;

    let base64Image: string | null = null;
    
    // Only fetch and convert image if NOT skipping image analysis
    if (!skipImageAnalysis) {
      // Get signed URL for the photo
      const cloudStoragePath = listing.photos[0]?.cloudStoragePath;
      if (!cloudStoragePath) {
        return NextResponse.json({ error: 'Photo not found or not uploaded yet' }, { status: 400 });
      }
      const photoUrl = await downloadFile(cloudStoragePath);

      // Fetch the image and convert to base64
      const imageResponse = await fetch(photoUrl);
      const imageBuffer = await imageResponse.arrayBuffer();
      base64Image = Buffer.from(imageBuffer).toString('base64');
    }

    console.log('🔍 Starting AI analysis for listing:', listingId);
    console.log('📸 Photo analysis:', !skipImageAnalysis ? 'Enabled' : 'Skipped (text-only)');
    console.log('📝 User GIST:', theGist || listing.theGist || 'None');
    console.log('🎯 Premium requested:', wantsPremium, 'Available:', premiumAvailable, 'Using:', shouldUsePremium);
    console.log('🔑 API Key present:', !!process.env.ABACUSAI_API_KEY);
    
    // Call LLM API with streaming
    const userGist = theGist || listing.theGist || '';
    
    // Build content array based on whether we have an image
    const contentArray: any[] = [];
    
    if (base64Image) {
      // Image analysis mode
      contentArray.push({
        type: 'image_url',
        image_url: {
          url: `data:image/jpeg;base64,${base64Image}`,
        },
      });
      contentArray.push({
        type: 'text',
        text: `You are an EXPERT resale inspector and market analyst with years of experience evaluating items for condition and value. Analyze this image with EXTREME ATTENTION TO DETAIL.

${userGist ? `User notes: "${userGist}"` : ''}

CRITICAL REQUIREMENTS:

1. IMAGE QUALITY CHECK:
   - Assess if the image is blurry, poorly lit, or unrecognizable
   - Check if all angles are visible or if more photos are needed
   - If quality is poor, set "imageQualityIssue" with specific feedback
   - Only proceed with analysis if image quality is acceptable

2. ITEM IDENTIFICATION & ALTERNATIVES (CRITICAL):
   - Identify the item with as much confidence as possible
   - ALWAYS generate 2-3 alternative identifications, even if you're confident
   - Alternatives should be plausible misidentifications or similar items
   - Include confidence scores (0.0-1.0) for each alternative
   - This allows users to correct misidentifications easily
   - Example: If you see "Nike Air Max 90", alternatives might be "Nike Air Max 95", "Nike Air Max 1", etc.

3. INTENSIVE CONDITION INSPECTION (CRITICAL - BE THOROUGH):
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
    Recommended before listing: [specific actions: 'Clean with microfiber cloth', 'Repair torn seam', 'Replace missing button']"
   
   BE FACTUAL - No "appears to be", "seems like", "might have". State what IS visible.

4. TITLE GENERATION (CRITICAL):
   Use proven, classic title formats based on market research:
   - Format: [Brand] [Model] [Key Feature/Specs] - [Condition] [Size/Year]
   - Examples:
     * "Nike Air Jordan 1 Retro High OG Chicago - Size 10 - Excellent"
     * "Apple iPhone 13 Pro 256GB Pacific Blue - Unlocked - Like New"
     * "Vintage Fender Stratocaster Electric Guitar 1978 - Sunburst - Good"
     * "Sony PlayStation 5 Digital Edition Console - New in Box"
   - Include specific model numbers, years, sizes, colors, materials
   - Front-load important keywords (brand, model, condition)

5. COMPREHENSIVE FIELD EXTRACTION:
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

6. PRICE INTELLIGENCE (CRITICAL - RESALE/SECONDHAND PRICES ONLY):
   IMPORTANT: Fetch ACTUAL RESALE MARKET PRICES from secondhand markets (eBay SOLD listings, Mercari, Facebook Marketplace, etc.)
   DO NOT use retail prices or MSRP. These are USED/RESALE items being sold by individuals.
   
   A. Brand New/Sealed Price (brandNewPrice):
      - RESALE price for BRAND NEW SEALED items on secondhand markets (eBay, Mercari, etc.)
      - Look at what NEW sealed items are ACTUALLY SELLING FOR on resale platforms
      - NOT retail price, NOT MSRP - this is the resale market price for new items
      - For electronics, distinguish between:
        * Current/recent models: Typically 5-15% below retail on resale markets
        * Dated/older electronics (non-collectible): ~20-30% of retail on resale markets
      - If item is 100% confirmed brand new/sealed OR user notes "Brand New", use this price
   
   B. Resale Average Range (for USED items on SECONDHAND markets):
      CRITICAL: These are ACTUAL SECONDHAND/USED item prices from resale platforms
      - priceRangeHigh: What "Very Good" used items ACTUALLY SELL FOR on eBay, Mercari, etc.
      - priceRangeMid: What "Good" used items ACTUALLY SELL FOR on resale platforms
      - priceRangeLow: What "Fair/Poor" used items ACTUALLY SELL FOR on resale platforms
      - priceForParts: What broken/parts-only items ACTUALLY SELL FOR on resale platforms
      
      LOOK AT COMPLETED/SOLD LISTINGS, NOT ACTIVE LISTINGS
   
   C. Market Insights:
      - How many similar items are currently listed on resale platforms
      - What prices they're ACTUALLY SELLING FOR (completed sales, not just listed)
      - Demand level on secondhand markets (high/medium/low)
      - Best time to list (if known)
      - Condition impact breakdown in resale market
   
   D. Price Assignment Logic:
      1. IF 100% confident item is brand new/sealed OR user gist says "Brand New":
         → Set price to brandNewPrice (resale market price for new)
         → Set condition to "New"
      
      2. ELSE (used items), set price based on detected condition:
         - "Like New" → priceRangeHigh * 0.80 (20% less than brand new resale tier)
         - "Very Good" → priceRangeHigh
         - "Good" → priceRangeMid
         - "Fair" → priceRangeLow
         - "Poor" → priceRangeLow
         - "For Parts" → priceForParts
      
      3. Return ALL price points in response for frontend to use when condition changes
   
   REMEMBER: All prices should reflect ACTUAL RESALE/SECONDHAND market values from platforms like:
   - eBay (SOLD/COMPLETED listings)
   - Mercari sold items
   - Facebook Marketplace
   - OfferUp
   - Poshmark (for fashion)
   - Other secondhand marketplaces
   
7. SHIPPING ESTIMATION:
   - Estimate weight based on item type and size
   - Estimate dimensions (L×W×H in inches)
   - Calculate rough shipping cost using standard carrier rates
   - Format: estimatedWeight (lbs), estimatedDimensions (string), shippingCostEst (number)

8. PLATFORM RECOMMENDATIONS:
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

9. SEARCH TAGS (SEO OPTIMIZATION):
   Generate up to 20 search tags ordered by effectiveness:
   - Primary keywords (brand, model, category)
   - Secondary keywords (color, material, size, condition)
   - Style/aesthetic keywords (vintage, modern, retro, etc.)
   - Use case keywords (gift, collector, daily use, etc.)
   - Platform-specific popular search terms
   Example: ["nike air jordan", "jordan 1 retro", "high top sneakers", "red white shoes", "size 10 mens", "basketball shoes", "collectible sneakers"]

10. ALERTS & QUESTIONS:
   Generate smart notifications with clear distinction:
   
   ALERTS (!) - RED - Required fields only:
   - ONLY for fields that MUST be filled to continue
   - Examples: brand, model (if applicable), category
   - Format: { "field": "brand", "message": "Brand is required for this item" }
   - If AI cannot determine a field but it's not critical, auto-fill with "unknown" (no alert)
   
   QUESTIONS (?) - BLUE - Actionable insights (always optional):
   - All other notifications go here
   - Always state the insight/observation and ask if user wants to address it
   - Always optional - user can tap Yes or ignore/close
   
   CONSOLIDATED BUYER DISCLOSURE NOTIFICATION (CRITICAL - REPLACES MULTIPLE NOTIFICATIONS):
   For ANY potential issue that could affect value/condition that you've detected but can't fully confirm from the photo, create ONE consolidated notification:
   
   Detection triggers (use same logic as before, but consolidate into ONE notification):
   - Electronics without power supply visible
   - Electronics with damage and not shown powered on (potential inoperability)
   - Missing accessories that typically come with the item
   - Functionality concerns (can't confirm if it works)
   - Visible damage that may affect performance
   - Signs of wear that may indicate hidden issues
   - Any other concerns about completeness, functionality, or condition
   
   When ANY of these are detected, create ONE notification:
   { 
     "actionType": "buyer_disclosure", 
     "message": "Is there anything else buyers should know about the item?",
     "data": { 
       "detectedIssues": ["list of issues you detected, e.g., 'no power supply visible', 'damage without power-on test'"],
       "field": "description"
     }
   }
   
   This notification will:
   - Take user to the main description field
   - Open the smart chip bin to help them add details
   - Allow them to specify: missing items, functionality status, condition details
   - Item condition and value will be adjusted based on their input
   
   DO NOT create separate notifications for missing power supply, inoperability checks, etc. - consolidate into this ONE notification.
   
   Other QUESTIONS (non-consolidated):
   - Unknown year/version: { "actionType": "unknown_year", "message": "Do you know if this item has a year or version number?", "data": { "possibleYears": ["suggestion1", "suggestion2", "suggestion3"] } }
   - Unknown fields auto-filled: { "actionType": "unknown_fields", "message": "Some fields were set to unknown - add more details?", "data": { "fields": ["brand", "model", "size"] } }
   - Blurry/poor photo: { "actionType": "retake_photo", "message": "Image is blurry and poorly lit. Retake for better results?" }
   - Missing details for transparency: { "actionType": "question", "message": "Cannot see serial number/model plate. Add photo for transparency?" }
   - Cleaning needed: { "actionType": "question", "message": "Your item is showing some Dust/dirt, not the worst thing, but could be better. Wipe and Retake?" }
   - Price concern: { "actionType": "insight", "message": "Your price seems high for 'Poor' condition. Market suggests $X-Y. Adjust?" }
   
   CRITICAL FOR UNKNOWN FIELDS:
   - If AI correctly identifies the item BUT cannot determine brand, model, year, or size, auto-set them to "unknown"
   - Create a question notification listing all unknown fields that were auto-set
   - This notification should always be optional and user can ignore it if the unknown values are correct

11. SPECIAL ITEM DETECTION (ALWAYS REQUIRED - REGARDLESS OF PREMIUM STATUS):
    CRITICAL: Always detect if this is a "Special Item" - even for free users.
    
    Special Item Categories:
    - "Vintage" - Items 20+ years old with nostalgic/historical value
    - "Collectible" - Items sought by collectors (trading cards, limited editions, memorabilia)
    - "Antique" - Items 100+ years old with historical significance
    - "Luxury" - High-end designer items, luxury brands (Rolex, Louis Vuitton, Gucci, Chanel, etc.)
    - "Custom" - Custom-made, handcrafted, or one-of-a-kind items
    - "Art" - Original artwork, sculptures, fine art pieces
    - "Rare" - Limited production, hard to find, discontinued items with collector demand
    
    If item matches ANY category above:
    - Set isPremiumItem: true
    - Set specialClass: "Vintage" | "Collectible" | "Antique" | "Luxury" | "Custom" | "Art" | "Rare"
    - Set specialItemReason: Brief 1-2 sentence explanation of WHY this is special (for free user preview)
      Example: "This 1978 Fender Stratocaster is a vintage collectible guitar from Fender's golden era, sought after by collectors and musicians for its iconic sound and craftsmanship."
    
    If item is NOT special:
    - Set isPremiumItem: false
    - Set specialClass: null
    - Set specialItemReason: null

${shouldUsePremium ? `12. PREMIUM FACTS & USEFUL LINKS (FOR UNLOCKED PREMIUM ONLY):
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
    Format: [{ "title": "Link description", "url": "https://..." }, ...]` : `12. PREMIUM FEATURES:
    SKIP - User has not unlocked premium for this item.
    Set premiumFacts and usefulLinks to null.`}

Provide a JSON response:
{
  "imageQualityIssue": null or "Specific issue: blurry/poor lighting/unrecognizable/need more angles",
  "itemIdentified": true or false,
  "confidence": 0.0 to 1.0,
  "alternativeItems": [{"item": "Alternative item name 1", "confidence": 0.8}, {"item": "Alternative item name 2", "confidence": 0.6}] (ALWAYS provide 2-3 alternative identifications, even if confident about main identification),
  "category": "specific category",
  "brand": "exact brand name or 'unknown' if unknown",
  "model": "exact model number/name or 'unknown' if unknown",
  "year": "year or version or 'unknown' if unknown",
  "color": "color/finish or 'unknown' if unknown",
  "material": "material(s) or 'unknown' if unknown",
  "size": "size/dimensions or 'unknown' if unknown",
  "specs": "key specifications or 'unknown' if unknown",
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
  "isPremiumItem": true or false (ALWAYS REQUIRED - detect special items for all users),
  "specialClass": "Vintage" | "Collectible" | "Antique" | "Luxury" | "Custom" | "Art" | "Rare" | null,
  "specialItemReason": "1-2 sentence explanation of why this is special" or null,
  "premiumFacts": "Premium/special facts and valuable information about the item" or null,
  "usefulLinks": [{ "title": "Link description", "url": "https://..." }] or null,
  "alerts": [{ "field": "field_name", "message": "Required field message" }],
  "questions": [{ "actionType": "retake_photo|add_photo|inoperable_check|question|insight|unknown_fields", "message": "Question message (state insight and ask)", "data": {} }]
}

Respond with raw JSON only. No markdown, no code blocks.`,
      });
    } else {
      // Text-only analysis mode (no image)
      contentArray.push({
        type: 'text',
        text: `You are an EXPERT resale market analyst with years of experience helping resellers create optimized listings. A user has provided a text description of an item they want to sell. Extract ALL available information and provide intelligent market insights.

User description: "${userGist}"

CRITICAL REQUIREMENTS:

1. TEXT PARSING & EXTRACTION:
   - Extract brand, model, year/version, condition, color, size, and any other specific details
   - Identify shipping preferences (e.g., "shipping", "local pickup", "will ship", "locals welcome")
   - Identify environment details (e.g., "smoke free home", "pet free", "single owner")
   - Look for condition keywords (e.g., "good condition", "like new", "brand new", "sealed", "used")
   - Extract location if mentioned (e.g., "Buda Texas", "Austin", "Dallas")
   
2. ITEM IDENTIFICATION:
   - Identify the item with as much confidence as possible based on the text
   - ALWAYS generate 2-3 alternative identifications if the description could match multiple items
   - Include confidence scores (0.0-1.0) for each alternative
   - If the description is too vague, set low confidence and suggest alternatives

3. CONDITION ASSESSMENT (TEXT-ONLY):
   IMPORTANT: Without a photo, condition CANNOT be fully assessed.
   - If user explicitly states condition (e.g., "good condition", "brand new"), use that
   - If user mentions specific damage or wear, document it in conditionNotes
   - If NO condition is mentioned, set condition to null and conditionNotes explaining photo needed
   - ALWAYS create a buyer_disclosure notification suggesting the user add photos and condition details
   - Format conditionNotes from seller POV: "User states: [their description]. Photo verification recommended for buyers."

4. TITLE GENERATION:
   Use proven title formats:
   - Format: [Brand] [Model] [Key Feature/Specs] - [Condition] [Size/Year]
   - Front-load important keywords (brand, model, condition)
   - Examples:
     * "Artiphon Orba 1 Portable Synthesizer - Good Condition - Single Owner"
     * "Apple iPhone 13 Pro 256GB Pacific Blue - Unlocked - Like New"
     * "Vintage Fender Stratocaster Electric Guitar 1978 - Sunburst"

5. COMPREHENSIVE FIELD EXTRACTION:
   Extract what's available from text:
   - Brand, Model, Year/Version, Color, Material
   - Size/Dimensions (if mentioned)
   - Specifications (storage, RAM, etc. if mentioned)
   - Serial numbers (if mentioned)
   - Original packaging status (if mentioned)
   - For unknown/missing fields, set to 'unknown' (NOT null or "N/A")

6. PRICE INTELLIGENCE (CRITICAL - RESALE/SECONDHAND PRICES):
   Based on the identified item, fetch ACTUAL RESALE MARKET PRICES:
   - brandNewPrice: Resale price for brand new sealed items
   - priceRangeHigh: "Very Good" used items on secondhand markets
   - priceRangeMid: "Good" used items on secondhand markets
   - priceRangeLow: "Fair/Poor" used items on secondhand markets
   - priceForParts: Broken/parts-only items
   
   Price Assignment Logic:
   1. If user says "brand new" or "sealed": use brandNewPrice
   2. If user provides condition: use corresponding price range
   3. If NO condition provided: use priceRangeMid as default (can be adjusted when photos added)
   
   Include marketInsights with condition impact breakdown

7. SHIPPING ESTIMATION:
   - Estimate based on item category and typical dimensions
   - If user mentions location (e.g., "Buda Texas"), note it
   - If user mentions shipping preference (e.g., "will ship", "locals welcome"), document in description

8. PLATFORM RECOMMENDATIONS:
   Based on item category and shipping needs:
   - eBay: Electronics, collectibles, vintage items, anything shippable
   - Mercari: Fashion, home goods, general items
   - Poshmark: Clothing, shoes, accessories
   - Facebook Marketplace: Local pickup items, furniture, large items
   - OfferUp/Nextdoor: Local items
   - Reverb: Musical instruments, audio equipment
   - Vinted: Fashion and accessories
   
   Recommend top 2-3 platforms, list all qualified platforms

9. SEARCH TAGS (SEO OPTIMIZATION):
   Generate up to 20 search tags ordered by effectiveness:
   - Primary keywords (brand, model, category)
   - Secondary keywords (color, material, size, condition)
   - Style/aesthetic keywords
   - Use case keywords

10. ALERTS & QUESTIONS:
    
    ALERTS (!) - RED - Required fields only:
    - ONLY if critical fields are completely missing and cannot be inferred
    - Example: { "field": "category", "message": "Category is required to continue" }
    
    QUESTIONS (?) - BLUE - Actionable insights:
    
    CRITICAL: ALWAYS create a buyer_disclosure notification for text-only listings:
    { 
      "actionType": "buyer_disclosure", 
      "message": "Photos and condition verification recommended. Add photos and details about the item's actual condition?",
      "data": { 
        "detectedIssues": ["no photo for condition verification", "condition cannot be assessed without images"],
        "field": "description",
        "needsPhotos": true
      }
    }
    
    Other possible questions:
    - If year/version unknown: { "actionType": "unknown_year", "message": "Do you know if this item has a year or version number?", "data": { "possibleYears": [...] } }
    - If any unknown fields were set to null: { "actionType": "unknown_fields", "message": "Some details couldn't be determined from text. Add photos for better analysis?", "data": { "fields": [...] } }
    - If price concern: { "actionType": "insight", "message": "Market suggests pricing based on condition verification. Add photos?" }

11. SPECIAL ITEM DETECTION (ALWAYS REQUIRED):
    Detect if this is a special item:
    - "Vintage" (20+ years), "Collectible", "Antique" (100+ years)
    - "Luxury" (high-end brands), "Custom", "Art", "Rare"
    
    If special:
    - Set isPremiumItem: true
    - Set specialClass and specialItemReason

${shouldUsePremium ? `12. PREMIUM FACTS & USEFUL LINKS:
    Provide valuable information:
    - Interesting facts about the item
    - What makes it special or valuable
    - Common issues buyers should know
    - Maintenance tips
    - Official manuals, repair shops, parts suppliers
    Format links: [{ "title": "Description", "url": "https://..." }]` : `12. PREMIUM FEATURES:
    SKIP - Set premiumFacts and usefulLinks to null.`}

Provide a JSON response (same format as image analysis):
{
  "imageQualityIssue": null (no image provided),
  "itemIdentified": true or false,
  "confidence": 0.0 to 1.0,
  "alternativeItems": [{"item": "Alternative 1", "confidence": 0.8}, ...],
  "category": "specific category",
  "brand": "exact brand name or 'unknown'",
  "model": "exact model number/name or 'unknown'",
  "year": "year or 'unknown'",
  "color": "color or 'unknown'",
  "material": "material or 'unknown'",
  "size": "size or 'unknown'",
  "specs": "specifications or 'unknown'",
  "estimatedWeight": number or null,
  "estimatedDimensions": "LxWxH" or null,
  "shippingCostEst": number or null,
  "title": "optimized title",
  "description": "comprehensive description including user's notes about shipping, location, environment",
  "condition": "New/Like New/Very Good/Good/Fair/Poor" or null if not stated,
  "conditionNotes": "User states: [their description]. Photo verification recommended." or null,
  "tags": ["keywords"],
  "searchTags": ["up to 20 SEO tags"],
  "recommendedPlatforms": ["top 2-3"],
  "qualifiedPlatforms": ["all qualifying"],
  "brandNewPrice": number or null,
  "priceRangeHigh": number or null,
  "priceRangeMid": number or null,
  "priceRangeLow": number or null,
  "priceForParts": number or null,
  "avgMarketPrice": number or null,
  "suggestedPriceMin": number or null,
  "suggestedPriceMax": number or null,
  "marketInsights": "market analysis",
  "isPremiumItem": true or false,
  "specialClass": "category" or null,
  "specialItemReason": "explanation" or null,
  "premiumFacts": "facts" or null,
  "usefulLinks": [{...}] or null,
  "alerts": [{...}],
  "questions": [{"actionType": "buyer_disclosure", "message": "Photos and condition verification recommended...", "data": {...}}, ...]
}

Respond with raw JSON only. No markdown, no code blocks.`,
      });
    }
    
    const messages = [
      {
        role: 'user',
        content: contentArray,
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
                        category: finalResult.category ?? 'unknown',
                        brand: finalResult.brand ?? 'unknown',
                        model: finalResult.model ?? 'unknown',
                        year: finalResult.year ?? 'unknown',
                        color: finalResult.color ?? 'unknown',
                        material: finalResult.material ?? 'unknown',
                        size: finalResult.size ?? 'unknown',
                        specs: finalResult.specs ?? 'unknown',
                        weight: finalResult.estimatedWeight ?? null,
                        dimensions: finalResult.estimatedDimensions ?? null,
                        shippingCostEst: finalResult.shippingCostEst ?? null,
                        title: finalResult.title ?? 'unknown',
                        description: finalResult.description ?? null,
                        condition: finalCondition ?? 'unknown',
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
                        // Special Item Detection (ALWAYS saved - regardless of premium status)
                        isPremiumItem: finalResult.isPremiumItem ?? false,
                        specialClass: finalResult.specialClass ?? null,
                        // Note: specialItemReason is not in schema yet, will be stored in a notification for free users
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

                    // Create QUESTIONS (actionable insights - blue) and INSIGHTS (yellow)
                    if (finalResult.questions?.length > 0) {
                      for (const question of finalResult.questions) {
                        // For buyer_disclosure, ensure only ONE notification exists
                        if (question.actionType === 'buyer_disclosure') {
                          // Check if a buyer_disclosure notification already exists
                          const existingBuyerDisclosure = await prisma.aINotification.findFirst({
                            where: {
                              listingId,
                              actionType: 'buyer_disclosure',
                            },
                          });
                          
                          // Only create if it doesn't exist
                          if (!existingBuyerDisclosure) {
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
                        } else {
                          // For all other notifications, create normally
                          await prisma.aINotification.create({
                            data: {
                              listingId,
                              type: question.actionType === 'insight' ? 'INSIGHT' : 'QUESTION',
                              message: question.message,
                              field: null,
                              actionType: question.actionType,
                              // Extend actionData with section/mood/context for Pass A without DB migration
                              actionData: JSON.stringify({
                                ...(question.data || {}),
                                section: question.section || undefined,
                                mood: (finalResult.category && typeof finalResult.category === 'string') ? ((): string => {
                                  const c = finalResult.category.toLowerCase();
                                  if (c.includes('electronic')) return 'tech';
                                  if (c.includes('jewel')) return 'luxury';
                                  if (c.includes('doll') || c.includes('clown')) return 'doll';
                                  if (/\b(19\d\d|18\d\d)\b/.test(c) || c.includes('vintage')) return 'historic';
                                  if (c.includes('painting') || c.includes('art')) return 'art';
                                  if (c.includes('apparel') || c.includes('fashion') || c.includes('shoe') || c.includes('clothing')) return 'fashion';
                                  if (c.includes('toy')) return 'kitsch';
                                  return 'neutral';
                                })() : 'neutral',
                                context: question.context || undefined,
                              }),
                            },
                          });
                        }
                      }
                    }

                    // Create Special Item Detection notification (for free users with special items)
                    if (finalResult.isPremiumItem && !shouldUsePremium) {
                      // Check if special item notification already exists
                      const existingSpecialNotification = await prisma.aINotification.findFirst({
                        where: {
                          listingId,
                          actionType: 'special_item_detected',
                        },
                      });
                      
                      // Only create if it doesn't exist
                      if (!existingSpecialNotification) {
                        const specialClass = finalResult.specialClass || 'Special';
                        const specialReason = finalResult.specialItemReason || 'This item has been identified as a special collectible item.';
                        
                        await prisma.aINotification.create({
                          data: {
                            listingId,
                            type: 'INSIGHT',
                            message: `🎯 ${specialClass} Item Detected! ${specialReason} Unlock premium features to access detailed insights, collector information, and helpful resources.`,
                            field: null,
                            actionType: 'special_item_detected',
                            actionData: JSON.stringify({
                              specialClass: finalResult.specialClass,
                              specialItemReason: finalResult.specialItemReason,
                              showUpgradePrompt: true,
                            }),
                          },
                        });
                      }
                    }

                    // Trigger search reindexing after analysis completes
                    queueReindex(listingId, 'listing_analyzed').catch((err) => {
                      console.error('[SearchIndex] Failed to queue reindex after analysis:', err);
                    });

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
