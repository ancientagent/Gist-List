## Pass A: GISTer AI Assistant Upgrade (Framework)

**Status**: ✅ Implementation Complete | ⚠️ Local Testing In Progress

**Team**:
- Design: GPT-5 Web Model
- Implementation: GPT-5 Codex Medium (Cursor Agent)
- Setup/Troubleshooting: Claude Code

**Features Implemented**:
- Added section-scoped chips and INSIGHT type wiring
- Extended notification payloads with `section`, `mood`, `context` (in `actionData`)
- Introduced mood engine and tone tooltips (8 personas)
- Added Quick Facts panel (UI stub only)
- Feature flags enabled by default for testing

**Technical Changes**:
- Created `src/notifications/types.ts` - Core type definitions for Pass A
- Created `src/notifications/moods.ts` - 8 persona mood engine
- Created `src/notifications/flags.ts` - Feature flags (pebbles, moodAvatars)
- Created `src/components/ChipsRow.tsx` - Section-scoped chips UI
- Created `src/components/QuickFactsPanel.tsx` - Buyer disclosure panel
- Updated `app/listing/[id]/_components/listing-detail.tsx` - Integrated chips
- Updated `app/api/listings/[id]/analyze/route.ts` - INSIGHT type backend
- Fixed TypeScript error in `app/api/user/costs/route.ts:66` - Added explicit type annotation

**Setup & Configuration**:
- Environment: WSL2, Node v20.19.5
- Dependencies: Installed with `npm install --legacy-peer-deps`
- Prisma: Generated client with WSL2 path workarounds
- Database: Optimized connection parameters for hosted PostgreSQL
- Build: Cleared Next.js cache for Prisma updates

**Known Issues**:
- ~~Database connection from WSL2 has 20-30 second latency~~ ✅ RESOLVED: Now using local Docker PostgreSQL
- Prisma client path resolution requires manual copy in WSL2
- ~~Signup/signin slow in local environment~~ ✅ RESOLVED: Local database provides <1s response times
- ~~Only ALERT notifications showing as chips~~ ✅ RESOLVED: All 4 types now render properly
- ~~Photo requests showing as blue QUESTION notifications~~ ✅ RESOLVED: Created PHOTO type with purple styling
- ~~ALERT used for optimization tips~~ ✅ RESOLVED: Reclassified to proper types (ALERT reserved for required actions only)

**Documentation Added**:
- `/docs/LOCAL_SETUP.md` - Complete local development setup guide
- `/docs/TEAM_WORKFLOW.md` - Team roles and handoff process
- Updated `/docs/overview/CHANGELOG.md` - This file
- Updated `/docs/INDEX.md` - Added references to new docs

**Testing Status**:
- Local dev server: ✅ Running on http://localhost:3000
- TypeScript compilation: ✅ Passing
- Database connection: ✅ Local PostgreSQL running (<100ms queries)
- Docker setup: ✅ Complete and operational
- Founder testing: ✅ Ready for Pass A testing

**Next Steps**:
- Complete Docker PostgreSQL setup for local testing
- Test Pass A features with fast local database
- Founder approval of Pass A features
- Begin Pass B design and implementation
- DeepAgent deployment of Sweep B

**Docker Setup Completed** (2025-10-10):
- Docker Desktop installed and WSL2 integrated ✅
- Docker permissions verified and working ✅
- PostgreSQL 15 container running (gister_postgres) ✅
- Database initialized with 10 tables ✅
- Environment configured for local database ✅
- Dev server running with <1 second database queries ✅
- Backup of hosted DB config saved to `.env.hosted` ✅

**Local Database Details**:
- Container: gister_postgres (PostgreSQL 15)
- Connection: localhost:5432
- Database: gister_dev
- Tables: AINotification, Account, Listing, Photo, PlatformData, Session, Subscription, User, UserChip, VerificationToken
- Performance: <100ms queries (vs. 20-30s with hosted DB)

