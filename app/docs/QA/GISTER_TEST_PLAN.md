# GISTer Sweep B - Comprehensive Test Plan

**Document Version**: 1.0
**Date Created**: 2025-10-11
**Test Scope**: Sweep B Implementation (Slices 1-4)
**Application**: GISTer Reseller Platform
**Target Branch**: `feature/gister-notifications-revamp`

---

## 1. Executive Summary

### 1.1 Overview

This test plan provides comprehensive testing coverage for the GISTer Sweep B implementation, which introduces intelligent pricing, premium special items detection, verified condition reporting, and purple photo workflow capabilities to the reseller platform.

### 1.2 Scope of Testing

**Slices Covered:**
- **Slice 1**: Pricing Ladder + Quick Facts Panel (✅ Completed)
- **Slice 2**: Purple Photo Workflow (✅ Completed)
- **Slice 3**: Verified Condition Report (✅ Completed)
- **Slice 4**: Premium Special Items + Roadshow Reveal (✅ Completed)

**Testing Objectives:**
1. Verify all pricing ladder calculations and condition-based price suggestions
2. Validate purple photo notification workflow from request to resolution
3. Confirm verified condition scoring and badge display
4. Test premium item detection, facet identification, and price uplift calculations
5. Ensure proper integration between all slices
6. Validate database persistence and API contract compliance
7. Confirm user preference handling and localStorage functionality

### 1.3 Success Criteria

- All critical test cases pass with 100% success rate
- High priority test cases pass with ≥95% success rate
- No critical bugs blocking user workflows
- Performance meets acceptable thresholds (API responses <3s, UI interactions <500ms)
- Data integrity maintained across all operations
- Backwards compatibility preserved for existing features

---

## 2. Test Strategy

### 2.1 Testing Approach

**Test Types:**
- **Functional Testing**: Verify all features work as specified
- **Integration Testing**: Ensure proper interaction between slices
- **Regression Testing**: Confirm existing features remain functional
- **User Acceptance Testing**: Validate user workflows end-to-end
- **Data Validation Testing**: Verify database persistence and integrity
- **Performance Testing**: Confirm acceptable response times
- **Edge Case Testing**: Test boundary conditions and error scenarios

**Testing Phases:**
1. **Unit Testing**: Individual component/function validation
2. **Integration Testing**: Cross-component workflows
3. **System Testing**: Complete feature workflows
4. **Regression Testing**: Existing functionality verification
5. **Acceptance Testing**: User scenario validation

### 2.2 Test Environment

**Development Environment:**
- **Server**: Next.js 14.2.28 dev server on http://localhost:3000
- **Database**: PostgreSQL 15 (Docker container `gister_postgres`)
- **Database Name**: `gister_dev`
- **Database User**: `gister_user`
- **Port**: 5432

**Feature Flags (All Enabled for Testing):**
```javascript
premium.enabled = true
priceLadder.enabled = true
moodAvatars.enabled = true
conditionReport.enabled = true
photoNotifications.enabled = true
```

**Test Data Requirements:**
- Listings with various conditions (New, Like New, Very Good, Good, Fair, Poor, Parts)
- Premium item listings (vintage dolls, collectibles, luxury items)
- Market data with price bands (newMedian, usedQ90, usedQ50, usedQ10, partsMedian)
- Test photos (clear, blurry, well-lit, poorly-lit)
- User accounts with different subscription tiers

### 2.3 Testing Tools

- **Browser**: Chrome/Edge (latest version)
- **Developer Tools**: Chrome DevTools for network/console inspection
- **Database Client**: pgAdmin or psql CLI
- **API Testing**: Browser Network tab, manual API calls
- **Screenshot/Video**: For bug reporting and documentation

---

## 3. Test Cases

### 3.1 Slice 1: Pricing Ladder + Quick Facts

#### TC-S1-001: Pricing Ladder - Condition-Based Price Suggestions
- **Priority**: Critical
- **Feature**: Pricing Ladder
- **Prerequisites**:
  - Listing exists with market data (`ladderStats` populated)
  - User is on listing detail page
- **Test Steps**:
  1. Open listing in edit mode
  2. Select condition "New"
  3. Verify suggested price = `ladderStats.new`
  4. Change condition to "Like New"
  5. Verify suggested price = `ladderStats.likeNew`
  6. Change condition to "Good"
  7. Verify suggested price = `ladderStats.good`
  8. Change condition to "Poor"
  9. Verify suggested price = `ladderStats.poor`
  10. Change condition to "For Parts"
  11. Verify suggested price = `ladderStats.parts`
- **Expected Results**:
  - Price field auto-updates on condition change
  - Suggested price matches corresponding ladder band
  - Price transitions are smooth and immediate
  - No console errors during updates

#### TC-S1-002: Pricing Ladder - Poor ≥ 1.2× Parts Constraint
- **Priority**: Critical
- **Feature**: Pricing Ladder Logic
- **Prerequisites**:
  - Listing with `partsMedian` = $50
- **Test Steps**:
  1. Calculate expected Poor price minimum: $50 × 1.2 = $60
  2. Verify `ladderStats.poor` ≥ $60
  3. Select "Poor" condition
  4. Verify suggested price meets minimum constraint
- **Expected Results**:
  - Poor condition price is always ≥ 1.2× Parts price
  - Constraint enforced in backend calculation
  - UI reflects constrained value

#### TC-S1-003: Pricing Ladder - Upper/Lower Bound Clamping
- **Priority**: High
- **Feature**: Price Band Boundaries
- **Prerequisites**:
  - Listing with ladder bounds defined
- **Test Steps**:
  1. Note `ladderStats.upperBound` (max of newMedian or usedQ90)
  2. Note `ladderStats.lowerBound` (usedQ10)
  3. Attempt to set condition "Like New" price above upper bound
  4. Verify price is clamped to upper bound
  5. Attempt to set condition "Fair" price below lower bound
  6. Verify price is clamped to lower bound
- **Expected Results**:
  - All used condition prices stay within [lowerBound, upperBound]
  - Clamping happens transparently
  - No invalid price suggestions

#### TC-S1-004: Price Deviation Chip - Appears at ≥15% Difference
- **Priority**: Critical
- **Feature**: INSIGHT Price Chips
- **Prerequisites**:
  - Listing with suggested price = $100
- **Test Steps**:
  1. Set user price to $110 (10% deviation)
  2. Verify no "Set $X" chip appears
  3. Set user price to $115 (15% deviation)
  4. Verify "Set $100 (↓)" chip appears in INSIGHT lane
  5. Set user price to $130 (30% deviation)
  6. Verify "Set $100 (↓)" chip still appears
  7. Set user price to $85 (15% below)
  8. Verify "Set $100 (↑)" chip appears
- **Expected Results**:
  - Chip appears when deviation ≥ 15%
  - Arrow direction indicates up/down adjustment
  - Dollar amount matches suggested price
  - Chip disappears when deviation < 15%

#### TC-S1-005: Price Deviation Chip - Tap to Apply
- **Priority**: Critical
- **Feature**: Smart Chip Action
- **Prerequisites**:
  - "Set $100" chip is visible
- **Test Steps**:
  1. Note current price (e.g., $130)
  2. Tap "Set $100" chip
  3. Verify price field updates to $100
  4. Verify chip disappears after application
  5. Verify notification (if any) is resolved
- **Expected Results**:
  - Price applies instantly
  - UI updates reflect new price
  - Chip is removed from lane
  - No console errors

#### TC-S1-006: Quick Facts Panel - Opens and Closes
- **Priority**: High
- **Feature**: Quick Facts UI
- **Prerequisites**:
  - Listing detail page loaded
  - "Quick Facts" chip visible in notification area
- **Test Steps**:
  1. Tap "Quick Facts" chip
  2. Verify panel slides up from bottom
  3. Verify panel shows disclosure options:
     - "Comes with" section
     - "Missing" section
     - "Inoperable" toggle
  4. Tap outside panel or close button
  5. Verify panel closes smoothly
- **Expected Results**:
  - Panel opens with animation
  - All sections are visible and interactive
  - Panel closes on outside tap or explicit close
  - No UI glitches

#### TC-S1-007: Quick Facts - "Comes with" Selections
- **Priority**: High
- **Feature**: Quick Facts - Add Details
- **Prerequisites**:
  - Quick Facts panel is open
  - Item category is "electronics"
- **Test Steps**:
  1. View available "Comes with" chips (e.g., "Original Box", "Manual", "Power Supply")
  2. Tap "Original Box" chip
  3. Verify "Comes with original box" appends to `conditionNotes` field
  4. Close and reopen Quick Facts
  5. Verify "Original Box" selection is remembered (persisted to localStorage)
  6. Tap "Manual" chip
  7. Verify "Includes manual" appends to `conditionNotes`
- **Expected Results**:
  - Selections append to condition notes
  - Each selection adds a new line (no duplicates)
  - localStorage persists selections per user + category
  - Text is properly formatted

#### TC-S1-008: Quick Facts - "Missing" Selections
- **Priority**: High
- **Feature**: Quick Facts - Add Details
- **Prerequisites**:
  - Quick Facts panel is open
- **Test Steps**:
  1. View available "Missing" chips (e.g., "Power Supply", "Remote Control")
  2. Tap "Power Supply" chip
  3. Verify "Missing power supply" appends to `conditionNotes` field
  4. Close and reopen Quick Facts
  5. Verify "Power Supply" selection is remembered
- **Expected Results**:
  - Missing items are noted in condition notes
  - Selections persist across panel open/close
  - Text format matches expected pattern

#### TC-S1-009: Quick Facts - Inoperable → For Parts Flip
- **Priority**: Critical
- **Feature**: Quick Facts - Condition Auto-Update
- **Prerequisites**:
  - Quick Facts panel is open
  - Current condition is "Good"
  - Parts price = $50
- **Test Steps**:
  1. Tap "Inoperable" toggle in Quick Facts
  2. Verify condition field changes to "For Parts / Not Working"
  3. Verify price updates to `ladderStats.parts` ($50)
  4. Verify "Item is inoperable" appends to `conditionNotes`
  5. Close Quick Facts panel
  6. Verify changes persist
- **Expected Results**:
  - Condition flips to "For Parts" immediately
  - Price reprices to Parts price
  - Condition notes updated
  - All changes are atomic (happen together)

