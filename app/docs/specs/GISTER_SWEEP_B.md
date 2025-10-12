# GISTer Sweep B - Specification

**Date**: October 11, 2025
**Status**: Implementation Phase
**Branch**: `feature/gister-notifications-revamp`

---

## Overview

Sweep B enhances the GISTer notification system with intelligent pricing, condition verification, and photo quality workflows. This builds on the foundation from the October 10th session that established context-aware notifications, platform-specific fields, and the smart chip system.

---

## Objectives

1. **Pricing Ladder Logic** - Market-based pricing with condition-aware suggestions
2. **Quick Facts Panel** - Streamlined condition disclosure (Comes with / Missing / Inoperable)
3. **Photo Verification Workflow** - Quality checks and facet identification for Special Items
4. **Enhanced Type Safety** - Strict TypeScript typing across notification system
5. **Telemetry Integration** - Track user interactions for AI learning

---

## Feature 1: Pricing Ladder Logic

### Concept

Replace static multipliers with real market data bands that respect condition hierarchy:
- **New** ≥ Like New ≥ Very Good ≥ Good ≥ Fair ≥ Poor ≥ For Parts
- Poor should be ≥ 1.2× Parts price (salvage premium)
- Parts price comes from median "For Parts" sales

### Implementation Requirements

#### Data Structure
```typescript
interface PriceBands {
  brandNew: number | null;      // PARTS_new_median
  usedQ90: number | null;        // PARTS_used_q90
  usedQ50: number | null;        // PARTS_used_q50 (median)
  usedQ10: number | null;        // PARTS_used_q10
  forParts: number | null;       // PARTS_parts_median
}
```

#### Mapping Logic
```typescript
// Condition → Price Band
'New' → brandNew
'Like New' → usedQ90
'Very Good' → usedQ50
'Good' → usedQ10
'Fair' → (usedQ10 + forParts) / 2
'Poor' → max(forParts * 1.2, Fair * 0.8)
'For Parts' → forParts
```

#### Validation Rules
1. **Monotonic Constraint**: Each tier ≤ tier above
2. **Salvage Premium**: Poor ≥ 1.2× Parts
3. **Fallback**: If band is null, use nearest available tier

#### Price Suggestion Notification

**Trigger**: User's price deviates ≥15% from suggested ladder price

**Display**:
```
💡 Set $X (↑/↓)
```
- Shows in INSIGHT lane (amber)
- Appears dynamically when condition or price changes
- Tapping applies suggested price immediately

**Example**:
```typescript
// User set price: $50
// Suggested for "Very Good": $65
// Deviation: 23%
// Notification: "💡 Set $65 (↑)"
```

### Acceptance Criteria

- [ ] Like New ≤ New
- [ ] Poor ≥ 1.2× Parts
- [ ] Parts = PARTS_parts_median
- [ ] "Set $X (↑/↓)" chip appears when deviation ≥15%
- [ ] Tapping chip applies price and resolves notification
- [ ] Price recalculates when condition changes

---

## Feature 2: Quick Facts Panel

### Concept

Replaces generic "buyer disclosure" notifications with structured condition assessment UI:
- **Comes with**: Accessories/items included
- **Missing**: Expected items not present
- **Inoperable**: Defects that drop condition to "For Parts"

### UI Components

#### Trigger
- Tap "Quick Facts" chip in Condition section
- Or tap buyer_disclosure notification

#### Panel Layout
```
┌─────────────────────────────────────┐
│  Quick Facts                    [X] │
├─────────────────────────────────────┤
│                                     │
│  Comes with:                        │
│  [Chip] [Chip] [Chip]               │
│  [...AI-suggested items]            │
│                                     │
│  Missing:                           │
│  [Chip] [Chip] [Chip]               │
│  [...AI-detected missing items]    │
│                                     │
│  Inoperable:                        │
│  [Chip] [Chip] [Chip]               │
│  [...AI-detected issues]            │
│                                     │
│  [+ Custom]                         │
│                                     │
└─────────────────────────────────────┘
```

#### Behavior

**Comes with / Missing**:
- Tap chip → Inserts into `conditionNotes` as:
  - `Comes with: [item]`
  - `Missing: [item]`
- Toast: "Detail added to condition assessment"
- Panel stays open for multiple selections

**Inoperable**:
- Tap chip → Inserts: `Inoperable: [issue] (sold for parts).`
- **Auto-flips condition** to "For Parts"
- **Auto-reprices** to Parts ladder price
- Toast: "Condition updated for inoperable item"
- Panel closes