**Notification System Revamp Completed** (2025-10-10):
- Added PHOTO notification type (purple, camera icon) ✅
- Reclassified all notifications to proper types ✅
- Updated notification counter to show all 4 types ✅
- Integrated chip bin with all non-PHOTO notifications ✅
- Added field scrolling and purple ring highlighting ✅
- Implemented bullet list formatting for description field ✅
- Created comprehensive test data (4 listings, 41 notifications) ✅

### Sweep B Progress

**Slice 1 – Pricing Ladder + Quick Facts (2025-10-11)**
- Implemented percentile pricing ladder (`NEW_med` → `PARTS_med`) with clamps and optional nudges
- Added shared ladder utilities (`src/lib/priceLogic.ts`) consumed by API + UI
- Auto-generated price chips when deviation ≥15%
- Replaced legacy Quick Facts stub with modal that
  - Inserts "Comes with" / "Missing" / "Inoperable" lines
  - Flips condition to "For parts / not working" and reprices
  - Persists selections per user + category via localStorage

**Slice 2 – Purple PHOTO Workflow (2025-10-11)**
- Extended `Photo` model with status, requirement, facet metadata, analysis JSON, `verifiedAt`
- New `/api/photos/[id]/verify` endpoint performs quality checks (resolution, lighting, blur) and triggers AI condition analysis
- `app/api/photos/upload` captures requirement/facet context and links photos to notifications
- `NotificationList` now handles capture/upload inline with retry guidance and success toasts
- Resolved notifications automatically + appended verified findings to Condition Assessment
- Photo gallery surfaces verification badges, summaries, and rejection reasons

**Slice 3 – Verified Condition Report (2025-10-11)**
- Aggregated accepted photo scores into `Listing.verifiedConditionScore` (surface/function/clean/complete + avg)
- Condition Report card in `listing-detail.tsx` displays badge, progress bars, verified price band, and respects `userPreferences.conditionReportMode`
- Pricing logic tightens chip deviation threshold to ±7% when verified data present and reuses ladder helpers
- Prisma schema + migration: added `verifiedCondition` / `verifiedConditionScore` JSON fields alongside existing listing data

**Slice 4 – Premium Specials & Roadshow Reveal (2025-10-11)**
- `/api/photos/[id]/verify` deduplicates photo facets, infers `specialClass`, calculates capped price uplifts, and toggles new `Listing.isPremiumItem`
- Added `applyPremiumUplift` helper in `src/lib/priceLogic.ts` to blend ladder suggestions with premium percentages (skip parts condition, clamp to +20%)
- `listing-detail.tsx` now surfaces a special item banner, Roadshow Reveal card (baseline vs verified value, facet contributions, Quality Verification Pack CTA), and price chips that honour premium uplifts
- `premium-packs-section.tsx` highlights special items and encourages upgrade to unlock the reveal
- Prisma migration `20251011161045_add_is_premium_item` introduces boolean column for premium detection

**Slice 5 – Telemetry & Analytics (in progress)**
- Added `TelemetryEvent` model + migration `20251011173000_add_telemetry_events`.
- Backend emits `photo_request`, `photo_uploaded`, `photo_verified`, `condition_verified`, `facet_value_computed`, and `price_updated` events.
- Events log via `lib/telemetry.ts`; failures are non-blocking. Client-side notification/chip instrumentation remains outstanding.

**Notification Type System**:
- 🔴 **ALERT** (red, AlertCircle) - Required fields and photo quality issues only
- 🟣 **PHOTO** (purple, Camera) - Photo requests, triggers camera navigation
- 🟡 **INSIGHT** (amber, Lightbulb) - Optimization tips and suggestions
- 🔵 **QUESTION** (blue, HelpCircle) - Clarifications and questions

**Chip Bin Behavior**:
- PHOTO notifications: Navigate to `/camera` with listing ID and requirement
- Other notifications: Scroll to field + open chip bin
- No specific field: Add to description as bullet list
- Field highlighting: Purple ring on focused field

**Test Data Available**:
- test-listing-1: Vintage doll (doll mood) - 10 notifications
- test-listing-2: Tech item (tech mood) - 10 notifications
- test-listing-3: Luxury item (luxury mood) - 10 notifications
- test-listing-4: Historic artifact (historic mood) - 11 notifications

