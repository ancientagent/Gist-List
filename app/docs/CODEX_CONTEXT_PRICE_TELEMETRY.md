# Codex Context: Price Telemetry Feature

**Branch:** `feature/price-telemetry`
**Base:** `main` (latest with marketplace integrations + Sweep B features)
**Date:** 2025-10-12
**Project:** GISTer - AI-Powered Reselling Platform

---

## 🎯 Current State of the Codebase

You're working on a **Next.js 14.2.28** app with:
- **PostgreSQL 15** database via Prisma ORM
- **NextAuth** for authentication
- **AWS S3** for photo storage
- **OpenAI API** for AI analysis
- **Stripe** for subscriptions

### Recent Major Changes (Just Merged to Main)

1. **Chrome Extension** - Complete browser extension for auto-filling 8 marketplaces
2. **Marketplace Integrations** - eBay, Reverb, Etsy OAuth + API posting
3. **Search Infrastructure** - Buyer marketplace with facet-based grading (A-F)
4. **Sweep B Features** - Pricing Ladder, Photo Workflow, Verified Condition, Premium Items
5. **E2E Tests** - Playwright test suite (35 tests, needs data-testid attributes to run)

### Tech Stack
- **Framework:** Next.js 14.2.28 (App Router)
- **Database:** PostgreSQL 15 + Prisma 6.7.0
- **Auth:** NextAuth.js
- **Storage:** AWS S3 with image compression
- **AI:** OpenAI GPT-4 Vision
- **Testing:** Playwright 1.56.0
- **Styling:** Tailwind CSS + shadcn/ui components

---

## 📋 Your Task: Price Telemetry Feature

### Goal
Implement telemetry tracking for pricing events to understand user behavior and optimize the pricing ladder feature.

### What Needs Tracking

#### Price Events
1. **price_updated** - User manually changes price
   - `oldPrice`, `newPrice`, `condition`, `listingId`, `source` (manual/chip/api)

2. **price_chip_appeared** - Deviation chip shows (≥15% off)
   - `suggestedPrice`, `currentPrice`, `deviation`, `direction` (up/down)

3. **price_chip_clicked** - User taps chip to apply suggested price
   - `oldPrice`, `newPrice`, `chipType`

4. **condition_changed** - User changes condition
   - `oldCondition`, `newCondition`, `priceUpdated` (boolean), `autoPrice`

5. **premium_uplift_applied** - Premium item pricing calculated
   - `basePrice`, `upliftPercent`, `finalPrice`, `specialClass`, `facets`

#### User Interaction Events
6. **notification_tap** - User taps any notification
   - `notificationType`, `actionType`, `section`

7. **chip_select** - User selects a chip from Smart Chip Bin
   - `chipCategory`, `chipText`, `section`

8. **photo_request** - Purple PHOTO notification created
9. **photo_uploaded** - User uploads photo
10. **photo_verified** - Photo passes quality check
11. **facet_value_computed** - Facet confidence calculated
12. **condition_verified** - 4-dimension condition score calculated

### Database Schema

**Already exists:** `TelemetryEvent` table in Prisma schema

```prisma
model TelemetryEvent {
  id         String   @id @default(cuid())
  userId     String
  listingId  String
  eventType  String   @db.VarChar(50)
  metadata   Json?
  createdAt  DateTime @default(now())

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  listing Listing @relation(fields: [listingId], references: [id], onDelete: Cascade)

  @@index([listingId])
  @@index([eventType])
}
```

### API Route (Already Exists)
`app/api/telemetry/track/route.ts` - POST endpoint for tracking events

---

## 🗂️ Key Files You'll Work With

### 1. Pricing Logic
**File:** `app/src/lib/priceLogic.ts`
**Purpose:** Core pricing ladder calculations
**Functions:**
- `computePriceBands()` - Generate 7-tier pricing ladder
- `applyPremiumUplift()` - Add premium uplifts (cap 20%)
- `calculatePriceDeviation()` - Check if ≥15% off
- `insertUniqueLine()` - Smart text insertion for condition notes

**Add telemetry calls here for:**
- Price calculations
- Premium uplifts
- Deviation detection

### 2. Listing Detail Component
**File:** `app/app/listing/[id]/_components/listing-detail.tsx`
**Size:** 1100+ lines
**Purpose:** Main listing editor UI

