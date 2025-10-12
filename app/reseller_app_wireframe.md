# GISTer Upgrade Sweep B — Pricing, Premium, and Photo Intelligence

## Header (for GPT‑5 Medium Agent)

```
# GISTer AI Assistant Upgrade — Sweep B (Brains + Premium + Visuals)

Continue on branch feature/gister-notifications-revamp.

Implement Sweep B exactly as specified below.  Deliverables include all Pricing / Condition logic, Premium 💎 / 🔍 handling, Verified Condition Report, and new Photo (Purple) Notification class.

Feature flags (enabled for testing):
  premium.enabled = true
  priceLadder.enabled = true
  moodAvatars.enabled = true
  conditionReport.enabled = true
  photoNotifications.enabled = true

Run and include build logs:
  npm ci && npm run typecheck && npm run lint && npm run build

Commit as:
  feat(gister): pricing ladder + Quick Facts logic + Special/Faceted + Verified Condition + Photo notifications
```

---

## Sweep B Specification + Addendum

### 1️⃣ Pricing & Condition Ladder

- Implement percentile‑based ladder: New = `NEW_med`, Like New = `min(USED_q90, 0.98×NEW_med)`, Very Good ≈ q80, Good = USED\_q50, Fair ≈ q25, Poor = max(USED\_q10, 1.2×PARTS\_med)\`, Parts = PARTS\_med.
- Clamp used conditions to [USED\_q10 … max(NEW\_med, USED\_q90)].
- Apply tiny nudges (box/manual ± 5%) but respect caps. - 💡 Price chips appear when user price differs ≥ 15 %. - Integrate verified condition score to tighten band ± 7 % when photos validated.

### 2️⃣ Verified Condition Report

- Add `verifiedConditionScore` (surface, function, clean, complete) and derived `verifiedCondition` (New / Like New / Good / Fair / Poor / Parts).
- Requires multi‑photo set (front/back/sides + serial).
- Display 💡 **Verified {{condition}} – Set \${{suggested}}?** chip.
- Show badge **GISTer Verified Condition** when score available.
- Preference prompt (All / Premium only / Off) stored in `userPreferences.conditionReportMode`.

### 3️⃣ Premium Special 💎 / Faceted 🔍

- Create schema fields `isPremiumItem`, `specialClass`, `facets[]`, `priceUplifts`.
- 💎 **Special item detected** → apply +5 – 12 % uplift (capped, total ≤ +20 %).
- 🔍 **Faceted: {{facetName}}** → apply +3 – 15 % uplift (capped); insert description line.
- ❓ **Check for {{facetName}}?** → request close‑up photo; on confirm upgrade to 🔍.
- Remove premiums if condition = Parts.
- Merge facet categories (Authentication, Condition, Rarity, Provenance, Completeness) with valuation weights.

### 4️⃣ Photo (Purple) Notification Class

- Implement 5‑step workflow: 1. Request (photo needed → purple chip) 2. Capture (camera opens) 3. Quality check (focus / lighting / angle) 4. AI analysis (link photo → facet / condition) 5. Resolve (append finding + dismiss notification)
- Allow accept/retry; mark `photo.status` as accepted/rejected.
- Each photo creates a `Photo` record linked to `AINotification` with `verificationReason` (facet or condition).
- Update UI to show Purple chips in Photos section alongside ❗/❓/💡.

### 5️⃣ Premium Tiering & Upgrade Prompt

- Two tiers: 1. **Special Recognition Pack** – access to 💎 / 🔍 features + purple photo requests. 2. **Quality Verification Pack** – adds Verified Condition Report + Value Reveal.
- After facet verification, show “Roadshow Reveal” card with before/after value and optional upgrade CTA.

### 6️⃣ Schema and API Changes

- Extend `Listing` with `photos[]`, `verifiedConditionScore`, `verifiedCondition`, `specialClass`, `facets[]`, `priceUplifts`.
- Create `Photo` table:
  - id (uuid)
  - listingId (fk)
  - url, facetTag, status (pending/accepted/rejected)
  - analysisData (JSON)
  - createdAt / updatedAt
- `/api/photos/[id]/verify` endpoint to mark accepted/rejected and trigger facet analysis.

### 7️⃣ Telemetry & Analytics

- Extend events: `photo_request`, `photo_uploaded`, `photo_verified`, `facet_value_computed`, `condition_verified`.
- Log price delta before/after verification.

### 8️⃣ Docs & QA

- Update `docs/INDEX.md` and `docs/overview/CHANGELOG.md` with Sweep B summary.
- Append new tests to `/docs/QA/GISTER_TEST_PLAN.md` for:
  - Purple photo chips flow
  - Facet verification scoring
  - Value reveal UI
  - Verified Condition Report preferences

---

## Acceptance Criteria

✅ Percentile ladder replaces old multipliers and respects caps.\
✅ Verified Condition Report produces consistent scores and badges.\
✅ Purple Photo notifications function end‑to‑end (request→capture→verify→resolve).\
✅ Premium 💎/🔍 chips appear only when data supplied; uplifts ≤ 20 %.\
✅ “Roadshow Reveal” card shows value change and optional upgrade path.\
✅ Telemetry captures photo/facet events.\
✅ Docs and QA files updated.\
✅ Build and lint pass.

---

*End of Sweep B Header and Addendum*

---

## Engineer‑Facing Appendix (Implementation Details)

### A. File‑Level Task Map

**Backend (Next API)**

- `app/app/api/listings/[id]/analyze/route.ts`
  - Inject ladder stats in response (`NEW_med, USED_q10, USED_q50, USED_q90, PARTS_med`).
  - Emit **INSIGHT** price chips with `suggested` and `deltaPct`.
  - Emit **PHOTO** (purple) notifications with `requirement`, `facetTag`, `section:"photos"`.
- `app/app/api/photos/[id]/verify/route.ts` (NEW)
  - `POST { status: 'accepted'|'rejected', reason?, analysisData? }` → updates `Photo`, links to `AINotification`, optionally creates INSIGHT chips (facet/condition).
- `app/app/api/listings/[id]/route.ts`
  - Return `verifiedConditionScore`, `verifiedCondition`, `facets[]`, `photos[]` in payload.

**Frontend**

- `app/app/listing/[id]/_components/listing-detail.tsx`
  - Show section chip rows (already wired) and render Verified badge + verified price chip when available.
  - Host **Condition Report** card with 4 dimension stars and notes; honor `userPreferences.conditionReportMode`.
- `app/src/components/ChipsRow.tsx`
  - Render purple chips (PHOTO) with camera/upload action and mini helper line (requirement).
- `app/src/components/QuickFactsPanel.tsx`
  - Finalize full logic (insert one‑liners; inoperable flips condition + reprices).
- `app/app/listing/[id]/_components/notification-list.tsx`
  - Enable `allowMultiple` flow for multi‑entry notifications and wire **Done** button.

**Docs & QA**

- `docs/INDEX.md` — add Pricing Ladder, Photo Workflow, Facets overview.
- `docs/QA/GISTER_TEST_PLAN.md` — add purple‑flow, value‑reveal, verified‑badge tests.

---

### B. Data Model & Migrations

**Listing** (add fields or pack into JSON if avoiding migration this sweep)

- `verifiedCondition: string | null`
- `verifiedConditionScore: { surface:number, function:number, clean:number, complete:number, avg:number } | null`
- `specialClass: 'vintage'|'collectible'|'antique'|'luxury'|'custom'|'art' | null`
- `facets: Array<{ name:string, status:'present'|'likely'|'absent', confidence:number }> | null`
- `priceUplifts: { special?:number, facets?:number } | null`

**Photo** (NEW)

- `id, listingId, url`
- `facetTag?: string`  // e.g., 'serial\_number','hallmark','revA\_board'
- `status: 'pending'|'accepted'|'rejected'`
- `analysisData: Json`  // quality checks + condition notes
- `createdAt, updatedAt`

**AINotification** (no migration required if using actionData JSON)

- Persist `section`, `mood`, `context` inside `actionData`.
- For purple: `actionData.requirement`, `facetTag`.

*Migration note*: If Prisma migration is deferred, store new fields as JSON blobs; otherwise add proper columns.

---

### C. Purple PHOTO State Machine

1. **Requested** → user taps → **Capture** (camera/upload)
2. **Captured** → server quality/accuracy check
   - Fail → **Rejected** (show tips; allow retry)
   - Pass → **Accepted** → run analysis → emit condition/facet INSIGHT
3. **Resolved** → append condition text → dismiss notification

**Quality checks**: focus, lighting, framing, subject match.\
**Analysis**: extract facet evidence and condition notes; attach to `analysisData`.

---

### D. Pricing Ladder Integration (Computations)

- Compute base suggestion from ladder by selected/verified condition.
- Optional nudges: +3–5% (box/manual), −5–10% (missing PSU), then clamp.
- Verified band: tighten to ±7% when `verifiedConditionScore` present.
- Price chip emit rule: `abs((userPrice−suggested)/suggested) ≥ 0.15`.

---

### E. Facet Valuation & “Roadshow Reveal”

- Maintain per‑facet weight table per category (Authentication, Condition, Rarity, Provenance, Completeness).
- Compute `facetPremium = clamp(sum(weights), 0, 0.20)`; combine with Special uplift, obey total cap 20% over used band.
- Show **Reveal card**: baseline vs verified range, list verified facets, CTA to upgrade if Verification Pack locked.

---

### F. Telemetry Payloads

- `photo_request { listingId, facetTag }`
- `photo_uploaded { listingId, photoId, facetTag }`
- `photo_verified { listingId, photoId, status, reason? }`
- `facet_value_computed { listingId, premiumPct, facets:[{name,weight}] }`
- `condition_verified { listingId, verifiedCondition, avg }`
- `price_updated { listingId, old, new, reason }`

Batch send every 30s; dedupe client‑side.

---

### G. QA Deltas (add to test plan)

- Purple flow: reject → retry → accept path; verify appended condition text.
- Verified badge gating: requires required photo set + scores present.
- Value cap: premiums never exceed +20%; Like‑New ≤ New; Poor ≥ 1.2× Parts.
- Extras tabs: ensure **only site‑specific extras** appear; no Master Field duplication.

---

### H. Feature Flags & Defaults

- Testing ON: `premium.enabled, priceLadder.enabled, conditionReport.enabled, photoNotifications.enabled`.
- Ship default: you may gate `premium.enabled` to selected users.

---

### I. Example Payloads

**INSIGHT price chip**

```json
{ "type":"INSIGHT", "message":"Set $95 (↓)", "actionData": { "section":"price", "suggested":95, "deltaPct":0.22 } }
```

**PHOTO notification**

```json
{ "type":"PHOTO", "message":"Add close‑up of serial number tag", "actionData": { "section":"photos", "requirement":"serial_tag_macro", "facetTag":"serial_number" } }
```

**Facet verified**

```json
{ "name":"Rev A board", "status":"present", "confidence":0.91 }
```

---

This appendix is designed so an engineer can implement Sweep B end‑to‑end without guessing, while leaving code generation to the agent.



---

## J. Prisma Migration + API Contract Snippets

### Prisma Schema Additions (for reference)

```prisma
model Listing {
  id                     String   @id @default(cuid())
  title                  String
  // existing fields …
  verifiedCondition      String?  @db.VarChar(50)
  verifiedConditionScore Json?
  specialClass           String?  @db.VarChar(50)
  facets                 Json?
  priceUplifts           Json?
  photos                 Photo[]
}