**AI Smart Filtering**:
- Omits items visible in photos from "Missing" chips
- Uses category context (e.g., "remote" for electronics, "box" for collectibles)
- Pre-populates based on listing description analysis

### Data Format

Notification `actionData`:
```json
{
  "detectedIssues": ["Battery cover missing", "Screen scratches"],
  "missingCandidates": ["Original box", "Manual", "Charger"],
  "presentItems": ["Cable", "Case"],
  "inoperableReasons": ["Won't power on", "Cracked screen", "Water damage"],
  "section": "condition"
}
```

### Acceptance Criteria

- [ ] Quick Facts chip appears in Condition section
- [ ] Panel opens with AI-suggested chips
- [ ] "Comes with" inserts correctly
- [ ] "Missing" inserts correctly
- [ ] "Inoperable" flips condition to "For Parts" + reprices
- [ ] Items visible in photos excluded from Missing chips
- [ ] Multiple selections allowed before closing
- [ ] Custom text entry supported

---

## Feature 3: Photo Verification Workflow

### Concept

Premium feature for Special Items that:
1. Analyzes uploaded photos for quality
2. Identifies facets (Authentication, Condition, Rarity, Provenance, Completeness)
3. Auto-generates condition assessment text
4. Updates value estimate based on verified facets

### Workflow Steps

#### Step 1: Photo Upload Trigger
- User taps PHOTO notification (purple)
- Camera/Upload dialog appears
- User captures/uploads photo

#### Step 2: Quality Check
**Endpoint**: `POST /api/photos/verify`

```typescript
interface PhotoQualityCheck {
  isAcceptable: boolean;
  qualityScore: number; // 0-100
  issues: string[];     // ['Too dark', 'Out of focus', 'Angle not ideal']
  facetsDetected: Facet[];
  conditionAssessment: string | null;
}
```

**Rejection Flow**:
- If `isAcceptable: false`:
  - Show feedback dialog with issues
  - "Retake" or "Use Anyway" options
  - Log rejection reason for telemetry

#### Step 3: Facet Identification

**The Five Facets**:
1. **Authentication** - Holograms, serial numbers, signatures, certificates
2. **Condition** - Wear, paint integrity, structural soundness
3. **Rarity** - Limited edition markers, variants, production info
4. **Provenance** - Original packaging, manuals, certificates
5. **Completeness** - All expected accessories present

**Output**:
```typescript
interface Facet {
  type: 'authentication' | 'condition' | 'rarity' | 'provenance' | 'completeness';
  description: string;
  confidence: number; // 0-1
  valueImpact: 'high' | 'medium' | 'low';
}
```

#### Step 4: Condition Assessment Generation

AI generates natural language description:
```
"Visible wear on edges, minor scuffs on back panel. Screen is pristine with no scratches. Serial number visible and matches authentic format. Includes original box with some shelf wear."
```

#### Step 5: Auto-Append to Description

- Assessment text auto-inserted into `conditionNotes`
- User can edit/remove if desired
- Notification resolves automatically

#### Step 6: Value Recalculation

Based on verified facets:
```typescript
// Example multipliers
baseValue * (
  1.0 +
  (hasAuthentication ? 0.3 : 0) +
  (hasOriginalPackaging ? 0.15 : 0) +
  (isRare ? 0.4 : 0) +
  (hasCompleteness ? 0.2 : 0) +
  (conditionFactor) // -0.2 to +0.2
)
```

### Premium Badge

- Photo verification only available for Premium listings
- Shows "🌟 Facets Verified" badge on listing
- Buyers see confidence scores for each facet

### Acceptance Criteria

- [ ] Photo quality check rejects poor images
- [ ] Feedback dialog shows specific issues
- [ ] Facets identified correctly (manual spot check on 10 test items)
- [ ] Condition assessment is natural and accurate
- [ ] Assessment auto-appends to conditionNotes
- [ ] Value recalculates based on facets
- [ ] "Facets Verified" badge displays on Premium listings
- [ ] Notification resolves after successful verification

---

## Feature 4: Enhanced Type Safety

### Notification Type System

```typescript
// Core notification types
type NotificationType = 'ALERT' | 'PHOTO' | 'INSIGHT' | 'QUESTION';

type ActionType =
  | 'fill_field'
  | 'add_detail'
  | 'add_photo'
  | 'retake_photo'
  | 'buyer_disclosure'
  | 'quickFacts'
  | 'setPrice'
  | 'inoperable_check';

type SectionType = 'photos' | 'condition' | 'price' | 'shipping' | 'fineDetails';

type MoodType = 'neutral' | 'cautionary' | 'encouraging' | 'urgent';

interface GisterNotification {
  id: string;
  type: NotificationType;
  message: string;
  actionType: ActionType;
  actionData: Record<string, unknown> | null;
  field: string | null;
  section: SectionType;
  mood: MoodType;
  context?: string;
  resolved: boolean;
}
```