#### TC-S1-010: Quick Facts - localStorage Persistence
- **Priority**: Medium
- **Feature**: Quick Facts Memory
- **Prerequisites**:
  - User has made selections in Quick Facts for "Electronics" category
- **Test Steps**:
  1. Open Quick Facts on electronics listing
  2. Select "Original Box" and "Manual"
  3. Close panel
  4. Navigate away from listing
  5. Return to same listing
  6. Open Quick Facts
  7. Verify previous selections are pre-checked
  8. Create new electronics listing
  9. Open Quick Facts
  10. Verify same selections are pre-populated
- **Expected Results**:
  - Selections persist across page navigation
  - Selections apply to same category listings
  - localStorage key format: `quickFacts_{userId}_{category}`
  - No cross-contamination between categories

#### TC-S1-011: Premium Uplift Integration with Pricing Ladder
- **Priority**: Critical
- **Feature**: Price Ladder + Premium Uplifts
- **Prerequisites**:
  - Listing is premium item with `priceUplifts.total = 0.15` (15%)
  - Condition is "Like New"
  - Base ladder price = $100
- **Test Steps**:
  1. Verify suggested price = $100 × 1.15 = $115
  2. Change condition to "Good"
  3. Verify base = $80, suggested = $80 × 1.15 = $92
  4. Change condition to "For Parts"
  5. Verify suggested price = parts price (no uplift applied)
- **Expected Results**:
  - Premium uplifts apply to all used conditions
  - Uplifts do NOT apply to "For Parts" condition
  - Total uplift capped at 20%
  - Calculations are accurate

---

### 3.2 Slice 2: Purple Photo Workflow

#### TC-S2-001: Purple PHOTO Notification - Display
- **Priority**: Critical
- **Feature**: PHOTO Notification Type
- **Prerequisites**:
  - Listing has PHOTO notification in database
  - Notification type = "PHOTO"
  - Section = "photos"
- **Test Steps**:
  1. Open listing detail page
  2. Locate PHOTO notification in Photos section
  3. Verify notification has purple styling/badge
  4. Verify camera icon is displayed
  5. Verify message text (e.g., "Add close-up of serial number tag")
  6. Verify helper text: "Select to add closeup" or similar
- **Expected Results**:
  - PHOTO notification visually distinct from other types
  - Purple color scheme applied
  - Camera icon present
  - Helper text indicates photo action

#### TC-S2-002: Purple Notification - Open Camera/Upload Dialog
- **Priority**: Critical
- **Feature**: Photo Capture Trigger
- **Prerequisites**:
  - PHOTO notification visible
- **Test Steps**:
  1. Tap purple PHOTO notification
  2. Verify dialog appears with options:
     - "Camera" button (with camera icon)
     - "Upload" button (with upload icon)
  3. Verify requirement text is displayed in dialog
  4. Tap outside dialog
  5. Verify dialog closes
- **Expected Results**:
  - Dialog opens immediately on notification tap
  - Both options are visible and tappable
  - Requirement context is shown
  - Dialog dismissible

#### TC-S2-003: Photo Upload - Happy Path
- **Priority**: Critical
- **Feature**: Photo Upload + Verification
- **Prerequisites**:
  - Camera/Upload dialog is open
  - Have clear, well-lit test photo ready
- **Test Steps**:
  1. Tap "Upload" button
  2. Select clear photo from device
  3. Verify upload progress indicator appears
  4. Wait for upload and AI analysis
  5. Verify success message: "Photo verified"
  6. Verify photo appears in gallery with "Verified" badge
  7. Verify condition analysis text appends to `conditionNotes` field
  8. Verify purple PHOTO notification is marked resolved
  9. Verify notification disappears from Photos section
- **Expected Results**:
  - Upload completes without errors
  - Photo passes quality verification
  - Analysis generates condition text
  - Text appends to existing notes (no overwrite)
  - Notification resolved and removed
  - Photo linked to listing in database

#### TC-S2-004: Photo Upload - Rejection (Blurry)
- **Priority**: Critical
- **Feature**: Photo Quality Check
- **Prerequisites**:
  - Camera/Upload dialog is open
  - Have blurry test photo ready
- **Test Steps**:
  1. Upload blurry photo
  2. Wait for AI quality check
  3. Verify rejection alert appears
  4. Verify specific reason provided: "Photo is too blurry..."
  5. Verify "Try Again" button is present
  6. Verify photo is NOT saved to gallery
  7. Verify notification is NOT resolved
  8. Tap "Try Again"
  9. Upload clear photo
  10. Verify success path completes
- **Expected Results**:
  - Blurry photo rejected immediately
  - Specific actionable feedback provided
  - User can retry without penalty
  - Clear photo accepted on retry
  - No invalid photos saved to database

#### TC-S2-005: Photo Upload - Rejection (Poor Lighting)
- **Priority**: High
- **Feature**: Photo Quality Check
- **Prerequisites**:
  - Camera/Upload dialog is open
  - Have dark/poorly-lit test photo ready
- **Test Steps**:
  1. Upload dark photo
  2. Wait for AI quality check
  3. Verify rejection alert: "Lighting is too dark..."
  4. Verify actionable guidance: "Please take photo in better lighting"
  5. Tap "Try Again"
  6. Upload well-lit photo
  7. Verify acceptance
- **Expected Results**:
  - Poor lighting detected and rejected
  - Clear guidance for improvement
  - Retry flow works correctly

#### TC-S2-006: Photo Upload - Rejection (Wrong Subject)
- **Priority**: High
- **Feature**: Photo Accuracy Check
- **Prerequisites**:
  - PHOTO notification requests "close-up of serial number tag"
  - Have photo of different subject ready
- **Test Steps**:
  1. Upload photo that doesn't show serial number
  2. Wait for AI accuracy check
  3. Verify rejection: "Serial number not visible in photo"
  4. Verify guidance: "Please ensure tag is in focus"
  5. Retry with correct photo
- **Expected Results**:
  - AI detects subject mismatch
  - Clear feedback on what's missing
  - Retry succeeds with correct subject

#### TC-S2-007: Photo Verification - Condition Text Append
- **Priority**: Critical
- **Feature**: AI Condition Analysis
- **Prerequisites**:
  - Clear photo uploaded and verified
- **Test Steps**:
  1. Note existing `conditionNotes` content before upload
  2. Upload photo for "close-up of face paint"
  3. Wait for analysis
  4. Verify new text appended to `conditionNotes`:
     - Example: "Face paint is well-preserved with no chips or fading. Eyes retain original luster."
  5. Verify existing text is preserved (not overwritten)
  6. Verify new text is on separate line(s)
- **Expected Results**:
  - AI generates condition-specific analysis
  - Text appends without overwriting
  - Text is professional and descriptive
  - Text relates to photo subject

#### TC-S2-008: Photo Verification - Gallery Badge
- **Priority**: High
- **Feature**: Verified Photo Badge
- **Prerequisites**:
  - Photo uploaded and verified
- **Test Steps**:
  1. Navigate to photo gallery section
  2. Locate recently uploaded photo
  3. Verify "Verified" badge displayed on photo thumbnail
  4. Verify badge has checkmark or similar icon
  5. Tap photo to view full size
  6. Verify badge persists in full view
- **Expected Results**:
  - Badge clearly indicates verification status
  - Badge distinguishes verified from unverified photos
  - Visual consistency with design system

#### TC-S2-009: Multiple PHOTO Notifications - Sequential
- **Priority**: High
- **Feature**: Multi-Photo Workflow
- **Prerequisites**:
  - Listing has 3+ PHOTO notifications
- **Test Steps**:
  1. Complete first PHOTO notification (upload photo)
  2. Verify first notification resolves
  3. Verify second PHOTO notification still visible
  4. Complete second notification
  5. Verify second resolves
  6. Continue until all PHOTO notifications resolved
  7. Verify all photos in gallery
  8. Verify all condition texts appended sequentially
- **Expected Results**:
  - Each notification resolves independently
  - Remaining notifications stay visible
  - Photos don't interfere with each other
  - Condition notes accumulate properly

#### TC-S2-010: Photo Database Persistence
- **Priority**: Critical
- **Feature**: Photo Storage
- **Prerequisites**:
  - Photo uploaded and verified
- **Test Steps**:
  1. Query database for Photo record:
     ```sql
     SELECT * FROM "Photo" WHERE listingId = '{listingId}' AND facetTag = 'serial_number';
     ```
  2. Verify record exists
  3. Verify fields populated:
     - `id`: UUID present
     - `listingId`: Correct listing
     - `url`: S3 URL or CDN path
     - `facetTag`: Matches notification requirement
     - `status`: "accepted"
     - `analysisData`: JSON with condition data
     - `verificationReason`: Present
     - `notificationId`: Links to PHOTO notification
  4. Refresh page
  5. Verify photo still appears in gallery
- **Expected Results**:
  - Photo record created correctly
  - All required fields populated
  - Photo persists across sessions
  - No data loss

---

### 3.3 Slice 3: Verified Condition Report

#### TC-S3-001: Verified Condition Score - 4-Dimension Display
- **Priority**: Critical
- **Feature**: Verified Condition Report Card
- **Prerequisites**:
  - Listing has `verifiedConditionScore` populated:
    ```json
    {
      "surface": 0.85,
      "function": 0.90,
      "clean": 0.88,
      "complete": 0.80,
      "avg": 0.8575
    }
    ```
  - User is on listing detail page
- **Test Steps**:
  1. Scroll to Verified Condition Report section
  2. Verify "GISTer Verified Condition" badge is displayed
  3. Verify 4 dimension progress bars/scores:
     - **Surface**: 85% (8.5/10)
     - **Function**: 90% (9.0/10)
     - **Cleanliness**: 88% (8.8/10)
     - **Completeness**: 80% (8.0/10)
  4. Verify overall average displayed: 85.75% or "Like New"
  5. Verify visual styling matches design
- **Expected Results**:
  - All 4 dimensions visible
  - Scores display correctly as percentages
  - Average calculated accurately
  - Badge prominent and clear

#### TC-S3-002: Verified Condition - Badge Display
- **Priority**: High
- **Feature**: Verified Badge
- **Prerequisites**:
  - Listing has verified condition
