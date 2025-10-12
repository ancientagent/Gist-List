GISTer AI Assistant Upgrade — Pass A

This pass introduces:

- Section-scoped chip system (❗ Alerts, ❓ Actions, 💡 Insights) per section: Photos, Condition, Price, Shipping, Fine Details.
- Unified notification extensions: `section`, `mood`, `context` (stored in `actionData` until a DB migration).
- Persona foundation and mood engine (`src/notifications/moods.ts`) with one-line tone tooltips.
- Quick Facts panel (UI stub only) for buyer disclosures.
- INSIGHT type end-to-end: backend emit and UI lane rendering via `ChipsRow`.

Feature flags (default ON for testing):
- `pebbles.enabled = true`
- `moodAvatars.enabled = true`

Key files:
- `src/notifications/types.ts`, `src/notifications/moods.ts`, `src/notifications/rules.json`, `src/notifications/flags.ts`
- `src/components/ChipsRow.tsx`, `src/components/QuickFactsPanel.tsx`
- `app/app/listing/[id]/_components/listing-detail.tsx`
- `app/app/api/listings/[id]/analyze/route.ts`

No pricing logic changes in this pass.

