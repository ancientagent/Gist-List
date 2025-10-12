# Search Index & Grading Handoff (2025-10-12)

## Scope Delivered on `feature/gister-notifications-revamp`

- **Schema updates**
  - `Listing.highlightedFacets` – seller-selected facet keys that should contribute to the composite grade.
  - `SearchIndex` model – denormalised listing cache used for buyer search and grading.
  - Migration `20251011190000_add_search_index` adds the new table, indexes, and the highlighted facets column.
- **Indexing helper**
  - `lib/search-index.ts`
    - `reindexListing(listingId)` – loads listing, computes per-facet grades, condition baseline, composite `gradeScore`, builds `searchableText`, and upserts `SearchIndex`.
    - `reindexAllListings()` – iterates through every listing and calls `reindexListing`; safe to use for backfills.
  - Facet grading uses:
    - Status multiplier (present/verified: 1.0, partial/user: 0.6, missing: 0).
    - Category weights (Authentication 1.0, Provenance 0.9, Rarity 0.85, Completeness 0.8, Condition 0.75, default 0.7).
    - Confidence value from facet record (defaults to 0.6 if missing).
    - Condition baseline derived from `verifiedConditionScore.avg` or mapped from plain condition text.
    - Composite `gradeScore` = average of highlighted facet grades blended 50/50 with condition baseline.
    - `gradeSignals` JSON stores `facetGrades`, `highlightedFacets`, `verifiedFacetCount`, `conditionBaseline`, `gradeMeta` (if a grading facet exists), `isPremium`, `specialClass`.
    - `facets` column stores the raw facet array pulled from `Listing.facets`.
    - `searchableText` concatenates title, gist, description, condition notes, brand/model, tags, and facet labels.
- **API integration**
  - `app/api/listings/create/route.ts` – reindexes after creating the draft listing.
  - `app/api/listings/[id]/route.ts` – accepts `highlightedFacets` field and reindexes after PATCH.
  - `app/api/listings/[id]/analyze/route.ts` – reindexes after AI analysis writes fields.
  - `app/api/listings/[id]/reanalyze/route.ts` – reindexes after alternate selection.
  - `app/api/listings/[id]/profit/route.ts` – reindexes after purchase-price updates (profit changes can affect ranking).
  - `app/api/listings/[id]/upgrade-premium/route.ts` – reindexes when a listing is promoted to premium.
  - `app/api/photos/upload/route.ts` – reindexes when the quick condition check adds notes.
  - `app/api/photos/[id]/verify/route.ts` – reindexes after verification updates facets/condition/price uplifts.
- **Backfill script ready**
  - Scripts directory contains `scripts/backfill-search-index.ts` (DeepAgent generated). For fresh environments:
    ```bash
    npx prisma migrate deploy
    npx tsx --require dotenv/config scripts/backfill-search-index.ts
    ```
- **Lint/build status**
  - `npm run lint` ➜ passes (existing `react-hooks/exhaustive-deps` warning still present in `listing-detail.tsx`).
  - `npm run build` ➜ passes.

## How to Use From Here

1. Any time listing data or facet verification changes, call `reindexListing(listingId)` to keep the cache hot.
2. Use `SearchIndex` for buyer search endpoints (`gradeScore`, `gradeSignals.facetGrades`, `searchableText`).
3. When adding UI for sellers to pick showcased facets, write the array to `Listing.highlightedFacets`. The indexer will clamp the composite score to only those facets (fallback = all available facets).
4. If you introduce new facet categories or statuses, adjust the weight/multiplier maps in `lib/search-index.ts`.
5. For grading systems (PSA, CGC, etc.), store them as facet entries; `extractGradeMeta` will pick the first facet whose name includes “grade/graded”.

## Open Questions / Next Steps

- Buyer search UI is not part of this branch; integrate it once the marketplace branch is ready.
- Consider surfacing `gradeSignals` in the listing detail API response so the front end can show per-facet grades.
- No messaging/notifications tied to grading yet; telemetry is in place but remains unused for ranking tweaks.
- Geo search is stubbed (`geoHash` column exists but remains null). Populate it once we add geocoding.

Ping me if you need walkthroughs on the facet weighting or want to adjust the composite grade formula. Everything else should be plug-and-play for DeepAgent’s marketplace work. 