- **Test Steps**:
  1. Locate "GISTer Verified Condition" badge
  2. Verify badge shows verified condition level (e.g., "Like New")
  3. Verify badge has checkmark or verification icon
  4. Verify badge styling is distinct and professional
- **Expected Results**:
  - Badge clearly communicates verification
  - Condition level shown prominently
  - Design instills buyer confidence

#### TC-S3-003: Verified Condition - Tightened Price Band (±7%)
- **Priority**: Critical
- **Feature**: Price Band Adjustment
- **Prerequisites**:
  - Listing has verified condition
  - Suggested price = $100
  - Listing WITHOUT verification has ±15% band = [$85, $115]
- **Test Steps**:
  1. Note suggested price: $100
  2. Verify price band display shows ±7% = [$93, $107]
  3. Set user price to $108
  4. Verify "Set $100" chip appears (deviation >7%)
  5. Set user price to $106
  6. Verify NO chip appears (within ±7% band)
- **Expected Results**:
  - Verified listings have tighter ±7% band
  - Unverified listings use ±15% band
  - Chip threshold respects verification status
  - Band calculation accurate

#### TC-S3-004: Verified Condition - Price Chip with Verified Badge
- **Priority**: High
- **Feature**: INSIGHT Chip Enhancement
- **Prerequisites**:
  - Verified condition = "Like New"
  - Suggested price deviates ≥7%
- **Test Steps**:
  1. Verify price deviation chip appears
  2. Check chip text includes "Verified" indicator:
     - Example: "Verified Like New – Set $100?"
  3. Verify chip styling different from unverified chips
  4. Tap chip to apply price
  5. Verify price updates and chip resolves
- **Expected Results**:
  - Verified chips have special styling
  - "Verified" keyword present in message
  - Chip behavior same as unverified
  - User can distinguish verified suggestions

#### TC-S3-005: Verified Condition - User Preference "All"
- **Priority**: High
- **Feature**: Condition Report Preferences
- **Prerequisites**:
  - User preference `conditionReportMode` = "all"
  - User is on Free tier
- **Test Steps**:
  1. Open listing detail page
  2. Verify Verified Condition Report card is visible
  3. Verify all 4 dimensions displayed
  4. Verify no upgrade prompts block the report
- **Expected Results**:
  - Report shows for all users when preference = "all"
  - No tier gating applied
  - Full functionality available

#### TC-S3-006: Verified Condition - User Preference "Premium"
- **Priority**: High
- **Feature**: Condition Report Preferences
- **Prerequisites**:
  - User preference `conditionReportMode` = "premium"
  - User is on Free tier
- **Test Steps**:
  1. Open listing detail page
  2. Verify Verified Condition Report card is hidden OR shows upgrade prompt
  3. Verify message: "Upgrade to Premium to see Verified Condition Report"
  4. Change user to Premium tier
  5. Refresh page
  6. Verify report is now visible
- **Expected Results**:
  - Free users don't see report when preference = "premium"
  - Premium users see report regardless of preference
  - Upgrade prompt clear and actionable

#### TC-S3-007: Verified Condition - User Preference "Off"
- **Priority**: Medium
- **Feature**: Condition Report Preferences
- **Prerequisites**:
  - User preference `conditionReportMode` = "off"
- **Test Steps**:
  1. Open listing detail page
  2. Verify Verified Condition Report card is NOT displayed
  3. Verify no remnants of report visible
  4. Change preference to "all"
  5. Refresh page
  6. Verify report now appears
- **Expected Results**:
  - Preference "off" completely hides report
  - User can toggle preference easily
  - Report respects user choice

#### TC-S3-008: Verified Condition - Auto-Computed Average
- **Priority**: High
- **Feature**: Score Calculation
- **Prerequisites**:
  - Multiple photos uploaded with condition scores
- **Test Steps**:
  1. Upload Photo 1 → Surface score: 0.85
  2. Upload Photo 2 → Function score: 0.90
  3. Upload Photo 3 → Cleanliness score: 0.88
  4. Upload Photo 4 → Completeness score: 0.80
  5. Verify average = (0.85 + 0.90 + 0.88 + 0.80) / 4 = 0.8575
  6. Verify `verifiedConditionScore.avg` = 0.8575
  7. Verify overall condition derived from avg: 0.8575 → "Like New"
- **Expected Results**:
  - Average calculated correctly
  - Condition level mapping accurate:
    - ≥0.95: "New"
    - ≥0.85: "Like New"
    - ≥0.70: "Very Good"
    - ≥0.55: "Good"
    - ≥0.40: "Fair"
    - ≥0.25: "Poor"
    - <0.25: "For Parts"
  - Database persists correct values

#### TC-S3-009: Verified Condition - Database Schema
- **Priority**: Critical
- **Feature**: Data Persistence
- **Prerequisites**:
  - Verified condition generated for listing
- **Test Steps**:
  1. Query database:
     ```sql
     SELECT verifiedCondition, verifiedConditionScore
     FROM "Listing"
     WHERE id = '{listingId}';
     ```
  2. Verify `verifiedCondition` = "Like New" (string)
  3. Verify `verifiedConditionScore` = JSON object:
     ```json
     {
       "surface": 0.85,
       "function": 0.90,
       "clean": 0.88,
       "complete": 0.80,
       "avg": 0.8575
     }
     ```
  4. Update listing
  5. Verify fields persist correctly
- **Expected Results**:
  - Fields exist in schema
  - Data types correct (VARCHAR(50) and JSON)
  - Values persist across updates
  - No data corruption

---

### 3.4 Slice 4: Premium Special Items + Roadshow Reveal

#### TC-S4-001: Premium Item Detection - Badge Display
- **Priority**: Critical
- **Feature**: Premium Item Recognition
- **Prerequisites**:
  - Listing has `isPremiumItem` = true
  - Listing has `specialClass` = "vintage"
- **Test Steps**:
  1. Open listing detail page
  2. Verify premium item badge displayed prominently
  3. Verify badge shows Gem icon (💎) or similar
  4. Verify badge text: "Special item detected" or "Premium Item"
  5. Verify badge placement near title or condition section
- **Expected Results**:
  - Badge clearly indicates premium status
  - Icon visually distinctive
  - Text concise and informative
  - Placement doesn't obstruct workflow

#### TC-S4-002: Premium Item - Special Class Labels
- **Priority**: High
- **Feature**: Special Classification
- **Prerequisites**:
  - Premium item detected
- **Test Steps**:
  1. For listing with `specialClass` = "vintage":
     - Verify "Vintage" label displayed
  2. For listing with `specialClass` = "collectible":
     - Verify "Collectible" label displayed
  3. Test all special classes:
     - Vintage, Collectible, Antique, Luxury, Custom, Art
  4. Verify each has appropriate styling/icon
- **Expected Results**:
  - All 6 special classes supported
  - Labels match database values
  - Styling consistent with design system
  - Icons/colors differentiate classes

#### TC-S4-003: Facet Identification - Display Top 4
- **Priority**: Critical
- **Feature**: Facet Breakdown
- **Prerequisites**:
  - Listing has `facets` array populated:
    ```json
    [
      {"name": "Original packaging", "category": "Provenance", "status": "present", "confidence": 0.95},
      {"name": "Serial number verified", "category": "Authentication", "status": "present", "confidence": 0.92},
      {"name": "First year production", "category": "Rarity", "status": "present", "confidence": 0.88},
      {"name": "All accessories included", "category": "Completeness", "status": "present", "confidence": 0.85},
      {"name": "Face paint pristine", "category": "Condition", "status": "present", "confidence": 0.80}
    ]
    ```
- **Test Steps**:
  1. Locate Roadshow Reveal card on listing page
  2. Verify "Top Value Contributors" section shows top 4 facets:
     - Original packaging (95%)
     - Serial number verified (92%)
     - First year production (88%)
     - All accessories included (85%)
  3. Verify 5th facet (Face paint pristine) not displayed
  4. Verify confidence scores displayed as percentages
  5. Verify facet icons/badges match categories
- **Expected Results**:
  - Only top 4 facets by confidence shown
  - Facets sorted by confidence descending
  - All facet details accurate
  - Categories labeled correctly

#### TC-S4-004: Roadshow Reveal - Baseline vs Verified Value
- **Priority**: Critical
- **Feature**: Value Comparison Display
- **Prerequisites**:
  - Premium item with facets
  - Base price (unverified) = $100
  - Verified price (with uplifts) = $118
- **Test Steps**:
  1. Locate Roadshow Reveal card
  2. Verify "Baseline Value" section shows: $100
  3. Verify "Verified Value" section shows: $118
  4. Verify value increase indicator: "+$18 (18%)"
  5. Verify visual differentiation (e.g., color, size)
  6. Verify brief explanation text present
- **Expected Results**:
  - Both values displayed clearly
  - Increase amount and percentage accurate
  - Visual hierarchy: verified value emphasized
  - User understands value uplift

#### TC-S4-005: Price Uplift Calculation - Special Item +5-12%
- **Priority**: Critical
- **Feature**: Special Item Uplift
- **Prerequisites**:
  - Listing is premium special item
  - Base price = $100
  - `priceUplifts.special` = 0.08 (8%)
- **Test Steps**:
  1. Verify suggested price includes special uplift: $100 × 1.08 = $108
  2. Change base price to $200
  3. Verify suggested price: $200 × 1.08 = $216
  4. Test with different special uplift values (5%, 10%, 12%)
  5. Verify calculations accurate for all
- **Expected Results**:
  - Special uplift between 5-12%
  - Applies to all used conditions
  - Does NOT apply to "For Parts"
  - Calculation accurate

#### TC-S4-006: Price Uplift Calculation - Facet Uplifts +3-15%
- **Priority**: Critical
- **Feature**: Per-Facet Uplifts
- **Prerequisites**:
  - Base price = $100
  - Facets with uplifts:
    ```json
    {
      "total": 0.18,
      "special": 0.05,
      "facets": {
        "Authentication": 0.05,
        "Rarity": 0.04,
        "Provenance": 0.04
      }
    }
    ```
