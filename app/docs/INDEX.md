# GISTer AI Assistant Upgrade — Pass A

## Quick Links
- **[Session Handoff](./HANDOFF_SESSION.md)** - Current session status and next steps
- [Local Development Setup](./LOCAL_SETUP.md) - Environment setup guide
- [Troubleshooting](./TROUBLESHOOTING.md) - Common issues and solutions
- [Team Workflow](./TEAM_WORKFLOW.md) - Team roles and development process
- [Changelog](./overview/CHANGELOG.md) - Detailed changes and status
- [QA Test Plan](./QA/GISTER_TEST_PLAN.md) - End-to-end checklist for slices 1-4
- [Telemetry Events](./TELEMETRY_EVENTS.md) - Event schema & logging touchpoints
- [Cost Tracking](../COST_TRACKING_GUIDE.md) - Usage and cost monitoring
- [External APIs](../EXTERNAL_API_SETUP.md) - API configuration

## Overview

**Status**: ✅ Pass A foundation complete | ✅ Sweep B Slices 1-4 delivered (pricing ladder, purple photo workflow, verified condition, Roadshow reveal) | 🔄 Slice 5 telemetry logging live on server (client taps pending)

Recent work layered on top of the Pass A bedrock:

- ✅ **Slice 1** – Percentile pricing ladder + fully functional Quick Facts panel
  - Ladder-driven price bands (New → Parts) with caps and nudges
  - Condition-aware price chips when deviation ≥15%
  - Quick Facts modal inserts "Comes with", "Missing", "Inoperable" lines, remembers per user/category, and flips condition to "For parts" on inoperable

- ✅ **Slice 2** – Purple PHOTO workflow
  - Upload endpoint now records requirement + facet metadata
  - `/api/photos/[id]/verify` runs quality checks (resolution, lighting, blur), triggers AI analysis, appends findings, and resolves notifications
  - Notification UI exposes requirement hints, processes files inline (camera or upload), and surfaces retry guidance when QA fails
  - Photo gallery shows verification badges, summaries, and failure reasons
- ✅ **Slice 3** – Verified condition report
  - Multi-photo scoring (surface, function, clean, complete) captured in `verifiedConditionScore`
  - Verified badge + progress bars populate the Condition Report card; price bands tighten to ±7%
  - Preferences respected (`userPreferences.conditionReportMode`) with quick chips to act on verified insights
- ✅ **Slice 4** – Premium specials & Roadshow reveal
  - Photo verification aggregates facets (Authentication, Condition, Rarity, Provenance, Completeness) into `Listing.facets`
  - Uplift engine stores `priceUplifts`, `specialClass`, and `isPremiumItem`, capping premiums at +20%
  - Roadshow Reveal card compares baseline vs verified value, highlights facet contributions, and surfaces the Quality Verification Pack CTA
  - Premium packs panel displays special-item callouts so sellers understand the upgrade path

Pass A still provides the underlying personality + notification framework:

- **4-type notification system**: Complete type hierarchy with distinct behaviors
  - 🔴 **ALERT** (red, AlertCircle) - Required fields and photo quality issues
  - 🟣 **PHOTO** (purple, Camera) - Photo requests, triggers camera
  - 🟡 **INSIGHT** (amber, Lightbulb) - Optimization tips
  - 🔵 **QUESTION** (blue, HelpCircle) - Clarifications

- **Section-scoped chip system**: All notification types organized per section
  - Photos
  - Condition
  - Price
  - Shipping
  - Fine Details

- **Smart chip bin integration**: Context-aware text entry assistance
  - Opens for all non-PHOTO notifications
  - Scrolls to relevant field with highlighting
  - Supports manual typing or chip selection
  - Bullet list formatting for description field

- **Mood engine**: 8 distinct AI personas with unique communication styles
  - Tech, Luxury, Doll, Historic, Art, Fashion, Kitsch, Neutral
  - Each persona has custom messaging and tone tooltips

- **Unified notification extensions**: Enhanced notifications with `section`, `mood`, `context`
  - Stored in `actionData` field (no DB migration required)
  - Enables intelligent, context-aware AI responses

- **Quick Facts panel**: Interactive modal (Slice 1) with memory + automatic condition updates
  - Framework in place for Pass B implementation

## Feature Flags

**Default state**: ON (for testing)

```typescript
pebbles.enabled = true
moodAvatars.enabled = true
```

## Architecture

### Core Type System
```
src/notifications/types.ts
├── NotificationType: 'ALERT' | 'QUESTION' | 'INSIGHT' | 'PHOTO'
├── ChipSection: 'photos' | 'condition' | 'price' | 'shipping' | 'fineDetails'
└── GisterMood: 'tech' | 'luxury' | 'doll' | 'historic' | 'art' | 'fashion' | 'kitsch' | 'neutral'
```