**Key sections to instrument:**
- Price input onChange handler
- Condition select onChange handler
- Price deviation chip onClick handler
- Save/update listing function

**Example telemetry call:**
```typescript
await fetch('/api/telemetry/track', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: session.user.id,
    listingId: listing.id,
    eventType: 'price_updated',
    metadata: {
      oldPrice: previousPrice,
      newPrice: currentPrice,
      condition: listing.condition,
      source: 'manual'
    }
  })
});
```

### 3. Smart Chip Bin
**File:** `app/app/listing/[id]/_components/smart-chip-bin.tsx`
**Purpose:** Context-aware chip selection UI

**Add telemetry for:**
- `chip_select` event when user clicks a chip
- Track which chips are most used
- Track chip categories (missing, comes_with, condition_details, etc.)

### 4. Notification List
**File:** `app/app/listing/[id]/_components/notification-list.tsx`
**Purpose:** Display and handle AI notifications

**Add telemetry for:**
- `notification_tap` when user clicks notification
- Track which notification types drive most engagement
- Track resolution rates

### 5. Photo Verification
**File:** `app/app/api/photos/[id]/verify/route.ts` (if exists)
**Purpose:** Photo quality checks

**Add telemetry for:**
- `photo_verified` / `photo_rejected`
- Quality check reasons
- Retry patterns

---

## 🔧 Implementation Guidelines

### 1. Telemetry Helper Function
Create a reusable helper to avoid repetition:

**File:** `app/lib/telemetry.ts` (already exists)

```typescript
export async function trackEvent(params: {
  userId: string;
  listingId: string;
  eventType: string;
  metadata?: Record<string, any>;
}) {
  try {
    await fetch('/api/telemetry/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
  } catch (error) {
    // Silent fail - don't block UX
    console.error('[Telemetry] Failed to track event:', error);
  }
}
```

### 2. Client-Side vs Server-Side

**Client-Side (Components):**
- User interactions (clicks, taps, selections)
- UI state changes
- Navigation events

**Server-Side (API Routes):**
- Price calculations
- Premium uplifts
- AI analysis completions
- Photo verifications

### 3. Error Handling
- **Never block user flow** - telemetry failures should be silent
- Use try/catch around all tracking calls
- Log errors to console for debugging
- Consider using `Promise.allSettled()` for batch tracking

### 4. Privacy Considerations
- Don't track PII beyond userId/listingId
- Aggregate data for analytics
- Include opt-out mechanism (future enhancement)

---

## 📊 Analytics Queries (For Future Dashboard)

Once telemetry is implemented, these queries will be useful:

```sql
-- Most common price adjustments
SELECT
  eventType,
  metadata->>'source' as source,
  COUNT(*) as count
FROM "TelemetryEvent"
WHERE eventType = 'price_updated'
GROUP BY eventType, source
ORDER BY count DESC;

-- Chip usage patterns
SELECT
  metadata->>'chipCategory' as category,
  metadata->>'chipText' as text,
  COUNT(*) as usage_count
FROM "TelemetryEvent"
WHERE eventType = 'chip_select'
GROUP BY category, text
ORDER BY usage_count DESC;

-- Notification engagement
SELECT
  metadata->>'notificationType' as type,
  COUNT(*) as tap_count
FROM "TelemetryEvent"
WHERE eventType = 'notification_tap'
GROUP BY type
ORDER BY tap_count DESC;

-- Premium uplift effectiveness
SELECT
  metadata->>'specialClass' as class,
  AVG((metadata->>'upliftPercent')::float) as avg_uplift,
  COUNT(*) as count
FROM "TelemetryEvent"
WHERE eventType = 'premium_uplift_applied'
GROUP BY class
ORDER BY count DESC;
```

---

## 🚨 Known Issues & Context

### Issue 1: E2E Tests Not Running
**Status:** Tests created but need `data-testid` attributes in components
**Impact:** Won't affect your work, but good to know
**Location:** `tests/DATA_TESTID_RECOMMENDATIONS.md` has full list

### Issue 2: Multiple Dev Servers Running
**Status:** Multiple `npm run dev` processes on different ports
**Impact:** Check which port you're testing on (3000, 3001, 3002)
**Fix:** Kill extra processes if needed: `killall node`

