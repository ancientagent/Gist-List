# GISTer Sweep B - Current Implementation Context

**Last Updated**: 2025-10-11
**Current Branch**: `feature/gister-notifications-revamp`
**Project Root**: `/mnt/c/Gist-List/app`

---

## 🎯 Current Status: Slice 5 – Telemetry & Analytics (Docs refreshed)

### Completed Slices ✅

#### Slice 1: Pricing Ladder + Quick Facts ✅
**Files Modified**:
- `src/lib/priceLogic.ts` - Percentile-based pricing logic
- `app/api/listings/[id]/analyze/route.ts` - Generate ladder stats
- `app/api/listings/[id]/route.ts` - Return ladder bands
- `app/listing/[id]/_components/listing-detail.tsx` - UI integration
- `src/components/QuickFactsPanel.tsx` - Multi-entry condition disclosure

**What Works**:
- Price suggestions based on market data (New, Like New, Very Good, Good, Fair, Poor, Parts)
- Auto-pricing when condition changes
- "Set $X (↑/↓)" chips appear at ≥15% deviation
- Quick Facts panel with localStorage memory
- Inoperable selection flips to "For Parts" + reprices

**Database**:
- `Listing.ladderStats` - Stores `PriceBands` (brandNew, usedQ90, usedQ50, usedQ10, forParts)

#### Slice 2: Purple Photo Workflow ✅
**Files Modified**:
- `app/api/photos/upload/route.ts` - Photo upload with metadata
- `app/api/photos/[id]/verify/route.ts` - Quality check + AI analysis
- `app/listing/[id]/_components/notification-list.tsx` - Purple notification UI
- `app/api/photos/utils.ts` - Quality verification helpers

**What Works**:
- Purple PHOTO notifications trigger camera/upload dialog
- Quality checks reject poor images with specific reasons
- Accepted photos resolve notifications and append condition text
- Progress indicators during upload/verify
- Retry flow on rejection

**Database**:
- `Photo` table with `status`, `facetTag`, `analysisData`, `verificationReason`

#### Slice 3: Verified Condition Report ✅
**Files Modified**:
- `app/listing/[id]/_components/listing-detail.tsx` - Verified badge + score display
- `app/listing/[id]/_components/photo-gallery.tsx` - Verification badges

**What Works**:
- 4-dimension scoring: Surface, Function, Cleanliness, Completeness
- "GISTer Verified Condition" badge
- Tightened price band: ±7% for verified (vs ±15% unverified)
- Preference handling: `conditionReportMode` (all/premium/off)
- Auto-computed average score

**Database**:
- `Listing.verifiedCondition` - String (e.g., "Like New")
- `Listing.verifiedConditionScore` - JSON with `{ surface, function, clean, complete, avg }`
- `User.conditionReportMode` - Preference setting

**Migration**:
- `20251011144014_add_verified_condition` - Added verified fields

#### Slice 4: Premium Special Items + Roadshow Reveal ✅
**Files Modified**:
- `prisma/schema.prisma` - Added `isPremiumItem`, `specialClass`, `facets`, `priceUplifts`
- `app/listing/[id]/_components/listing-detail.tsx` - Complete Roadshow Reveal UI
- `src/lib/priceLogic.ts` - `applyPremiumUplift()` with 20% cap enforcement
- `docs/SPECIAL_ITEMS_FEATURE.md` - Updated with implementation snapshot

**What Works**:
- Premium item detection badge with Gem icon
- Roadshow Reveal card showing baseline vs verified value
- Facet breakdown with top 4 contributors and confidence scores
- Special class labels (Vintage, Collectible, Antique, Luxury, Custom, Art)
- Price uplift calculation: special item +5-12%, per facet +3-15%, total cap 20%
- Integration with pricing ladder - all price calculations include premium uplifts
- Upgrade CTA for non-premium users
- Parts condition removes all premium uplifts

**The Five Facets**:
1. **Authentication** - Serial numbers, holograms, signatures, certificates
2. **Condition** - Paint integrity, wear patterns, structural soundness
3. **Rarity** - Limited editions, variants, prototypes, discontinued
4. **Provenance** - Original packaging, manuals, certificates, ownership history
5. **Completeness** - All accessories, documentation, ephemera present

**Database**:
- `Listing.isPremiumItem` - Boolean flag for special items
- `Listing.specialClass` - VARCHAR(50) classification
- `Listing.facets` - JSON array of `{ name, category, status, confidence }`
- `Listing.priceUplifts` - JSON with `{ total, special, facets: { category: pct } }`

**Migration**:
- `20251011161045_add_is_premium_item` - Added isPremiumItem boolean
- Schema already has `specialClass`, `facets`, `priceUplifts` columns

### Current Work: Slice 5 - Telemetry & Analytics 📋

**Goal**: Add telemetry event tracking; documentation refresh is complete.

**Telemetry Events (pending)**:
- `photo_request`, `photo_uploaded`, `photo_verified`
- `facet_value_computed`, `condition_verified`
- `price_updated`, `notification_tap`, `chip_select`

**Documentation Status**:
- ✅ `docs/INDEX.md` updated with Sweep B summary + QA link
- ✅ `docs/overview/CHANGELOG.md` summarizes Slice 3 & 4 deliverables
- ✅ `docs/SPECIAL_ITEMS_FEATURE.md` reflects Roadshow reveal implementation
- ✅ `docs/QA/GISTER_TEST_PLAN.md` added with verification checklist

---

## 🗂️ Key Files Reference