### Export Requirements

- `notification-list.tsx` exports `Notification` interface
- `notification-list.tsx` exports `QuickFactsPayload` interface
- All notification handlers properly typed
- No `any` types in notification flow

### Acceptance Criteria

- [ ] TypeScript builds without errors
- [ ] No `any` types in notification components
- [ ] All notification props properly typed
- [ ] ESLint passes with strict rules

---

## Feature 5: Telemetry Integration

### Event Tracking

Track user interactions for AI learning:

```typescript
interface TelemetryEvent {
  userId: string;
  listingId: string;
  eventType: 'notification_tap' | 'chip_select' | 'price_accept' | 'photo_reject' | 'quickfacts_insert';
  metadata: Record<string, unknown>;
  timestamp: Date;
}
```

### Key Events

1. **Notification Interaction**
   - Which notification was tapped
   - Which chip was selected
   - Custom text entered vs chip selection ratio

2. **Price Suggestions**
   - Suggested price vs user's original
   - Accept/reject rate
   - Final price chosen

3. **Photo Quality**
   - Rejection reasons
   - "Use Anyway" rate
   - Quality scores distribution

4. **Quick Facts**
   - Which chips selected most often
   - Category-specific patterns
   - Custom entries vs AI suggestions

### Database Schema

```sql
CREATE TABLE telemetry_events (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  listing_id UUID NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_telemetry_user ON telemetry_events(user_id);
CREATE INDEX idx_telemetry_listing ON telemetry_events(listing_id);
CREATE INDEX idx_telemetry_event_type ON telemetry_events(event_type);
```

### Privacy

- No PII in metadata
- User can opt-out in settings
- Data aggregated for analysis, not sold
- 90-day retention window

### Acceptance Criteria

- [ ] Events logged for all key interactions
- [ ] Database schema created
- [ ] Privacy-compliant (no PII)
- [ ] Dashboard to view telemetry (admin only)

---

## Integration with Existing Foundation

### From October 10th Session

**Already Built**:
- ✅ Context-aware notification system (4 types)
- ✅ Smart chip bin with option parsing
- ✅ Platform-specific fields (9 platforms)
- ✅ Multi-entry chip foundation
- ✅ Locals-only shipping filter
- ✅ Facets framework documented

**Sweep B Builds On**:
- Pricing ladder → Uses `priceBands` field, adds validation
- Quick Facts → Extends buyer_disclosure notifications
- Photo verification → Implements PHOTO workflow from docs
- Type safety → Strengthens existing components
- Telemetry → Adds learning layer to all interactions

### File Modifications

**Backend**:
- `/api/listings/[id]/analyze` - Generate pricing/quickfacts notifications
- `/api/photos/verify` - New endpoint for quality check + facets
- `/api/telemetry/track` - New endpoint for event logging

**Frontend**:
- `listing-detail.tsx` - Pricing ladder integration, quickfacts handler
- `notification-list.tsx` - Type exports, quickfacts routing
- `smart-chip-bin.tsx` - Telemetry hooks on chip selection
- `QuickFactsPanel.tsx` - New component (or extend existing)

**Database**:
- `Listing` model - Add `ladderStats: PriceBands?`
- `AINotification` - Add `mood: String?`
- `TelemetryEvent` - New table

---

## Testing Checklist

### Pricing Ladder

- [ ] Load listing with market data → ladder prices populate
- [ ] Change condition → suggested price updates
- [ ] User price deviates 15%+ → "Set $X" notification appears
- [ ] Tap "Set $X" chip → price applies, notification resolves
- [ ] Verify Poor ≥ 1.2× Parts in all cases
- [ ] Verify monotonic constraint (no tier exceeds tier above)

### Quick Facts

- [ ] Tap "Quick Facts" chip → panel opens
- [ ] AI chips pre-populated from analysis
- [ ] Tap "Comes with" chip → inserts into conditionNotes
- [ ] Tap "Missing" chip → inserts into conditionNotes
- [ ] Tap "Inoperable" chip → condition flips to "For Parts" + reprices
- [ ] Multiple selections work before closing
- [ ] Custom text entry works
- [ ] Items in photos excluded from Missing suggestions

### Photo Verification