### Issue 3: Prisma Client Generation
**Status:** After schema changes, must run `npx prisma generate`
**Impact:** TypeScript errors if client is stale
**Fix:** Run generation after any schema changes

---

## 🔍 Testing Your Changes

### Manual Testing Checklist

#### Price Events
- [ ] Change price manually → check telemetry call
- [ ] Change condition → verify price updates + telemetry
- [ ] Deviate price 15%+ → chip appears → telemetry fires
- [ ] Click chip → price applies → telemetry confirms
- [ ] Premium item → verify uplift telemetry

#### UI Interactions
- [ ] Click any notification → telemetry tracks it
- [ ] Select chip from bin → telemetry captures category+text
- [ ] Upload photo → telemetry logs upload + verification

#### Database Verification
```sql
-- Check recent telemetry events
SELECT
  eventType,
  metadata,
  createdAt
FROM "TelemetryEvent"
WHERE userId = 'your-test-user-id'
ORDER BY createdAt DESC
LIMIT 20;
```

### Test Data
Use existing test users from Sweep B:
- `test-free@gister.test` (FREE tier)
- `test-premium@gister.test` (PRO tier)
- Password: `TestPassword123!`

---

## 📁 Project Structure

```
app/
├── api/
│   ├── listings/
│   │   └── [id]/
│   │       ├── analyze/route.ts     - AI analysis (add telemetry)
│   │       └── route.ts             - Update listing (add telemetry)
│   ├── photos/
│   │   └── [id]/
│   │       └── verify/route.ts      - Photo quality check
│   └── telemetry/
│       └── track/route.ts           - Telemetry endpoint (already exists)
├── listing/[id]/
│   └── _components/
│       ├── listing-detail.tsx       - Main editor (PRIMARY FOCUS)
│       ├── smart-chip-bin.tsx       - Chip selection
│       └── notification-list.tsx    - Notifications
├── lib/
│   ├── telemetry.ts                 - Helper functions (already exists)
│   └── priceLogic.ts                - Pricing calculations (in src/lib/)
└── src/lib/
    └── priceLogic.ts                - Actual location of pricing logic

prisma/
└── schema.prisma                    - Database schema (TelemetryEvent exists)
```

---

## 🎯 Implementation Plan

### Phase 1: Core Price Events (Start Here)
1. Add telemetry helper import to `listing-detail.tsx`
2. Instrument price input onChange
3. Instrument condition select onChange
4. Instrument price chip onClick
5. Test with manual database queries

### Phase 2: Premium & Advanced
1. Add telemetry to premium uplift calculation
2. Track facet computations
3. Track verified condition scoring
4. Add metadata for context

### Phase 3: Photo & Notifications
1. Instrument photo upload events
2. Instrument photo verification
3. Track notification interactions
4. Track chip selections

### Phase 4: Validation
1. Test all events fire correctly
2. Verify metadata is complete
3. Check performance (no blocking)
4. Run sample analytics queries

---

## 💡 Tips for Working with Codex

### Do's
✅ Start with Phase 1 (core price events)
✅ Test incrementally after each addition
✅ Use the telemetry helper function
✅ Keep metadata consistent across similar events
✅ Check database after each test

### Don'ts
❌ Don't block user interactions waiting for telemetry
❌ Don't track sensitive user data
❌ Don't make telemetry required for features to work
❌ Don't forget error handling

---

## 📞 Reference Documents

- `docs/MERGE_CHECKLIST.md` - Recent changes and merge info
- `docs/SPECIAL_ITEMS_FEATURE.md` - Premium items/facets system
- `docs/QA/GISTER_TEST_PLAN.md` - Manual test plan (61 test cases)
- `tests/README.md` - E2E test documentation
- `MARKETPLACE_INTEGRATION_STATUS.md` - Marketplace features (root level)
- `EXTENSION_INTEGRATION_COMPLETE.md` - Chrome extension docs (root level)

---

## 🚀 Ready to Start

You have everything you need:
1. ✅ Feature branch created: `feature/price-telemetry`
2. ✅ Database schema ready (TelemetryEvent table exists)
3. ✅ API endpoint ready (`/api/telemetry/track`)
4. ✅ Helper library ready (`lib/telemetry.ts`)
5. ✅ Test users available
6. ✅ Dev server running on localhost:3002

**Start with Phase 1** - instrument the core price events in `listing-detail.tsx` and build from there.

Good luck! 🎉
