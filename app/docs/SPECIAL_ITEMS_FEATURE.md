# Special Items Feature

## Overview

**Special Items** are high-value or collectible products that require enhanced photo documentation and AI-assisted condition analysis. These items include:

- **Collectables** (dolls, action figures, trading cards, coins, stamps)
- **Art** (paintings, sculptures, prints, ceramics)
- **Luxury Items** (designer handbags, watches, jewelry)
- **Historic Items** (antiques, memorabilia, artifacts)
- **Vintage Electronics** (cameras, audio equipment, gaming consoles)
- **Limited Edition Items** (sneakers, apparel, accessories)

Special Items often require **multiple close-up photos** of specific features, serial numbers, condition details, and authentication markers to maximize buyer confidence and selling price.

---

## Current Implementation Snapshot (2025-10-11)

- `/api/photos/upload` captures workflow metadata (requirement, facetTag, notificationId) and stores compressed assets
- `/api/photos/[id]/verify` runs quality checks, aggregates facet metadata, infers `specialClass`, calculates capped price uplifts, and resolves the originating notification
- Listings now persist `verifiedCondition`, `verifiedConditionScore`, `facets`, `priceUplifts`, and boolean `isPremiumItem`
- `listing-detail.tsx` surfaces the Condition Report card plus the Roadshow Reveal card (baseline vs verified value, facet contributions, upgrade CTA)
- Pricing ladder helpers call `applyPremiumUplift` so chips and auto-pricing honour verified premiums (capped at +20%, skipped for parts-only)

Next slice: telemetry/doc polish + rollout planning

---

## Facets: The Value-Defining Features

### What Are Facets?

**Facets** are the special features of Special Items that define their value, authenticity, and desirability to collectors and buyers. These are the details that experts and enthusiasts look for when assessing an item.

Just like an appraiser on *Antiques Roadshow* examining a rare find, GISTer's AI identifies and highlights these critical value-affecting features.

### The "Antiques Roadshow" Experience

**GISTer acts as your digital appraiser:**

1. **Identification Phase**
   - Seller uploads initial photos of a vintage Barbie doll
   - AI recognizes: "This is a 1959 original Barbie - a Special Item!"
   - AI begins identifying **facets** from the photos

2. **Facet Discovery** (The "Aha!" Moments)
   - 👀 "I notice the original zebra-striped swimsuit..."
   - 👀 "The gold hoop earrings are still intact..."
   - 👀 "That's the original box with the ponytail illustration!"
   - 👀 "The serial number indicates first-year production..."

3. **The Big Question**
   - AI draws the seller in with the discoveries
   - **"Do you have any idea how much this is worth?"**
   - Seller often has no idea of true value
   - AI reveals: Based on verified facets, estimated value: **$8,000-$12,000**

### Categories of Facets