- **Test Steps**:
  1. Verify special uplift: 5%
  2. Verify facet uplifts sum: 5% + 4% + 4% = 13%
  3. Verify total uplift: 5% + 13% = 18%
  4. Verify suggested price: $100 × 1.18 = $118
  5. Check individual facet contributions in Roadshow Reveal
- **Expected Results**:
  - Each facet category contributes independently
  - Facet uplifts range 3-15% each
  - Total includes special + all facets
  - Breakdown matches calculation

#### TC-S4-007: Price Uplift Calculation - 20% Cap Enforcement
- **Priority**: Critical
- **Feature**: Maximum Uplift Cap
- **Prerequisites**:
  - Base price = $100
  - Calculated uplift would exceed 20%:
    ```json
    {
      "special": 0.12,
      "facets": {
        "Authentication": 0.08,
        "Rarity": 0.07,
        "Provenance": 0.06,
        "Completeness": 0.05
      }
    }
    ```
  - Total: 12% + 8% + 7% + 6% + 5% = 38%
- **Test Steps**:
  1. Note raw calculation would be 38% uplift
  2. Verify `priceUplifts.total` is capped at 0.20 (20%)
  3. Verify suggested price: $100 × 1.20 = $120 (not $138)
  4. Verify Roadshow Reveal shows: "Capped at 20% maximum uplift"
  5. Test with various over-cap scenarios
- **Expected Results**:
  - Total uplift never exceeds 20%
  - Cap enforced in backend calculation
  - UI indicates when cap applied
  - Pricing remains fair and reasonable

#### TC-S4-008: Price Uplift - Parts Condition Removes All Uplifts
- **Priority**: Critical
- **Feature**: Parts Condition Override
- **Prerequisites**:
  - Premium item with 18% uplift normally
  - Base "Good" price = $100, with uplift = $118
  - Parts price = $40
- **Test Steps**:
  1. Note current condition: "Good", suggested price: $118
  2. Change condition to "For Parts / Not Working"
  3. Verify suggested price changes to $40 (parts price, no uplift)
  4. Verify Roadshow Reveal card shows: "Parts condition - premium uplifts not applied"
  5. Change back to "Good"
  6. Verify uplifts reapply: price back to $118
- **Expected Results**:
  - Parts condition ignores all premium uplifts
  - User sees base parts pricing only
  - Uplifts restore when changing away from Parts
  - Logic enforced consistently

#### TC-S4-009: Roadshow Reveal - Upgrade CTA for Free Users
- **Priority**: High
- **Feature**: Premium Upgrade Prompt
- **Prerequisites**:
  - User is on Free tier
  - Listing has premium features
- **Test Steps**:
  1. View Roadshow Reveal card
  2. Verify upgrade CTA displayed:
     - "Unlock Premium Features"
     - "See full facet analysis and value breakdown"
  3. Verify CTA button prominent and clickable
  4. Tap CTA
  5. Verify navigates to upgrade/pricing page
  6. Complete upgrade to Premium
  7. Return to listing
  8. Verify CTA is removed, full features visible
- **Expected Results**:
  - Free users see compelling upgrade CTA
  - CTA doesn't block basic functionality
  - Navigation to upgrade flow works
  - Premium users don't see CTA

#### TC-S4-010: Facet Status - Present, Likely, Absent
- **Priority**: Medium
- **Feature**: Facet Status Indicators
- **Prerequisites**:
  - Listing with mixed facet statuses:
    ```json
    [
      {"name": "Original box", "status": "present", "confidence": 0.95},
      {"name": "Serial number", "status": "likely", "confidence": 0.70},
      {"name": "Certificate", "status": "absent", "confidence": 0.90}
    ]
    ```
- **Test Steps**:
  1. View facet breakdown
  2. Verify "Original box" has green checkmark (present)
  3. Verify "Serial number" has yellow question mark (likely)
  4. Verify "Certificate" has red X or "-" (absent)
  5. Verify confidence scores shown for all
- **Expected Results**:
  - Three status types visually distinct
  - Icons match status meaning
  - Confidence scores help interpret status
  - User understands certainty levels

#### TC-S4-011: Premium Item - Database Schema Verification
- **Priority**: Critical
- **Feature**: Data Persistence
- **Prerequisites**:
  - Premium item listing saved
- **Test Steps**:
  1. Query database:
     ```sql
     SELECT isPremiumItem, specialClass, facets, priceUplifts
     FROM "Listing"
     WHERE id = '{listingId}';
     ```
  2. Verify `isPremiumItem` = true (boolean)
  3. Verify `specialClass` = "vintage" (VARCHAR(50))
  4. Verify `facets` = JSON array with facet objects
  5. Verify `priceUplifts` = JSON object:
     ```json
     {
       "total": 0.18,
       "special": 0.05,
       "facets": {
         "Authentication": 0.05,
         "Rarity": 0.04,
         "Provenance": 0.04
       }
     }
     ```
  6. Update listing and re-query
  7. Verify all fields persist correctly
- **Expected Results**:
  - All schema fields exist and are correct types
  - Data persists without corruption
  - JSON fields parse correctly
  - Migrations applied successfully

---

### 3.5 Integration Tests (Cross-Slice)

#### TC-INT-001: Full Workflow - New Premium Listing Creation
- **Priority**: Critical
- **Feature**: End-to-End Workflow
- **Test Steps**:
  1. Create new listing
  2. Upload initial photos → AI detects premium item (Slice 4)
  3. See premium badge appear
  4. Receive 3 PHOTO notifications (Slice 2)
  5. Upload photos to satisfy notifications
  6. See verified condition scores populate (Slice 3)
  7. Change condition → price updates with ladder + uplifts (Slice 1 + 4)
  8. Open Quick Facts → add details (Slice 1)
  9. See Roadshow Reveal with verified vs baseline value (Slice 4)
  10. Save listing
  11. Verify all data persists
- **Expected Results**:
  - All slices work together seamlessly
  - Data flows between features correctly
  - UI updates in real-time
  - No errors or data loss

#### TC-INT-002: Verified Condition + Price Deviation
- **Priority**: High
- **Feature**: Slice 3 + Slice 1 Integration
- **Test Steps**:
  1. Complete verified condition photos (Slice 3)
  2. See verified condition score: 8.5/10 → "Like New"
  3. Note suggested price: $100 (with verified ±7% band)
  4. Set user price to $108.50 (8.5% deviation)
  5. Verify "Verified Like New - Set $100" chip appears
  6. Set user price to $106 (6% deviation)
  7. Verify NO chip appears (within ±7%)
  8. Remove verified condition data
  9. Set price to $110 (10% deviation)
  10. Verify chip still doesn't appear (unverified uses ±15%)
- **Expected Results**:
  - Verified status tightens price band to ±7%
  - Unverified uses ±15% band
  - Chip threshold respects verification
  - Transitions smooth

#### TC-INT-003: Premium Uplift + Verified Condition + Price Ladder
- **Priority**: Critical
- **Feature**: Slice 1 + 3 + 4 Integration
- **Prerequisites**:
  - Premium item with 15% uplift
  - Verified condition enabled
  - Price ladder data available
- **Test Steps**:
  1. Base "Good" ladder price: $100
  2. Premium uplift: 15%
  3. Calculate: $100 × 1.15 = $115
  4. Verify suggested price shows $115
  5. Verify price band: $115 ± 7% = [$107, $123] (verified)
  6. Set price to $125
  7. Verify chip appears: "Verified Good - Set $115"
  8. Change to "For Parts"
  9. Verify price drops to $40 (no uplift)
  10. Verify band is ±15% (no verification for parts)
- **Expected Results**:
  - All three systems integrate correctly
  - Price calculations include all factors
  - Condition changes update everything
  - Logic is consistent

#### TC-INT-004: Quick Facts Inoperable + Premium Item
- **Priority**: High
- **Feature**: Slice 1 + Slice 4 Integration
- **Test Steps**:
  1. Premium item with 18% uplift
  2. Current condition: "Good", price: $118
  3. Open Quick Facts
  4. Tap "Inoperable"
  5. Verify condition flips to "For Parts"
  6. Verify price updates to parts price (no uplift)
  7. Verify Roadshow Reveal shows: "Parts condition - no uplifts"
  8. Verify Quick Facts shows "Inoperable" appended to notes
- **Expected Results**:
  - Inoperable removes premium uplifts
  - Condition and price update atomically
  - UI reflects all changes immediately
  - Roadshow Reveal adapts to parts condition

#### TC-INT-005: Multiple Photos → Verified Condition → Facets
- **Priority**: Critical
- **Feature**: Slice 2 + 3 + 4 Integration
- **Test Steps**:
  1. Premium item listing created
  2. Receive 4 PHOTO notifications:
     - "Add close-up of serial number" → Authentication facet
     - "Add close-up of face paint" → Condition facet
     - "Add photo of original box" → Provenance facet
     - "Add photo of all accessories" → Completeness facet
  3. Upload photo 1 → AI detects serial number → Authentication score: 0.90
  4. Upload photo 2 → AI analyzes paint → Condition score: 0.85
  5. Upload photo 3 → AI sees original box → Provenance score: 0.88
  6. Upload photo 4 → AI counts accessories → Completeness score: 0.82
  7. Verify verified condition average: 0.8625 → "Like New"
  8. Verify facets array populated with 4 facets
  9. Verify price uplifts calculated from facets
  10. Verify Roadshow Reveal shows all facets
- **Expected Results**:
  - Photos drive both verified condition AND facets
  - Each photo contributes to multiple systems
  - Data flows correctly through all slices
  - No duplication or conflicts

---

### 3.6 Regression Tests (Existing Features)

#### TC-REG-001: Basic Listing Creation (Pre-Sweep B)
- **Priority**: Critical
- **Feature**: Core Functionality
- **Test Steps**:
  1. Create new listing without premium features
  2. Fill in title, description, condition, price manually
  3. Upload basic photos (no PHOTO notifications)
  4. Select platforms
  5. Save listing
  6. Verify listing saves correctly
  7. Verify no Sweep B features interfere
- **Expected Results**:
  - Basic listing flow unchanged
  - No mandatory Sweep B features
  - Existing users not disrupted