- [ ] Upload blurry photo → rejected with feedback
- [ ] Upload clear photo → accepted, facets detected
- [ ] Condition assessment auto-appends to conditionNotes
- [ ] Value recalculates based on facets
- [ ] "Facets Verified" badge shows on listing
- [ ] Notification resolves after successful verification
- [ ] "Retake" option works on rejection
- [ ] "Use Anyway" option works on rejection

### Type Safety

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] No TypeScript errors in console
- [ ] No `any` types in notification flow

### Telemetry

- [ ] Events logged on notification tap
- [ ] Events logged on chip selection
- [ ] Events logged on price suggestion accept/reject
- [ ] Events logged on photo quality checks
- [ ] Dashboard shows event counts (admin)
- [ ] User can opt-out in settings

---

## Success Metrics

### User Engagement
- **Notification Resolution Rate**: % of notifications resolved vs dismissed
- **Chip Selection Rate**: % chip selections vs custom text
- **Price Suggestion Acceptance**: % of suggested prices accepted
- **Photo Rejection Rate**: % of photos rejected vs accepted

### AI Quality
- **Pricing Accuracy**: User final price within 10% of suggestion
- **Quick Facts Relevance**: % of AI chips selected vs custom entries
- **Photo Quality Precision**: False positive/negative rate on quality checks
- **Facet Identification Accuracy**: Manual validation on sample set

### Business Impact
- **Premium Conversion**: % of users upgrading for photo verification
- **Listing Completion Time**: Average time to publish listing
- **User Satisfaction**: Survey score after using Quick Facts/Photo features

---

## Rollout Plan

### Phase 1: Backend Foundation (Week 1)
- Implement pricing ladder logic
- Create photo verification endpoint
- Add telemetry infrastructure
- Update database schema

### Phase 2: Frontend Integration (Week 1-2)
- Integrate pricing ladder into listing detail
- Build Quick Facts panel
- Wire up photo verification flow
- Add telemetry hooks

### Phase 3: Testing & QA (Week 2)
- Run through testing checklist
- Manual QA on 20 test listings
- Fix bugs and edge cases
- Performance optimization

### Phase 4: Beta Release (Week 3)
- Release to 10% of Premium users
- Monitor telemetry and error rates
- Gather user feedback
- Iterate on UX issues

### Phase 5: Full Release (Week 4)
- Roll out to all users
- Announce new features
- Update documentation
- Monitor success metrics

---

## Known Limitations

### Pricing Ladder
- Requires market data from external API
- Falls back to multipliers if data unavailable
- May not have data for rare/niche items

### Quick Facts
- AI suggestions limited by item category coverage
- Custom entries needed for unusual items
- Cannot detect all visible items in photos (AI vision limits)

### Photo Verification
- Quality checks are heuristic, not perfect
- Facet identification requires clear, well-lit photos
- Some rare collectibles may not match training data
- Premium feature only (business decision)

### Telemetry
- Opt-out reduces data for AI learning
- Cannot track behavior outside app
- Aggregated data may not capture edge cases

---

## Future Enhancements (Post-Sweep B)

1. **Conversational AI Layer**
   - Multi-turn dialogue instead of one-shot notifications
   - Follow-up questions based on answers
   - Natural language instead of structured chips

2. **Buyer-Side Features**
   - GISTer agent search with criteria matching
   - Seller notifications of buyer interest
   - Negotiation based on verified facets

3. **Advanced Photo Analysis**
   - Real-time quality feedback during capture
   - Video support for 360° views
   - Defect highlighting with arrows/annotations

4. **Market Intelligence**
   - Demand forecasting by category
   - Competitor pricing alerts
   - Best time to list recommendations

5. **Platform Optimization**
   - Auto-suggest best platforms for item
   - Cross-post scheduling
   - Performance analytics per platform

---

## References

- **Foundation Docs**:
  - `docs/IMPLEMENTATION_STATUS_FOR_PM.md` - Current state
  - `docs/SPECIAL_ITEMS_FEATURE.md` - Facets framework
  - `docs/CONTEXT_AWARE_CHIPS.md` - Chip system principles
  - `docs/HANDOFF_2025_10_10.md` - Session handoff

- **Code Files**:
  - `app/listing/[id]/_components/notification-list.tsx`
  - `app/listing/[id]/_components/smart-chip-bin.tsx`
  - `app/listing/[id]/_components/listing-detail.tsx`
  - `src/lib/priceLogic.ts`
  - `src/notifications/types.ts`

- **API Routes**:
  - `/api/listings/[id]/analyze`
  - `/api/notifications/[id]/resolve`

---

**Document Version**: 1.0
**Last Updated**: October 11, 2025
**Author**: Claude Code
**Status**: Ready for Implementation