**Authentication Facets** (Prove It's Real)
- Original manufacturer tags
- Serial numbers and date codes
- Signature authentication marks
- Correct materials and construction methods
- Period-appropriate features

**Condition Facets** (Affects Value Dramatically)
- Original paint/finish condition
- Structural integrity (no cracks, tears, damage)
- Completeness (all original parts present)
- Wear patterns (minimal vs. extensive)
- Restoration or modifications

**Rarity Facets** (What Makes It Special)
- Limited production run
- Color variations (rare vs. common)
- Factory errors or variations
- Prototype or pre-production samples
- Regional exclusives

**Provenance Facets** (History & Documentation)
- Original packaging and boxes
- Certificates of authenticity
- Purchase receipts or documentation
- Known ownership history
- Exhibition or publication history

**Completeness Facets** (The Full Package)
- All original accessories included
- Original instruction manuals
- Warranty cards or registration
- Display cases or protective packaging
- Related ephemera (ads, catalogs, etc.)

### How GISTer Identifies Facets

**From Photos:**
```
AI analyzes uploaded photo of vintage doll
↓
Identifies Facets:
✓ Original fabric swimsuit (not reproduction) → +$2,000
✓ Copper tubing in body (1959 feature) → +$1,500
✓ Pale skin tone (early production) → +$800
✓ Original earring posts intact → +$500
✓ Face paint crisp with no rubs → +$1,200
↓
Total Value Impact: +$6,000 above base value
```

**From Seller Information:**
```
Seller mentions: "Stored in original box since 1962"
↓
AI identifies Facet:
✓ Original vintage box with ponytail graphic → +$3,000
✓ Time capsule condition (untouched storage) → +$2,000
↓
Requests PHOTO notification: "Add close-up of box condition"
```

### Facet-Based Notifications

When AI identifies a potential facet, it generates targeted notifications:

**PHOTO Notifications for Facets:**
- "Add close-up of serial number tag" → Verify authenticity facet
- "Add close-up of original hardware" → Verify originality facet
- "Add photo of manufacturer stamps" → Verify provenance facet

**INSIGHT Notifications for Facets:**
- "Mention color variation - platinum blonde hair is rare for this model" → Rarity facet
- "Note original box - adds 40% to value for this year" → Completeness facet
- "Describe any factory marks or stamps visible" → Authentication facet

**QUESTION Notifications for Facets:**
- "Is this from the first production year (1959)?" → Rarity facet
- "Are the earrings original or replacements?" → Completeness facet
- "Has the item been professionally restored?" → Condition facet

### Facet-Based Value Calculation

Each verified facet contributes to overall value:

**Example: 1959 Barbie Doll**

| Facet | Status | Value Impact |
|-------|--------|--------------|
| First year production (1959) | ✅ Verified via serial | +$2,500 base |
| Original swimsuit (not repro) | ✅ Verified via photo | +$2,000 |
| Platinum blonde (rare variant) | ✅ Verified via photo | +$1,500 |
| Original hoop earrings intact | ✅ Verified via photo | +$500 |
| Face paint pristine | ✅ Verified via photo | +$1,200 |
| Original box with graphics | ✅ Verified via photo | +$3,000 |
| Time capsule condition | ✅ Verified via history | +$2,000 |
| **Total Estimated Value** | | **$12,700** |

Without facet verification: ~$1,500-$2,000 (generic "vintage Barbie")
With facet verification: ~$12,000-$15,000 (authenticated rare variant)

### The "Roadshow Reveal" Moment

**Traditional Antiques Roadshow:**
```
Owner: "My grandmother left me this old doll..."
Appraiser: "Do you have any idea what this is worth?"
Owner: "Maybe $100?"
Appraiser: "This is a first-year Barbie in original condition.
           At auction, this could bring $8,000-$12,000."
Owner: *shock and delight*
```

**GISTer's Digital Experience:**
```
Seller: Uploads photos of "old Barbie from the attic"
GISTer AI: Analyzes photos, identifies facets
GISTer AI: "I've identified several valuable features:
           - First year production (1959)
           - Original swimsuit and earrings
           - Rare platinum blonde variant
           - Original box included

           Do you have any idea how much this is worth?"
Seller: "Maybe $50-100?"
GISTer AI: "Based on verified facets, estimated value:
           $8,000-$12,000

           Premium items like this deserve premium presentation.
           Would you like to upgrade to Quality Verification
           to maximize your sale price?"
Seller: *upgrades to premium* 🎯
```

### Facet Discovery Flow

**Step 1: Initial Recognition**
- AI identifies item as Special Item
- Triggers premium features (if enabled)

**Step 2: Facet Identification**
- AI analyzes all available data (photos, description, category)
- Identifies present and potential facets
- Assesses which facets are verified vs. uncertain

**Step 3: Verification Requests**
- Generates PHOTO notifications for visual facet verification
- Generates QUESTION notifications for information facets
- Generates INSIGHT notifications for knowledge sharing

**Step 4: Facet-Based Valuation**
- Each verified facet adds value impact
- Overall condition score incorporates facet assessments
- Price estimation reflects verified facets

**Step 5: The Reveal**
- Shows seller breakdown of facets and their value
- Compares verified listing to unverified baseline
- Highlights premium upgrade benefits

### Benefits of Facet-Based System

**For Sellers:**
- **Discovery**: Learn what makes their item valuable
- **Education**: Understand what collectors look for
- **Confidence**: Know they're pricing correctly
- **Conversion**: "Roadshow moment" drives premium upgrades

**For Buyers:**
- **Transparency**: See exactly what they're paying for
- **Verification**: Facets are AI-verified, not seller claims
- **Comparison**: Compare facets across similar items
- **Trust**: Objective facet assessment reduces risk

**For GISTer:**
- **Engagement**: "Roadshow reveal" is exciting and shareable
- **Premium Conversion**: Value discovery drives upgrades
- **Differentiation**: No other platform offers facet-based appraisal
- **Viral Potential**: Sellers share surprising valuations

---

## PHOTO Notification System

### Purpose

For Special Items, the AI generates multiple PHOTO notifications requesting specific close-up images of:
- Authentication markers (tags, serial numbers, stamps, signatures)
- Condition-critical areas (corners, edges, mechanisms, paint, fabric)
- Value-affecting details (original packaging, certificates, accessories)

### Notification Types

**PHOTO notifications** (purple, camera icon):
- Request specific photos to satisfy listing requirements
- Must be completed by capturing/uploading the requested image
- Cannot be satisfied with text or chips - **photos only**

---

## Complete PHOTO Notification Workflow

### Step 1: User Initiates Photo Request

1. User clicks purple PHOTO notification
   - Example: "Add close-up of hair rooting and face paint"
2. Dialog appears with two options:
   - **📷 Camera** - Take photo now
   - **📤 Upload** - Select from device
3. User selects **Camera** or **Upload**

### Step 2: Photo Capture/Upload

- Camera opens with the requirement displayed at top
- User takes photo of the requested subject
- Photo is submitted to server

### Step 3: AI Quality & Accuracy Verification (First Pass)

**Before accepting the photo, AI must verify:**

✅ **Quality Check**
- Is the photo clear and well-lit?
- Is the resolution sufficient for analysis?
- Are there any major obstructions or blur?

✅ **Clarity Check**
- Is the subject in focus?
- Are important details visible and readable?
- Is the framing appropriate for the request?

✅ **Accuracy Check**
- Does the photo actually show what was requested?
- Examples:
  - Request: "closeup of doll's eyes" → Verify eyes are visible and in focus
  - Request: "serial number tag" → Verify tag text is readable
  - Request: "box corner condition" → Verify corners are clearly shown

**If Verification Fails:**
- ❌ Show alert modal: "Photo doesn't meet requirements"
- Provide specific feedback:
  - "The doll's eyes are not clearly visible. Please retake with better focus on the eye area."
  - "The serial number is too blurry to read. Please ensure the tag is in focus."
  - "The lighting is too dark. Please take photo in better lighting conditions."
- Provide **Try Again** button to retake/reupload
- Do NOT save the photo
- Do NOT proceed to condition analysis

**If Verification Passes:**
- ✅ Photo meets quality, clarity, and accuracy requirements
- Save photo to database and associate with listing
- Proceed to condition analysis...

### Step 4: AI Condition Analysis (Second Pass)

Once photo is verified for quality and accuracy, AI performs detailed condition analysis:

**Analysis Scope:**
- Inspect all visible condition details in the photo
- Identify wear, damage, defects, or quality concerns
- Note positive condition attributes
- Assess authenticity markers if visible

**What AI Looks For:**
- **Wear patterns**: Scratches, scuffs, discoloration, fading
- **Damage**: Chips, cracks, tears, stains, missing parts
- **Quality**: Paint condition, fabric integrity, mechanism function
- **Authenticity**: Original tags, correct markings, proper materials
- **Completeness**: All expected components visible

**Output:**
- Natural language condition assessment
- Objective, specific, and buyer-focused
- Follows the mood/tone of the item (luxury, vintage, etc.)

### Step 5: Add to Condition Assessment Field

**AI-generated condition analysis is automatically appended to the "Condition Assessment" textarea:**

Example outputs:
```
Hair rooting shows minor frizzing at temples. Face paint is well-preserved
with no chips or fading. Eyes retain original luster.
```

```
Serial number tag is intact and clearly legible (Model #A1234-5678).
Tag shows age-appropriate yellowing but remains firmly attached.
```

```
Box corners show moderate shelf wear with light creasing on top-right edge.
No tears or significant structural damage observed.
```

**Seller Actions:**
- Review AI-generated text in "Condition Assessment" field
- Edit, refine, or remove any AI-generated content
- Add additional context or details manually

### Step 6: Mark Notification as Resolved

- Purple PHOTO notification is marked complete (resolved)
- Notification disappears from active list
- Photo is linked to the listing and notification record
- If all PHOTO notifications are resolved, seller can proceed with listing

---

## Multiple Photo Requirements

Special Items frequently require **multiple close-up photos** to satisfy different aspects of the listing:

### Example: Vintage Doll Listing

**PHOTO Notifications Generated:**
1. "Add close-up of original tags and labels" → Authentication
2. "Add close-up of hair rooting and face paint" → Condition (head)
3. "Add detailed photo of box corners and condition" → Packaging
4. "Add close-up of joints and mechanisms" → Functionality
5. "Add photo of any included accessories" → Completeness

Each notification must be satisfied independently with its own photo. The AI will analyze each photo in the context of what was requested.

### Example: Designer Handbag Listing

**PHOTO Notifications Generated:**
1. "Add close-up of authentication tag and serial number" → Authentication
2. "Add close-up of hardware (zippers, clasps, logo plates)" → Quality/Authenticity
3. "Add close-up of interior lining and pockets" → Condition (inside)
4. "Add close-up of corners and edges" → Condition (wear points)
5. "Add photo of original dust bag and certificate" → Completeness

---

## Technical Implementation Notes

### Current State (As of 2025-10-10)

**Implemented:**
- ✅ PHOTO notification type with purple styling
- ✅ Contextual helper text ("Select to add closeup")
- ✅ Camera/Upload dialog on notification click
- ✅ Navigation to camera page with requirement parameter

**To Be Implemented:**
- ⏳ Photo upload API endpoint
- ⏳ AI vision analysis for quality/accuracy verification
- ⏳ Retry mechanism for failed verification
- ⏳ AI vision analysis for condition assessment
- ⏳ Auto-append condition text to Condition Assessment field
- ⏳ Photo-to-notification association in database
- ⏳ Photo-to-listing association tracking
- ⏳ Notification resolution on successful photo verification

### Database Schema Considerations

**Photo Table:**
- Link photos to specific notifications (which notification prompted this photo)
- Track verification status (pending, verified, rejected)
- Store AI analysis results
- Store condition assessment text generated from photo

**AINotification Table:**
- Track resolution status
- Link to associated photo(s)
- Store verification failure reasons (if applicable)

---

## User Experience Flow

### Happy Path

1. Seller sees purple notification: "Add close-up of doll's eyes"
2. Seller clicks notification → Camera/Upload dialog appears
3. Seller selects **Camera** → Camera opens
4. Seller takes clear, well-lit photo of doll's eyes
5. Photo uploads → AI analyzes (3-5 seconds)
6. ✅ Photo verified: "Great photo! Analyzing condition..."
7. AI generates condition text: "Eyes retain original luster with no crazing. Eyelashes intact."
8. Text appends to Condition Assessment field
9. Notification marked resolved and disappears
10. Seller reviews condition text, makes any edits
11. Seller proceeds to next notification or finishes listing

### Error Path (Poor Photo Quality)

1. Seller sees purple notification: "Add close-up of serial number tag"
2. Seller clicks notification → Camera/Upload dialog appears
3. Seller selects **Camera** → Camera opens
4. Seller takes blurry photo of tag in poor lighting
5. Photo uploads → AI analyzes (3-5 seconds)
6. ❌ Photo rejected: "The serial number is too blurry to read. Please ensure the tag is in focus and well-lit."
7. Dialog shows **Try Again** button
8. Seller retakes photo with better focus and lighting
9. Photo uploads → AI analyzes
10. ✅ Photo verified → Condition analysis proceeds
11. Notification marked resolved

---

## Benefits for Special Items

### For Sellers

- **Guided photo workflow**: AI tells sellers exactly what photos are needed
- **Quality assurance**: Only clear, accurate photos are accepted
- **Automated condition descriptions**: AI writes professional condition assessments
- **Faster listing creation**: Less guesswork about what buyers want to see
- **Higher completion rates**: Clear requirements reduce abandonment

### For Buyers

- **Confidence in authenticity**: Required photos show verification markers
- **Detailed condition info**: AI-generated assessments are objective and thorough
- **Consistent quality**: All listings have comparable photo documentation
- **Reduced disputes**: Clear photos and descriptions set accurate expectations
- **Better decision-making**: All critical details visible before purchase

---

## Quality Verification System & Value Determination

### Overview

The close-up photos captured through PHOTO notifications form the **foundation of GISTer's quality verification and value determination system** for Special Items. This system provides objective, AI-powered condition assessment and pricing guidance based on verified photo evidence.

### How It Works

**Individual Photo Analysis:**
Each close-up photo is analyzed independently for condition:

1. **Photo 1**: "Add close-up of doll's eyes"
   - AI analyzes: Eye clarity, crazing, paint condition, eyelash integrity
   - **Condition Score**: 8.5/10 (Excellent - minor aging)
   - **Value Impact**: +15% (original eyes in great condition increase value)

2. **Photo 2**: "Add close-up of hair rooting"
   - AI analyzes: Hair pattern, frizzing, loss, original color
   - **Condition Score**: 7.0/10 (Good - some frizzing)
   - **Value Impact**: +5% (acceptable for age, not perfect)

3. **Photo 3**: "Add close-up of original box"
   - AI analyzes: Box structure, corner wear, label condition, crushing
   - **Condition Score**: 6.5/10 (Fair - shelf wear visible)
   - **Value Impact**: +20% (original box adds significant value despite wear)

**Composite Overall Condition:**
The AI combines individual photo analyses to generate:
- **Overall Condition Score**: 7.3/10 (Weighted average across all photos)
- **Overall Condition Grade**: "Very Good with Original Packaging"
- **Estimated Value Range**: $180-$240 (based on verified condition)

**Key Features:**
- Each close-up contributes to the overall condition assessment
- Certain features (authentication markers, original packaging) weight more heavily
- Value is determined by aggregating all verified condition data
- Sellers see transparent breakdown of how condition affects value

### Optional Photo Upload

**Important**: Sellers are **NOT required** to upload close-up photos.

**Two Listing Paths:**

**Path 1: Without Close-Up Photos (Basic Listing)**
- Seller skips PHOTO notifications (dismisses them)
- Listing proceeds without close-up documentation
- No individual condition analysis performed
- No quality verification badge
- Standard listing without premium features
- Value estimation based on general description only

**Path 2: With Close-Up Photos (Verified Listing)**
- Seller completes PHOTO notifications
- AI performs individual photo analysis for each closeup
- Overall condition score and grade generated
- Listing receives **Quality Verified** badge
- Buyers see detailed condition breakdown
- Value estimation based on verified photo evidence
- Higher buyer confidence → typically higher sale price

### Premium Feature Structure

**Special Items Recognition** (Premium Feature)
- AI automatically identifies when an item is a Special Item
- Generates appropriate PHOTO notifications for that item type
- Requires premium subscription or one-time upgrade
- Without this feature: Item treated as standard listing, no PHOTO notifications

**Quality Verification Pack** (Separate Premium Feature)
- Unlocks the full quality verification system
- Enables individual photo condition analysis
- Generates overall condition score and value estimation
- Provides **Quality Verified** badge on listings
- Available as add-on pack or included in higher-tier subscriptions
- _Note: Pricing and pack details to be determined_

**Feature Combination Examples:**

| Subscription Tier | Special Items Recognition | Quality Verification | Outcome |
|-------------------|---------------------------|----------------------|---------|
| Free | ❌ | ❌ | No PHOTO notifications, standard listing |
| Premium | ✅ | ❌ | PHOTO notifications generated, but photos only used for display (no condition analysis) |
| Premium + Verification Pack | ✅ | ✅ | Full feature: PHOTO notifications + condition analysis + value estimation + verified badge |
| Pro Tier | ✅ | ✅ | All features included |

### Buyer-Side Integration

**Quality Verification on Buyer Side** (Future Feature)

The close-up photos and condition analysis will integrate with the **buyer side of GISTer** to provide:

- **Verified Condition Badges**: Listings with completed verification display trust indicators
- **Detailed Condition Breakdown**: Buyers see AI-generated condition scores per photo
- **Value Confidence Meter**: Shows how verified photos support the asking price
- **Comparison Tools**: Compare condition across similar items
- **Ask for More Photos**: Buyers can request additional close-ups if needed
- **Authentication Alerts**: Flags if authentication markers don't match expected patterns

_Full buyer-side features and workflows to be documented separately._

### Benefits of the Quality Verification System

**For Sellers:**
- Higher selling prices (verified items command premium)
- Faster sales (buyers trust verified listings more)
- Reduced disputes (condition is documented objectively)
- Professional presentation (AI-generated assessments)
- Competitive advantage over unverified listings

**For Buyers:**
- Confidence in item condition before purchase
- Objective, AI-powered condition assessment
- Reduced risk of misrepresented items
- Easy comparison between verified listings
- Foundation for returns/disputes if needed

**For GISTer Platform:**
- Premium feature differentiation
- Reduced fraud and disputes
- Higher transaction values (verified items sell for more)
- Trust and quality reputation
- Data foundation for authentication services

---

## Future Enhancements

_To be added in subsequent feature iterations:_

- [ ] Multi-angle photo requirements (e.g., "front, back, and side views")
- [ ] Video support for functionality demonstrations
- [ ] Comparative analysis (photo vs. manufacturer specs)
- [ ] Defect highlighting (AI annotates photos with condition callouts)
- [ ] Authentication scoring (AI confidence in item authenticity)
- [ ] Market value adjustment based on photo-verified condition
- [ ] Buyer-requested photo feature (pre-sale inquiries)
- [ ] Photo quality scoring visible to sellers
- [ ] Bulk photo upload for multi-notification satisfaction
- [ ] Integration with external authentication services
- [ ] Seller reputation tied to verification accuracy
- [ ] Time-based condition tracking (how condition changes over time)
- [ ] Expert verification override (human authentication for ultra-high value items)

---

## Related Documentation

- [Notification System Overview](./INDEX.md)
- [Notification Types & Behaviors](./HANDOFF_SESSION.md)
- [AI Analysis Pipeline](../EXTERNAL_API_SETUP.md)
- [Photo Storage & Compression](../lib/image-compression.ts)

---

**Document Status**: 🟡 In Progress
**Last Updated**: 2025-10-10
**Owner**: GISTer Product Team