model Photo {
  id             String   @id @default(cuid())
  listingId      String
  listing        Listing  @relation(fields: [listingId], references: [id])
  url            String
  facetTag       String?
  status         String   @default("pending") // pending, accepted, rejected
  analysisData   Json?
  verificationReason String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

### Example Migration SQL (if Prisma migrate not available)

```sql
ALTER TABLE Listing
  ADD COLUMN verifiedCondition VARCHAR(50),
  ADD COLUMN verifiedConditionScore JSON,
  ADD COLUMN specialClass VARCHAR(50),
  ADD COLUMN facets JSON,
  ADD COLUMN priceUplifts JSON;

CREATE TABLE Photo (
  id CHAR(25) PRIMARY KEY,
  listingId CHAR(25) REFERENCES Listing(id),
  url TEXT NOT NULL,
  facetTag TEXT,
  status VARCHAR(25) DEFAULT 'pending',
  analysisData JSON,
  verificationReason TEXT,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

### API Contract: `/api/photos/upload`

**POST**  `/api/photos/upload`

```json
{
  "listingId": "abc123",
  "facetTag": "serial_number",
  "file": "<multipart file>"
}
```

**Response**

```json
{
  "photoId": "p123",
  "status": "pending",
  "uploadUrl": "https://cdn.gister.ai/uploads/p123.jpg"
}
```

### API Contract: `/api/photos/[id]/verify`

**POST** `/api/photos/{id}/verify`

```json
{
  "status": "accepted",
  "reason": "good lighting",
  "analysisData": {
    "focusScore": 0.93,
    "facetDetected": true,
    "facetName": "Rev A board"
  }
}
```

**Response**

```json
{
  "id": "p123",
  "status": "accepted",
  "facet": { "name": "Rev A board", "status": "present", "confidence": 0.91 },
  "linkedNotificationId": "n456"
}
```

### API Contract: `/api/listings/[id]/photos`

**GET** `/api/listings/{id}/photos`

```json
{
  "listingId": "abc123",
  "photos": [
    { "id": "p1", "url": "https://.../p1.jpg", "status": "accepted", "facetTag": "serial_number" },
    { "id": "p2", "url": "https://.../p2.jpg", "status": "pending" }
  ]
}
```

---

These snippets act as templates—Codex can expand them to migrations or route handlers as needed without ambiguity.

