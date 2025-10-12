# Handoff Checklist – Sweep B Follow-up

**Date**: 2025-10-11
**Author**: GPT-5 Codex (pricing ladder + purple photo workflow)

## Completed This Session
- Percentile pricing ladder wired into API + UI, auto-suggests price chips when deviation ≥15%
- Quick Facts modal now inserts buyer disclosures, remembers per user/category, and flips condition to "For parts / not working" with repricing
- Purple photo workflow live: upload stores requirement/facet context, `/api/photos/[id]/verify` performs quality QA + AI analysis, notifications resolve automatically
- Verified condition report renders GISTer badge, four-dimension scores, and tightens the price band to ±7%
- Premium specials workflow stores `isPremiumItem`, `facets`, `priceUplifts` and surfaces the Roadshow Reveal card + Quality Verification CTA
- Documentation refreshed (INDEX, CHANGELOG, SPECIAL_ITEMS_FEATURE, QA plan)

## Outstanding Work
1. **Slice 5 – Telemetry & Analytics**
   - Emit `photo_request`, `photo_uploaded`, `photo_verified`, `facet_value_computed`, `condition_verified`
   - Track price edits (`price_updated`) and chip interactions (`notification_tap`, `chip_select`)
   - Fold telemetry notes into docs once events are live

## QA Focus
- Pricing ladder chip thresholds (±15%) across conditions
- Quick Facts inoperable flow (condition flip + repricing)
- Purple photo workflow (reject + accept paths, notification resolution, gallery badges)
- Legacy photo gallery add/retake still functions

## Migration Note
- Run Prisma migration to add new columns on `Photo` (`status`, `requirement`, `facetTag`, `notificationId`, `analysisData`, `verifiedAt`)

## Key Files to Review
- `src/lib/priceLogic.ts`
- `app/api/photos/upload/route.ts`
- `app/api/photos/[id]/verify/route.ts`
- `app/api/photos/utils.ts`
- `app/api/listings/[id]/analyze/route.ts`
- `app/listing/[id]/_components/notification-list.tsx`
- `app/listing/[id]/_components/photo-gallery.tsx`