#### TC-REG-002: Notification System - ALERT and QUESTION Types
- **Priority**: High
- **Feature**: Original Notifications
- **Test Steps**:
  1. Listing with ALERT notifications (red, required fields)
  2. Verify ALERT notifications still display correctly
  3. Tap ALERT → verify jumps to field
  4. Listing with QUESTION notifications (blue, actionable)
  5. Verify QUESTION notifications display
  6. Answer question with chips
  7. Verify notification resolves
- **Expected Results**:
  - ALERT and QUESTION types unaffected by PHOTO
  - Original behavior preserved
  - No visual regressions

#### TC-REG-003: Photo Upload - Non-PHOTO Workflow
- **Priority**: High
- **Feature**: Standard Photo Upload
- **Test Steps**:
  1. Create listing without PHOTO notifications
  2. Go to photo section
  3. Tap "+ Add Photo" button
  4. Upload photo from device
  5. Verify photo appears in gallery
  6. Verify no quality verification triggers
  7. Verify no condition analysis appends
  8. Verify photo saves normally
- **Expected Results**:
  - Standard photo upload still works
  - Optional verification doesn't interfere
  - Basic photo workflow unchanged

#### TC-REG-004: Platform-Specific Fields (Pre-Sweep B)
- **Priority**: Medium
- **Feature**: Platform Tabs
- **Test Steps**:
  1. Enable premium on listing
  2. Select platforms (eBay, Mercari, Poshmark)
  3. Open "Fine Details" tabs
  4. Verify platform-specific fields from previous session:
     - eBay: UPC, MPN, Handling Time
     - Mercari: Shipping Weight, Department
     - Poshmark: Department, NWT, Original Price
  5. Fill in fields
  6. Save and verify persistence
- **Expected Results**:
  - Platform fields from Handoff session still work
  - No conflicts with Sweep B additions
  - Data persists correctly

#### TC-REG-005: Cost Tracking (Existing Feature)
- **Priority**: Medium
- **Feature**: API Cost Dashboard
- **Test Steps**:
  1. Create listing with AI analysis
  2. Navigate to Cost Dashboard
  3. Verify listing costs tracked:
     - Token usage
     - API costs
     - Storage costs
  4. Verify Sweep B features contribute to costs
  5. Verify cost calculations accurate
- **Expected Results**:
  - Cost tracking still functional
  - Sweep B API calls accounted for
  - Dashboard shows accurate totals

---

### 3.7 Edge Cases and Error Scenarios

#### TC-EDGE-001: No Market Data - Pricing Ladder Unavailable
- **Priority**: High
- **Feature**: Pricing Ladder Fallback
- **Test Steps**:
  1. Listing with no `ladderStats` (null)
  2. Attempt to change condition
  3. Verify no auto-pricing occurs
  4. Verify no "Set $X" chips appear
  5. Verify user can still set price manually
  6. Verify no errors in console
- **Expected Results**:
  - Graceful degradation when data missing
  - Manual pricing still works
  - No crashes or errors

#### TC-EDGE-002: Partial Ladder Data
- **Priority**: High
- **Feature**: Pricing Ladder Resilience
- **Test Steps**:
  1. Listing with incomplete ladder:
     ```json
     {
       "new": 150,
       "likeNew": null,
       "good": 80,
       "poor": null,
       "parts": 30
     }
     ```
  2. Select "Like New" condition
  3. Verify no price suggestion (null)
  4. Select "Good" condition
  5. Verify price suggests $80
  6. Select "Poor" condition
  7. Verify fallback logic (e.g., calculate from available data)
- **Expected Results**:
  - Handles missing bands gracefully
  - Uses available data when possible
  - No errors for null bands

#### TC-EDGE-003: Photo Upload - Network Failure
- **Priority**: Medium
- **Feature**: Upload Error Handling
- **Test Steps**:
  1. Open PHOTO notification dialog
  2. Select photo to upload
  3. Simulate network failure (disable network mid-upload)
  4. Verify error message: "Upload failed - please try again"
  5. Verify retry option available
  6. Re-enable network
  7. Retry upload
  8. Verify success
- **Expected Results**:
  - Network errors caught and handled
  - Clear error message shown
  - User can retry without data loss
  - No partial uploads saved

#### TC-EDGE-004: Verified Condition - Incomplete Photo Set
- **Priority**: Medium
- **Feature**: Partial Verification
- **Test Steps**:
  1. Listing requires 4 PHOTO notifications
  2. User completes only 2 photos
  3. Verify partial verified condition score generated:
     - Surface: 0.85 (from photo 1)
     - Function: 0.90 (from photo 2)
     - Cleanliness: null
     - Completeness: null
     - Average: 0.875 (average of available)
  4. Verify badge shows: "Partially Verified"
  5. Verify price band is ±15% (not tightened)
- **Expected Results**:
  - Partial verification supported
  - Average calculated from available scores
  - Badge indicates partial status
  - Price band not tightened until fully verified

#### TC-EDGE-005: Premium Uplift - No Facets Detected
- **Priority**: Medium
- **Feature**: Premium Item Without Facets
- **Test Steps**:
  1. Item flagged as `isPremiumItem` = true
  2. AI unable to identify specific facets
  3. Verify `facets` array = [] (empty)
  4. Verify special item uplift still applies (5-12%)
  5. Verify Roadshow Reveal shows:
     - "Special item detected"
     - "No specific facets identified yet"
     - Baseline vs verified value (with special uplift only)
- **Expected Results**:
  - Premium items work without facets
  - Special uplift applies independently
  - UI communicates facet absence clearly
  - User can manually add facets

#### TC-EDGE-006: Quick Facts - Empty conditionNotes
- **Priority**: Low
- **Feature**: Quick Facts Append to Empty Field
- **Test Steps**:
  1. Listing with `conditionNotes` = null or ""
  2. Open Quick Facts
  3. Select "Original Box"
  4. Verify text appends cleanly: "Comes with original box"
  5. Verify no extra newlines or formatting issues
- **Expected Results**:
  - First append creates text correctly
  - No leading/trailing whitespace
  - Format matches subsequent appends

#### TC-EDGE-007: Price Deviation - Exactly 15%
- **Priority**: Low
- **Feature**: Boundary Condition
- **Test Steps**:
  1. Suggested price: $100
  2. Set user price to exactly $115 (15.0% deviation)
  3. Verify chip DOES appear (threshold is ≥15%)
  4. Set user price to $114.99 (14.99% deviation)
  5. Verify chip does NOT appear
- **Expected Results**:
  - Threshold is inclusive: ≥15%
  - Boundary case handled correctly
  - Chip appearance consistent

#### TC-EDGE-008: Verified Condition - All Scores Perfect (1.0)
- **Priority**: Low
- **Feature**: Maximum Scores
- **Test Steps**:
  1. Upload photos resulting in all 1.0 scores:
     ```json
     {
       "surface": 1.0,
       "function": 1.0,
       "clean": 1.0,
       "complete": 1.0,
       "avg": 1.0
     }
     ```
  2. Verify `verifiedCondition` = "New"
  3. Verify badge shows "New" condition
  4. Verify price band: ±7% from "New" price
  5. Verify no UI overflow or display issues
- **Expected Results**:
  - Perfect scores handled correctly
  - Condition maps to "New"
  - Price logic consistent
  - UI displays properly

#### TC-EDGE-009: Premium Uplift - Exactly 20% Cap
- **Priority**: Medium
- **Feature**: Uplift Cap Boundary
- **Test Steps**:
  1. Facets and special calculate to exactly 20.0%
  2. Verify `priceUplifts.total` = 0.20
  3. Verify no "capped" message shown
  4. Facets calculate to 20.01%
  5. Verify capped to 0.20
  6. Verify "capped" message shown in Roadshow Reveal
- **Expected Results**:
  - Exactly 20% is allowed (not capped)
  - >20% is capped
  - UI message appears only when capped

#### TC-EDGE-010: Multiple Conditions - Rapid Change
- **Priority**: Medium
- **Feature**: UI Responsiveness
- **Test Steps**:
  1. Rapidly change condition: New → Good → Poor → Parts → Like New
  2. Verify price updates keep pace
  3. Verify no stale price suggestions
  4. Verify no race conditions or UI glitches
  5. Verify final state is correct
- **Expected Results**:
  - UI handles rapid changes smoothly
  - No lag or incorrect intermediate states
  - Final state consistent with last selection

---

## 4. Quality Metrics

### 4.1 Test Coverage Goals

**Code Coverage Targets:**
- Critical paths: 100% coverage
- High-priority features: ≥95% coverage
- Medium-priority features: ≥90% coverage
- Edge cases: ≥80% coverage

**Feature Coverage:**
- Slice 1 (Pricing Ladder): 11 test cases (100% coverage)
- Slice 2 (Photo Workflow): 10 test cases (100% coverage)
- Slice 3 (Verified Condition): 9 test cases (100% coverage)
- Slice 4 (Premium Items): 11 test cases (100% coverage)
- Integration Tests: 5 test cases
- Regression Tests: 5 test cases
- Edge Cases: 10 test cases

**Total Test Cases: 61**

### 4.2 Acceptance Criteria

**Critical Test Pass Rate: 100%**
- All critical tests must pass before production deployment
- Zero tolerance for critical bugs

**High Priority Test Pass Rate: ≥95%**
- Maximum 1 high-priority test can fail
- Failures must have documented workarounds

**Overall Test Pass Rate: ≥90%**
- Medium/low priority tests may have known issues
- All failures must be logged and triaged

### 4.3 Performance Benchmarks

**API Response Times:**
- `/api/listings/[id]/analyze`: <3 seconds (AI analysis)
- `/api/listings/[id]`: <500ms (fetch listing)
- `/api/photos/upload`: <5 seconds (including S3 upload)
- `/api/photos/[id]/verify`: <3 seconds (AI quality check)

**UI Interaction Times:**
- Condition change → price update: <200ms
- Notification tap → dialog open: <100ms
- Chip tap → action: <150ms
- Panel open/close: <300ms (with animation)

**Database Query Performance:**
- Single listing fetch: <50ms
- Listing with photos + notifications: <150ms
- Bulk listing query: <500ms for 50 listings

### 4.4 Data Integrity Checks

**Database Consistency:**
- All foreign keys valid (no orphaned records)
- JSON fields parse without errors
- Numeric fields within valid ranges
- Date fields chronologically valid