### Specs
- `docs/specs/PM_SWEEP_B_SPEC.md` - **THE SOURCE OF TRUTH** for all requirements
- `docs/HANDOFF_2025_10_10.md` - Session history + testing checklist
- `docs/CONTEXT_AWARE_CHIPS.md` - Smart chip system principles
- `docs/SPECIAL_ITEMS_FEATURE.md` - Facets framework documentation

### Core Components
- `app/listing/[id]/_components/listing-detail.tsx` - Main listing editor (1100+ lines)
- `app/listing/[id]/_components/notification-list.tsx` - Notification display + purple workflow
- `app/listing/[id]/_components/smart-chip-bin.tsx` - Context-aware chip selection
- `src/components/QuickFactsPanel.tsx` - Condition disclosure UI

### API Routes
- `app/api/listings/[id]/analyze/route.ts` - AI analysis + notification generation
- `app/api/listings/[id]/route.ts` - Get/update listing
- `app/api/photos/upload/route.ts` - Photo upload
- `app/api/photos/[id]/verify/route.ts` - Photo quality check + analysis

### Utilities
- `src/lib/priceLogic.ts` - Pricing ladder, delta computation, unique line insertion
- `app/api/photos/utils.ts` - Photo quality verification

---

## 🔧 Environment

### Database
- **Type**: PostgreSQL 15
- **Container**: `gister_postgres`
- **Connection**: `localhost:5432`
- **Database**: `gister_dev`
- **User**: `gister_user`

### Dev Server
- **Port**: `http://localhost:3000`
- **Framework**: Next.js 14.2.28
- **Background Processes**: Multiple `npm run dev` instances running

### Migrations Applied
1. `20251011143041_init` - Initial schema
2. `20251011144014_add_verified_condition` - Verified condition fields
3. `20251011150323_add_premium_facets` - Premium facets (prior session)
4. `20251011161045_add_is_premium_item` - isPremiumItem boolean ✅ JUST APPLIED

---

## 🚨 Known Issues & Workarounds

### Webpack Error on Home Page
**Status**: Persistent but doesn't block listing detail work
**Error**: `TypeError: Cannot read properties of undefined (reading 'call')`
**Location**: `app/page.tsx` (home page)
**Impact**: Home page may not load, but `/listing/[id]` works fine
**Workaround**: Focus on listing detail pages for testing

### Permission Issues
**Status**: Resolved
**Issue**: Codex couldn't create migration folders
**Fix**: Permissions set to 777 on `prisma/` folder
**Note**: Manual migration creation needed sometimes

### Prisma Connection from Codex
**Status**: Workaround in place
**Issue**: Codex can't connect to Postgres from its environment
**Fix**: Claude Code applies migrations manually via `npx prisma migrate deploy`

---

## 📋 Testing Quick Reference

### Pricing Ladder Tests
```
1. Change condition → price updates
2. Price deviates 15%+ → "Set $X" chip appears
3. Tap chip → price applies, notification resolves
4. Verify Poor ≥ 1.2× Parts in all cases
```

### Photo Workflow Tests
```
1. Tap purple notification → camera/upload dialog opens
2. Upload blurry image → rejection with reasons
3. Upload clear image → notification resolves, text appends
4. Verify "Verified" badge on photo in gallery
```

### Verified Condition Tests
```
1. Listing with verified scores → badge shows
2. 4 progress bars render (Surface, Function, Clean, Complete)
3. Price band shows ±7% (vs ±15% unverified)
4. Preference "premium" hides report on free tier
```

### Quick Facts Tests
```
1. Tap "Quick Facts" chip → panel opens
2. Select "Comes with" → inserts into conditionNotes
3. Select "Missing" → inserts into conditionNotes
4. Select "Inoperable" → flips to "For Parts" + reprices
5. Multiple selections persist across opens (localStorage)
```

---

### Roadshow Reveal Tests
```
1. Premium item detected → badge shows with Gem icon
2. Facets identified → Roadshow Reveal card appears
3. Baseline vs verified value shown correctly
4. Top 4 facets listed with confidence scores
5. Total uplift capped at 20%
6. Parts condition removes all uplifts
7. Non-premium users see upgrade CTA
```

---

## 🎯 Current Task for Codex

**YOU ARE HERE**: Implementing Slice 5 - Telemetry + Documentation

**What to do next**:
1. ~~Add telemetry event tracking system~~ (Optional - can be added later)
2. Update `docs/INDEX.md` with Sweep B summary
3. Update `docs/overview/CHANGELOG.md` with all Sweep B changes
4. Create `docs/QA/GISTER_TEST_PLAN.md` with test cases for all 4 slices

**Reference**: `docs/specs/PM_SWEEP_B_SPEC.md` Section 5 for documentation requirements

---

## 💡 Quick Commands

```bash
# Run dev server
npm run dev

# Type check
npm run typecheck

# Lint
npm run lint

# Build (takes ~4 minutes)
npm run build

# Apply migrations
npx prisma migrate deploy

# Check database
docker exec gister_postgres pg_isready -U gister_user -d gister_dev

# Access database
docker exec -it gister_postgres psql -U gister_user -d gister_dev
```

---

## 📞 When You Need Help

**Ask Claude Code to**:
- Create migration folders manually
- Apply migrations via `npx prisma migrate deploy`
- Fix permissions on files/folders
- Check dev server status
- Verify database connection

**If context is lost**:
1. Read this file: `docs/CURRENT_CONTEXT.md`
2. Read PM spec: `docs/specs/PM_SWEEP_B_SPEC.md`
3. Check handoff: `docs/HANDOFF_2025_10_10.md`

---

**Remember**: You're doing great! Slices 1-4 are complete and working. Just documentation (Slice 5) left! 🚀