### Mood Engine
```
src/notifications/moods.ts
└── 8 persona profiles with:
    ├── Intro messages
    ├── Facet found/missing responses
    ├── Value up/down messaging
    ├── Photo prompts
    ├── Closeout messages
    ├── Avatar accessories
    └── Theme colors
```

### UI Components
```
src/components/
├── ChipsRow.tsx - Section-scoped chip rendering
├── QuickFactsPanel.tsx - Buyer disclosure panel with memory + condition flip (Slice 1)
app/listing/[id]/_components/
├── listing-detail.tsx - Main listing orchestrator (condition report, Roadshow reveal, premium banner)
├── premium-packs-section.tsx - Premium upgrade messaging and Quality Verification CTA
├── notification-list.tsx - Multi-type notification flow + purple photo workflow (Slice 2)
└── photo-gallery.tsx - Verified photo badges, analysis transcript
```

### Integration Points
```
app/
├── listing/[id]/_components/listing-detail.tsx - Main listing page with chips
└── api/listings/[id]/analyze/route.ts - Backend INSIGHT generation
```

## Key Files Reference

| File | Purpose | Team |
|------|---------|------|
| `src/notifications/types.ts` | Core type definitions | GPT-5 Codex |
| `src/notifications/moods.ts` | Mood engine personas | GPT-5 Codex |
| `src/notifications/rules.json` | Notification rules | GPT-5 Codex |
| `src/notifications/flags.ts` | Feature flags | GPT-5 Codex |
| `src/components/ChipsRow.tsx` | Chips UI component | GPT-5 Codex |
| `src/components/QuickFactsPanel.tsx` | Quick Facts panel | GPT-5 Codex |
| `app/listing/[id]/_components/listing-detail.tsx` | Listing integration | GPT-5 Codex |
| `app/api/listings/[id]/analyze/route.ts` | INSIGHT backend | GPT-5 Codex |
| `docs/LOCAL_SETUP.md` | Setup documentation | Claude Code |
| `docs/TEAM_WORKFLOW.md` | Team process | Claude Code |

## Technical Notes

### Database
- Sweep B Slice 2: `Photo` table extended (`status`, `requirement`, `facetTag`, `notificationId`, `analysisData`, `verifiedAt`).
- Sweep B Slices 3-4: `Listing` stores `verifiedCondition`, `verifiedConditionScore`, `facets`, `priceUplifts`, `specialClass`, and new boolean `isPremiumItem` (migration `20251011161045_add_is_premium_item`).
- `actionData` JSON continues to carry notification context; uploads remain JSON-first to avoid extra migrations mid-sweep.
- Development targets hosted PostgreSQL; remember to run the Prisma migrations directory after pulling latest Sweep B changes.

### Pricing Logic
- **Slice 1**: Percentile ladder replaces legacy multipliers, generating suggested prices for each condition (New → Parts) with optional box/manual nudges.
- **Slice 3**: Verified condition scoring tightens the recommendation band to ±7% and informs chips when pricing drifts.
- **Slice 4**: Premium uplift engine (`Listing.priceUplifts`, `applyPremiumUplift`) layers facet + special bonuses, capped at +20% and skipped for parts-only items.

### Testing Environments

**Local Development** (WSL2):
- URL: http://localhost:3000
- Database: Local Docker PostgreSQL (<100ms latency)
- Purpose: Feature testing and development
- Test Data: 4 listings with 41 notifications across all types

**Production**:
- URL: https://gistlist.abacusai.app
- Database: Hosted PostgreSQL (fast)
- Purpose: End-user testing

**Recommended**: Use local development for Pass A testing (fast and reliable)

## Team

### Pass A
- **Design**: GPT-5 Web Model
- **Implementation**: GPT-5 Codex Medium (Cursor Agent)
- **Setup/Testing**: Claude Code

### Pass B (Upcoming)
- **Design**: GPT-5 Web Model
- **Implementation**: GPT-5 Codex Medium (Cursor Agent)
- **Troubleshooting**: Claude Code
- **Deployment**: DeepAgent

## Next Steps

1. ✅ Pass A implementation complete
2. ✅ Docker PostgreSQL setup complete
3. ✅ Notification system revamp complete
4. 🔄 **Founder testing of Pass A features** (current step)
   - Test all 4 notification types
   - Verify chip bin integration
   - Test field scrolling and highlighting
   - Provide feedback on any needed changes
5. ⏳ Pass A approval
6. ⏳ Pass B design and implementation
7. ⏳ DeepAgent Sweep B deployment

## Getting Started

New to this project? Start here:

1. [Local Setup Guide](./LOCAL_SETUP.md) - Set up your environment
2. [Team Workflow](./TEAM_WORKFLOW.md) - Understand the development process
3. [Changelog](./overview/CHANGELOG.md) - Review what changed in Pass A
4. Test the features on http://localhost:3000 or https://gistlist.abacusai.app