**Data Validation:**
- Price uplifts: 0 ≤ total ≤ 0.20
- Condition scores: 0 ≤ score ≤ 1.0
- Photo status: enum('pending', 'accepted', 'rejected')
- Notification type: enum('ALERT', 'QUESTION', 'INSIGHT', 'PHOTO')

---

## 5. Test Data Requirements

### 5.1 Sample Listings

**Listing Type 1: Standard Item (No Premium)**
- Title: "Vintage Electronic Keyboard"
- Condition: "Good"
- Price: $80
- Market Data:
  ```json
  {
    "new": 150,
    "likeNew": 125,
    "good": 80,
    "poor": 40,
    "parts": 30
  }
  ```
- Photos: 3 basic photos
- Expected: No premium features, standard pricing

**Listing Type 2: Premium Item - Vintage Doll**
- Title: "1959 Original Barbie Doll"
- `isPremiumItem`: true
- `specialClass`: "vintage"
- Market Data: Same as Type 1
- `priceUplifts`:
  ```json
  {
    "total": 0.18,
    "special": 0.05,
    "facets": {
      "Authentication": 0.05,
      "Rarity": 0.04,
      "Provenance": 0.04
    }
  }
  ```
- PHOTO Notifications: 4 required photos
- Expected: Full premium features, verified condition, Roadshow Reveal

**Listing Type 3: Collectible with Partial Data**
- Title: "Limited Edition Sneakers"
- `isPremiumItem`: true
- `specialClass`: "collectible"
- Market Data: Partial (missing "likeNew" and "veryGood")
- `verifiedConditionScore`: Partial (only 2 dimensions)
- Expected: Graceful degradation, partial verification

**Listing Type 4: For Parts Item**
- Title: "Broken Laptop - For Parts"
- Condition: "For Parts / Not Working"
- `isPremiumItem`: true (was premium before breaking)
- `priceUplifts`: Should be ignored
- Expected: No uplifts applied, parts pricing only

**Listing Type 5: Free Tier User with Premium Preference**
- User: Free tier
- `conditionReportMode`: "premium"
- Listing: Has verified condition
- Expected: Verified condition report hidden, upgrade prompt shown

### 5.2 Test Photos

**Photo Set 1: High Quality (Acceptance)**
- Clear, well-lit image
- Subject in focus
- Correct framing
- Expected: Accept → analyze condition

**Photo Set 2: Blurry (Rejection)**
- Out of focus image
- Subject not clear
- Expected: Reject → "Photo is too blurry to read"

**Photo Set 3: Poor Lighting (Rejection)**
- Dark, underexposed image
- Subject not visible
- Expected: Reject → "Lighting is too dark"

**Photo Set 4: Wrong Subject (Rejection)**
- Clear photo, but shows wrong item/detail
- Expected: Reject → "Serial number not visible in photo"

**Photo Set 5: Borderline Quality**
- Slightly blurry but readable
- Adequate lighting
- Expected: Edge case - may accept or request retry

### 5.3 Market Data Scenarios

**Scenario 1: Complete Market Data**
```json
{
  "newMedian": 150,
  "usedQ90": 130,
  "usedQ50": 80,
  "usedQ10": 45,
  "partsMedian": 30
}
```

**Scenario 2: No New Items Sold**
```json
{
  "newMedian": null,
  "usedQ90": 130,
  "usedQ50": 80,
  "usedQ10": 45,
  "partsMedian": 30
}
```

**Scenario 3: Limited Data (Few Sales)**
```json
{
  "newMedian": 150,
  "usedQ90": null,
  "usedQ50": 80,
  "usedQ10": null,
  "partsMedian": 30
}
```

**Scenario 4: High-Value Item**
```json
{
  "newMedian": 5000,
  "usedQ90": 4200,
  "usedQ50": 3000,
  "usedQ10": 1800,
  "partsMedian": 500
}
```

### 5.4 User Accounts

**Account 1: Free Tier User**
- `subscriptionTier`: "FREE"
- `conditionReportMode`: "all"
- `premiumPostsUsed`: 2
- `premiumPostsTotal`: 4
- Expected: Limited premium features, can use 2 more premium posts

**Account 2: Premium Tier User**
- `subscriptionTier`: "PRO"
- `conditionReportMode`: "premium"
- Unlimited premium posts
- Expected: Full access to all features

**Account 3: User with "Off" Preference**
- `conditionReportMode`: "off"
- Expected: Verified condition reports hidden by choice

---

## 6. Environment Setup

### 6.1 Development Environment Setup

**Prerequisites:**
1. Docker installed and running
2. Node.js 18+ installed
3. Yarn or npm installed
4. PostgreSQL client (optional, for debugging)

**Setup Steps:**

1. **Start Database Container:**
   ```bash
   docker start gister_postgres
   # Verify connection
   docker exec gister_postgres pg_isready -U gister_user -d gister_dev
   ```

2. **Apply Migrations:**
   ```bash
   cd /mnt/c/Gist-List/app
   npx prisma migrate deploy
   ```

3. **Start Development Server:**
   ```bash
   npm run dev
   # Server starts on http://localhost:3000
   ```

4. **Verify Feature Flags:**
   Check `.env` file contains:
   ```
   NEXT_PUBLIC_PREMIUM_ENABLED=true
   NEXT_PUBLIC_PRICE_LADDER_ENABLED=true
   NEXT_PUBLIC_CONDITION_REPORT_ENABLED=true
   NEXT_PUBLIC_PHOTO_NOTIFICATIONS_ENABLED=true
   ```

5. **Seed Test Data (Optional):**
   ```bash
   npm run seed
   ```

### 6.2 Test Account Setup

**Create Test Users:**
```sql
-- Free tier user
INSERT INTO "User" (id, email, password, subscriptionTier, conditionReportMode)
VALUES ('test-free-user', 'free@test.com', 'hashed_password', 'FREE', 'all');

-- Premium tier user
INSERT INTO "User" (id, email, password, subscriptionTier, conditionReportMode)
VALUES ('test-premium-user', 'premium@test.com', 'hashed_password', 'PRO', 'premium');
```

### 6.3 Database Reset (Between Test Runs)

**Reset Database to Clean State:**
```bash
# Drop and recreate database
docker exec -it gister_postgres psql -U gister_user -c "DROP DATABASE gister_dev;"
docker exec -it gister_postgres psql -U gister_user -c "CREATE DATABASE gister_dev;"

# Reapply migrations
npx prisma migrate deploy

# Reseed data
npm run seed
```

**Or Reset Specific Tables:**
```sql
-- Clear listings and related data
DELETE FROM "AINotification";
DELETE FROM "Photo";
DELETE FROM "PlatformData";
DELETE FROM "Listing";

-- Reset user premium post counts
UPDATE "User" SET premiumPostsUsed = 0;
```

### 6.4 Troubleshooting

**Issue: Dev Server Won't Start**
- Check port 3000 not in use: `lsof -i :3000`
- Kill existing processes: `killall node`
- Clear `.next` cache: `rm -rf .next`

**Issue: Database Connection Failed**
- Verify container running: `docker ps | grep gister_postgres`
- Check credentials in `.env`
- Test connection: `psql postgresql://gister_user:password@localhost:5432/gister_dev`

**Issue: Migrations Out of Sync**
- Check migration status: `npx prisma migrate status`
- Reset migrations: `npx prisma migrate reset`
- Reapply: `npx prisma migrate deploy`

---

## 7. Risk Assessment

### 7.1 High-Risk Areas

**1. Price Calculation Logic (Slice 1 + 4)**
- **Risk**: Incorrect pricing could lead to user losses or platform distrust
- **Mitigation**:
  - Extensive boundary testing (0%, 15%, 20% thresholds)
  - Verify Poor ≥ 1.2× Parts constraint always enforced
  - Test all uplift scenarios including cap
  - Manual calculation verification for critical cases
- **Testing Priority**: CRITICAL

**2. Photo Quality Verification (Slice 2)**
- **Risk**: Accepting poor photos degrades user experience; rejecting good photos frustrates users
- **Mitigation**:
  - Test wide variety of photo qualities
  - Calibrate AI thresholds with real user photos
  - Provide clear, actionable rejection reasons
  - Allow multiple retries without penalty
- **Testing Priority**: CRITICAL

**3. Database Schema Changes**
- **Risk**: Data corruption, lost data, migration failures
- **Mitigation**:
  - Backup database before migrations
  - Test migrations on staging first
  - Verify rollback procedures work
  - Test with production-like data volumes
- **Testing Priority**: CRITICAL

**4. Premium Feature Gating**
- **Risk**: Free users access premium features (revenue loss) or premium users blocked (customer churn)
- **Mitigation**:
  - Test all tier combinations (Free, Basic, Pro)
  - Verify preference modes work correctly
  - Test upgrade/downgrade flows
  - Audit premium feature checks
- **Testing Priority**: HIGH

### 7.2 Medium-Risk Areas

**5. localStorage Persistence (Quick Facts)**
- **Risk**: Lost user selections, cross-contamination between listings
- **Mitigation**:
  - Test localStorage quota limits
  - Verify key namespacing prevents collisions
  - Test across browsers/devices
  - Implement graceful degradation if localStorage fails
- **Testing Priority**: MEDIUM

**6. Notification Resolution Logic**
- **Risk**: Notifications not resolving, UI clutter, duplicate notifications
- **Mitigation**:
  - Test each notification resolution path
  - Verify database updates on resolution
  - Test edge cases (rapid taps, network failures)
- **Testing Priority**: MEDIUM

**7. Facet Detection Accuracy**
- **Risk**: Missing valuable facets, false positives
- **Mitigation**:
  - Review AI confidence thresholds
  - Test with diverse item categories
  - Allow manual facet addition/removal
  - Monitor user feedback on facet accuracy
- **Testing Priority**: MEDIUM

### 7.3 Low-Risk Areas

**8. UI Animations and Transitions**
- **Risk**: Visual glitches, poor UX
- **Mitigation**: Cross-browser testing, visual regression tests
- **Testing Priority**: LOW

**9. Help Text and Tooltips**
- **Risk**: Confusing wording, typos
- **Mitigation**: Content review, user testing
- **Testing Priority**: LOW

### 7.4 Risk Mitigation Summary

| Risk Area | Likelihood | Impact | Priority | Mitigation Strategy |
|-----------|------------|--------|----------|---------------------|
| Price Calculation | Medium | Critical | P0 | 100% test coverage, manual verification |
| Photo Verification | High | High | P0 | Real photo testing, calibration |
| Database Migrations | Low | Critical | P0 | Backups, staging tests, rollback plan |
| Premium Gating | Medium | High | P1 | Tier matrix testing, audit |
| localStorage | Medium | Medium | P2 | Cross-browser tests, fallbacks |
| Notification Resolution | Low | Medium | P2 | Edge case testing |
| Facet Accuracy | Medium | Medium | P2 | AI threshold tuning, manual override |
| UI Polish | Low | Low | P3 | Visual QA |

---

## 8. Regression Testing

### 8.1 Regression Test Scope

**Objective**: Ensure Sweep B changes don't break existing functionality

**Areas to Regression Test:**
1. Basic listing creation/editing (non-premium)
2. Photo upload (standard flow)
3. Platform selection and export
4. Notification system (ALERT, QUESTION, INSIGHT types)
5. Cost tracking and dashboard
6. User authentication and session management
7. Search and filter functionality
8. Mobile responsiveness

### 8.2 Pre-Sweep B Feature Tests

**Test Suite: Core Listing Flow**
- [ ] Create listing without AI analysis
- [ ] Edit listing title, description, price manually
- [ ] Upload photos via standard upload button
- [ ] Select condition from dropdown
- [ ] Save as draft
- [ ] Publish listing
- [ ] Archive listing
- [ ] Delete listing

**Test Suite: Notification System (Original)**
- [ ] ALERT notifications display in red
- [ ] ALERT tap jumps to required field
- [ ] QUESTION notifications display in blue
- [ ] QUESTION allows chip selection
- [ ] INSIGHT notifications display with lightbulb
- [ ] Notifications resolve correctly

**Test Suite: Platform Integration**
- [ ] Select eBay → eBay fields appear
- [ ] Select Mercari → Mercari fields appear
- [ ] Select multiple platforms → multiple tabs
- [ ] Export listing to platform
- [ ] Track posted status

**Test Suite: User Management**
- [ ] Sign up new user
- [ ] Log in existing user
- [ ] Log out
- [ ] Reset password
- [ ] Update profile
- [ ] View subscription status

**Test Suite: Cost Tracking**
- [ ] API costs calculated correctly
- [ ] Storage costs tracked
- [ ] Token usage logged
- [ ] Cost dashboard displays totals
- [ ] Cost breakdown by listing

### 8.3 Regression Pass Criteria

**Critical Regressions: 0 allowed**
- Core listing flow must work 100%
- User authentication must work 100%
- Data persistence must be reliable

**High-Priority Regressions: ≤1 allowed**
- Minor UI issues acceptable if workaround exists
- Performance regressions <10% acceptable

**Medium-Priority Regressions: ≤3 allowed**
- Edge case issues
- Non-blocking UI glitches

### 8.4 Rollback Plan

**If Critical Regressions Detected:**

1. **Immediate Actions:**
   - Stop further testing
   - Document regression with screenshots/videos
   - Notify development team
   - Tag commit with regression details

2. **Assessment:**
   - Determine if fix is quick (< 2 hours)
   - Evaluate risk of fix introducing new issues
   - Consider feature flag disable vs. rollback

3. **Rollback Procedure:**
   ```bash
   # Revert to previous commit
   git revert <sweep-b-commit-hash>

   # Or disable feature flags
   # In .env:
   NEXT_PUBLIC_PREMIUM_ENABLED=false
   NEXT_PUBLIC_PRICE_LADDER_ENABLED=false
   NEXT_PUBLIC_CONDITION_REPORT_ENABLED=false
   NEXT_PUBLIC_PHOTO_NOTIFICATIONS_ENABLED=false

   # Rollback database migrations if needed
   npx prisma migrate resolve --rolled-back <migration-name>
   ```

4. **Post-Rollback:**
   - Verify all pre-Sweep B functionality restored
   - Re-run regression test suite
   - Document issues for next attempt

---

## 9. Test Execution Plan

### 9.1 Testing Phases

**Phase 1: Unit Testing (Days 1-2)**
- Focus: Individual slice features
- Test Cases: TC-S1-001 through TC-S4-011
- Approach: Test each slice independently
- Exit Criteria: 100% critical tests pass, 95% high-priority tests pass

**Phase 2: Integration Testing (Days 3-4)**
- Focus: Cross-slice workflows
- Test Cases: TC-INT-001 through TC-INT-005
- Approach: Test feature interactions
- Exit Criteria: All integration tests pass

**Phase 3: Regression Testing (Day 5)**
- Focus: Existing functionality preservation
- Test Cases: TC-REG-001 through TC-REG-005
- Approach: Verify pre-Sweep B features work
- Exit Criteria: 0 critical regressions, ≤1 high-priority regression

**Phase 4: Edge Case Testing (Day 6)**
- Focus: Boundary conditions and errors
- Test Cases: TC-EDGE-001 through TC-EDGE-010
- Approach: Test error handling and edge cases
- Exit Criteria: 80% edge cases pass, all critical errors handled

**Phase 5: Performance Testing (Day 7)**
- Focus: Response times and load
- Approach: Measure API/UI performance
- Exit Criteria: All benchmarks met

**Phase 6: User Acceptance Testing (Days 8-9)**
- Focus: Real user workflows
- Approach: Test with actual users or user proxies
- Exit Criteria: Users can complete all workflows without assistance

**Phase 7: Bug Fixing (Days 10-12)**
- Focus: Address issues found in testing
- Approach: Prioritize critical → high → medium → low
- Exit Criteria: All critical and high-priority bugs fixed

**Phase 8: Retest and Sign-Off (Days 13-14)**
- Focus: Verify fixes, final validation
- Approach: Re-run failed tests, spot check all features
- Exit Criteria: Overall pass rate ≥90%, all critical tests pass

### 9.2 Test Case Execution Order

**Day 1: Slice 1 (Pricing Ladder)**
1. TC-S1-001: Condition-based pricing
2. TC-S1-002: Poor ≥ 1.2× Parts constraint
3. TC-S1-003: Upper/lower bound clamping
4. TC-S1-004: Price deviation chip appears
5. TC-S1-005: Price deviation chip tap
6. TC-S1-011: Premium uplift integration

**Day 2: Slice 1 (Quick Facts)**
7. TC-S1-006: Panel opens/closes
8. TC-S1-007: "Comes with" selections
9. TC-S1-008: "Missing" selections
10. TC-S1-009: Inoperable → For Parts flip
11. TC-S1-010: localStorage persistence

**Day 3: Slice 2 (Photo Workflow)**
12. TC-S2-001: Purple notification display
13. TC-S2-002: Camera/upload dialog
14. TC-S2-003: Photo upload happy path
15. TC-S2-004: Rejection - blurry
16. TC-S2-005: Rejection - poor lighting
17. TC-S2-006: Rejection - wrong subject
18. TC-S2-007: Condition text append
19. TC-S2-008: Verified badge
20. TC-S2-009: Multiple photos sequential
21. TC-S2-010: Database persistence

**Day 4: Slice 3 (Verified Condition)**
22. TC-S3-001: 4-dimension display
23. TC-S3-002: Badge display
24. TC-S3-003: Tightened ±7% band
25. TC-S3-004: Verified price chip
26. TC-S3-005: Preference "all"
27. TC-S3-006: Preference "premium"
28. TC-S3-007: Preference "off"
29. TC-S3-008: Auto-computed average
30. TC-S3-009: Database schema

**Day 5: Slice 4 (Premium Items)**
31. TC-S4-001: Premium badge
32. TC-S4-002: Special class labels
33. TC-S4-003: Top 4 facets display
34. TC-S4-004: Roadshow Reveal
35. TC-S4-005: Special uplift +5-12%
36. TC-S4-006: Facet uplifts +3-15%
37. TC-S4-007: 20% cap enforcement
38. TC-S4-008: Parts removes uplifts
39. TC-S4-009: Upgrade CTA
40. TC-S4-010: Facet status indicators
41. TC-S4-011: Database schema

**Day 6: Integration Tests**
42. TC-INT-001: Full workflow
43. TC-INT-002: Verified + price deviation
44. TC-INT-003: Premium + verified + ladder
45. TC-INT-004: Quick Facts + premium
46. TC-INT-005: Multiple photos → verified → facets

**Day 7: Regression Tests**
47. TC-REG-001: Basic listing creation
48. TC-REG-002: ALERT/QUESTION notifications
49. TC-REG-003: Standard photo upload
50. TC-REG-004: Platform fields
51. TC-REG-005: Cost tracking

**Day 8-9: Edge Cases**
52-61. TC-EDGE-001 through TC-EDGE-010

### 9.3 Bug Reporting Template

**Bug Report Format:**

```
BUG ID: SWB-[slice]-[number]
Priority: Critical / High / Medium / Low
Status: Open / In Progress / Resolved / Closed

Title: [Brief description]

Test Case: TC-[ID]
Steps to Reproduce:
1. [Step 1]
2. [Step 2]
3. [Step 3]

Expected Result:
[What should happen]

Actual Result:
[What actually happened]

Environment:
- Browser: [Chrome 120.0]
- OS: [Windows 11]
- Branch: [feature/gister-notifications-revamp]
- Commit: [abc123]

Screenshots/Videos:
[Attach evidence]

Console Errors:
[Paste console output]

Database State:
[Relevant DB queries/results]

Impact:
[User impact description]

Suggested Fix:
[If applicable]
```

### 9.4 Test Results Tracking

**Test Results Spreadsheet Columns:**
- Test Case ID
- Test Case Name
- Priority
- Status (Not Run / Pass / Fail / Blocked)
- Date Tested
- Tester Name
- Browser/Device
- Notes
- Bug ID (if failed)

**Daily Test Summary Report:**
```
Date: YYYY-MM-DD
Phase: [Phase Name]

Tests Executed: [X]
Tests Passed: [Y]
Tests Failed: [Z]
Tests Blocked: [W]
Pass Rate: [Y/X %]

Critical Bugs: [count]
High Priority Bugs: [count]
Medium Priority Bugs: [count]
Low Priority Bugs: [count]

Blockers:
- [List any blocking issues]

Notes:
- [Any important observations]
```

---

## 10. Sign-Off Criteria

### 10.1 Go/No-Go Checklist

**Critical Requirements (Must Pass 100%):**
- [ ] All TC-S1 critical tests pass (pricing accuracy)
- [ ] All TC-S2 critical tests pass (photo verification)
- [ ] All TC-S3 critical tests pass (verified condition)
- [ ] All TC-S4 critical tests pass (premium items)
- [ ] All integration tests pass
- [ ] 0 critical regressions
- [ ] Database migrations successful
- [ ] Rollback procedure tested and works

**High-Priority Requirements (Must Pass ≥95%):**
- [ ] High-priority slice tests ≥95% pass rate
- [ ] ≤1 high-priority regression
- [ ] Performance benchmarks met
- [ ] Security audit passed (if applicable)

**Documentation Requirements:**
- [ ] Test results documented
- [ ] Known issues logged
- [ ] User-facing documentation updated
- [ ] Release notes prepared

**Approval Sign-Offs:**
- [ ] QA Lead Approval: _______________  Date: ________
- [ ] Product Manager Approval: _______________  Date: ________
- [ ] Engineering Lead Approval: _______________  Date: ________

### 10.2 Known Issues Log (at Sign-Off)

**Acceptable Known Issues:**
- List any medium/low priority bugs shipping with release
- Include workarounds and target fix dates

**Example:**
```
ISSUE-001: Quick Facts panel animation occasionally stutters on slow devices
Priority: Low
Impact: Minor UX degradation, no functional impact
Workaround: None needed, fully functional
Target Fix: Next sprint
```

### 10.3 Post-Deployment Monitoring

**Metrics to Monitor:**
1. **User Adoption:**
   - Premium item listings created
   - Photo verification usage rate
   - Verified condition reports generated
   - Roadshow Reveal engagement

2. **Performance:**
   - API response times (p50, p95, p99)
   - Photo upload success rate
   - Photo verification acceptance rate
   - Database query performance

3. **Errors:**
   - Console error rate
   - API error rate
   - Failed photo uploads
   - Failed price calculations

4. **User Behavior:**
   - Price deviation chip tap rate
   - Quick Facts usage frequency
   - Photo retry attempts
   - Premium upgrade conversion from Roadshow Reveal

**Monitoring Duration:** 7 days post-deployment

**Alert Thresholds:**
- API error rate >1%
- Photo upload failure rate >5%
- Critical error in console
- Performance degradation >20%

---

## Appendix A: Test Data SQL Scripts

### A.1 Create Test Listings

```sql
-- Standard listing (no premium)
INSERT INTO "Listing" (
  id, userId, status, title, description, condition, price, category,
  brandNewPrice, priceRangeHigh, priceRangeMid, priceRangeLow, priceForParts
) VALUES (
  'test-listing-standard-1',
  'test-free-user',
  'DRAFT',
  'Vintage Electronic Keyboard',
  'Classic 1980s electronic keyboard in good working condition.',
  'Good',
  80.00,
  'Electronics',
  150.00, 130.00, 80.00, 45.00, 30.00
);

-- Premium listing (vintage doll)
INSERT INTO "Listing" (
  id, userId, status, title, description, condition, price, category,
  brandNewPrice, priceRangeHigh, priceRangeMid, priceRangeLow, priceForParts,
  isPremiumItem, specialClass, facets, priceUplifts,
  verifiedCondition, verifiedConditionScore
) VALUES (
  'test-listing-premium-1',
  'test-premium-user',
  'DRAFT',
  '1959 Original Barbie Doll',
  'First year production Barbie with original swimsuit and box.',
  'Like New',
  118.00,
  'Collectibles',
  150.00, 130.00, 100.00, 55.00, 40.00,
  true,
  'vintage',
  '[
    {"name":"Original packaging","category":"Provenance","status":"present","confidence":0.95},
    {"name":"Serial number verified","category":"Authentication","status":"present","confidence":0.92},
    {"name":"First year production","category":"Rarity","status":"present","confidence":0.88},
    {"name":"All accessories included","category":"Completeness","status":"present","confidence":0.85}
  ]'::json,
  '{"total":0.18,"special":0.05,"facets":{"Authentication":0.05,"Rarity":0.04,"Provenance":0.04}}'::json,
  'Like New',
  '{"surface":0.85,"function":0.90,"clean":0.88,"complete":0.80,"avg":0.8575}'::json
);
```

### A.2 Create PHOTO Notifications

```sql
-- PHOTO notification 1: Serial number
INSERT INTO "AINotification" (
  id, listingId, type, message, field, actionType, actionData, section, resolved
) VALUES (
  'notif-photo-1',
  'test-listing-premium-1',
  'PHOTO',
  'Add close-up of serial number tag',
  'photos',
  'add_photo',
  '{"requirement":"serial_tag_macro","facetTag":"serial_number","section":"photos"}'::text,
  'photos',
  false
);

-- PHOTO notification 2: Face paint
INSERT INTO "AINotification" (
  id, listingId, type, message, field, actionType, actionData, section, resolved
) VALUES (
  'notif-photo-2',
  'test-listing-premium-1',
  'PHOTO',
  'Add close-up of hair rooting and face paint',
  'photos',
  'add_photo',
  '{"requirement":"face_detail","facetTag":"face_paint","section":"photos"}'::text,
  'photos',
  false
);
```

### A.3 Update User Preferences

```sql
-- Set user to "all" preference
UPDATE "User"
SET conditionReportMode = 'all'
WHERE id = 'test-free-user';

-- Set user to "premium" preference
UPDATE "User"
SET conditionReportMode = 'premium'
WHERE id = 'test-premium-user';
```

---

## Appendix B: API Testing Examples

### B.1 Test Price Calculation API

```bash
# Get listing with ladder stats
curl http://localhost:3000/api/listings/test-listing-premium-1 \
  -H "Cookie: session_token_here"

# Expected response includes:
{
  "id": "test-listing-premium-1",
  "price": 118.00,
  "condition": "Like New",
  "isPremiumItem": true,
  "priceUplifts": {
    "total": 0.18,
    "special": 0.05,
    "facets": { ... }
  },
  "ladderStats": {
    "new": 150,
    "likeNew": 130,
    "good": 100,
    "poor": 55,
    "parts": 40
  }
}
```

### B.2 Test Photo Upload API

```bash
# Upload photo
curl -X POST http://localhost:3000/api/photos/upload \
  -H "Cookie: session_token_here" \
  -F "file=@test_photo.jpg" \
  -F "listingId=test-listing-premium-1" \
  -F "facetTag=serial_number" \
  -F "notificationId=notif-photo-1"

# Expected response:
{
  "photoId": "photo-abc123",
  "status": "pending",
  "url": "https://cdn.gister.ai/uploads/photo-abc123.jpg"
}
```

### B.3 Test Photo Verification API

```bash
# Verify photo
curl -X POST http://localhost:3000/api/photos/photo-abc123/verify \
  -H "Cookie: session_token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "accepted",
    "analysisData": {
      "focusScore": 0.93,
      "facetDetected": true,
      "facetName": "Serial number",
      "conditionNotes": "Serial number tag is intact and clearly legible."
    }
  }'

# Expected response:
{
  "id": "photo-abc123",
  "status": "accepted",
  "facet": {
    "name": "Serial number",
    "category": "Authentication",
    "status": "present",
    "confidence": 0.93
  },
  "linkedNotificationId": "notif-photo-1"
}
```

---

## Appendix C: Quick Reference

### C.1 Test Execution Quick Start

```bash
# 1. Setup environment
cd /mnt/c/Gist-List/app
docker start gister_postgres
npm run dev

# 2. Verify feature flags in browser console
localStorage.getItem('feature_flags')

# 3. Access test listing
http://localhost:3000/listing/test-listing-premium-1

# 4. Run through test cases in order
# See Section 9.2 for execution order

# 5. Log results in tracking spreadsheet
```

### C.2 Common Test Scenarios

**Scenario: Test Complete Premium Workflow**
1. Create premium listing → TC-S4-001
2. Upload 4 photos → TC-S2-003
3. See verified condition → TC-S3-001
4. See Roadshow Reveal → TC-S4-004
5. Change price → see deviation chip → TC-S1-004
6. Tap chip → price applies → TC-S1-005

**Scenario: Test Photo Rejection & Retry**
1. Open PHOTO notification → TC-S2-002
2. Upload blurry photo → TC-S2-004
3. See rejection message
4. Tap "Try Again"
5. Upload clear photo → TC-S2-003
6. See acceptance

**Scenario: Test Quick Facts**
1. Open Quick Facts panel → TC-S1-006
2. Select "Original Box" → TC-S1-007
3. Select "Missing Power Supply" → TC-S1-008
4. Toggle "Inoperable" → TC-S1-009
5. See condition change to Parts
6. Verify localStorage persists → TC-S1-010

### C.3 Key Database Queries

**Check Listing Data:**
```sql
SELECT id, title, condition, price, isPremiumItem, specialClass,
       verifiedCondition, priceUplifts, facets
FROM "Listing"
WHERE id = 'test-listing-premium-1';
```

**Check Photo Status:**
```sql
SELECT id, status, facetTag, verificationReason, analysisData
FROM "Photo"
WHERE listingId = 'test-listing-premium-1';
```

**Check Notifications:**
```sql
SELECT id, type, message, resolved, actionData
FROM "AINotification"
WHERE listingId = 'test-listing-premium-1';
```

### C.4 Contact Information

**QA Team:**
- QA Lead: [Name] - [email]
- QA Engineer: [Name] - [email]

**Development Team:**
- Engineering Lead: [Name] - [email]
- Backend Dev: [Name] - [email]
- Frontend Dev: [Name] - [email]

**Product Team:**
- Product Manager: [Name] - [email]

**Escalation:**
- Critical issues: Slack #gister-urgent
- Bug reports: JIRA project GISTer

---

**End of Test Plan**

**Document Control:**
- **Created By**: QA Expert Subagent
- **Date**: 2025-10-11
- **Version**: 1.0
- **Next Review**: Post-deployment (7 days after release)
- **Approvals Required**: QA Lead, Product Manager, Engineering Lead
