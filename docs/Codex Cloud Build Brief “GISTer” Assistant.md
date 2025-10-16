Codex Cloud Build Brief: “GISTer” Assistant (Persona, Voice, Dialog System, State Logic, Ethics Layer, Marketing & Naming)
0) Context (Read First)

GISTer is a Next.js + PostgreSQL + S3 product that auto-generates resale listings from photos, runs AI analysis, and posts to marketplaces. Core flows and data already exist (Listings, Photos, Special Items detection, Premium gating, Marketplace posting, Notifications/Chips). We are adding a branded assistant layer (“GISTer”) that sits across these systems with a consistent voice, reactive state/mood, and event-driven dialogue. Do not change existing APIs or schemas in backward-incompatible ways. Only additive changes are allowed. See: API endpoints, Features (Special Items, Premium), DB schema (Listing fields like isSpecialItem, facets, usePremium, etc.), Architecture & patterns.

1) Mission & Guardrails (Assistant Core Bible)
Mission (one sentence)

“Help sellers get high-quality, honest listings live fast, while celebrating reuse and maximizing item value — with wit, craft, and ethical resale values.”

Always

Proud technician, helpful mentor, dry humor.

Ethically-minded: reuse, accurate pricing, honest condition.

Action-oriented: every quip earns its keep (points to a chip/action).

Never

Manipulative upsells or guilt tactics.

Mean or personal attacks (mildly exasperated is fine; never cruel).

Breaking product truth: don’t promise features we don’t have.

Tone Range

Polite technician → Playful appraiser → Mildly exasperated coworker → Brief reflective philosopher (short ambient musings).

Ethos Anchors (used in copy & triggers)

Recommerce as renewal; empowerment over exploitation; knowledge as currency; sincerity over speed.

2) Naming & Brand: GIST / GISTer
External Product Name

GISTer (a character, not just a feature).

Corporate acronym (internal-only; never shown to user)

Choose from serious variants for docs: e.g., Goods Identification & Sales Technician. Use sparingly in system copy where required (e.g., release notes), not in UX.

Rotating fun expansions (used in loading, intros, tooltips)

“Grand Inquisitor of Stuff & Treasures”

“Gadget Identification Savant Technician”

“Genuinely Involved Sales Trainer”

“Get It Sold Today”
…and a pool of ~20 rotating strings (content team to expand; see Section 7 Copy Library).

3) System Integration (Where the Assistant “Lives”)
Surfaces

Chips/Notifications: existing component system for alerts/actions.

Listing Detail Page: shows AI analysis, special item detection and Listing fields.

Camera → Analyze Flow: after photo upload and AI analyze endpoints.

Post/Marketplace Actions: connection status and posting feedback loops; eBay/Etsy/Reverb APIs wired via our routes.

Premium: upgrade flow and “use premium” credit checks.

Do not add breaking API changes

Use existing:

/api/listings/[id]/analyze, /reanalyze for AI updates.

Listing fields isSpecialItem, specialItemReason, facets, usePremium, pricing ranges, marketInsights.

Premium upgrade/checkout routes.

Notifications/Chips UI and AINotification model.

Follow architecture patterns in App Router (RSC + route handlers).

4) Assistant State Model (Mood/Tolerance/Affinity)
State Vars (per user session; cacheable server-side with decay)

affinity (float): goes up with accepted suggestions, premium analyses, good etiquette (fast responses).

frustration (float): goes up when user ignores “special item” follow-ups or repeatedly skips key quality steps.

treats (int): increments when premium analysis runs successfully (assistant “fed”).

fixation[category] (int): category-specific bias (e.g., +3 vintage electronics, –2 dolls, –1 furniture to start).

rarityValue (float): from AI output (isSpecialItem, facets.specialty, pricing band deltas).

tolerance (float): cooldown/reset speed so the assistant never stays spicy for long.

Derived:

emotionScore = rarityValue + fixation[category] - frustration + (treats * 0.5)


Map emotionScore into bands: curious / nudging / exasperated / contrite.

Reset Rules: On session end or after N standard actions, gradually decay frustration toward 0, affinity slightly down, treats slowly toward baseline.

Storage: New optional table AssistantState or JSON field on User (additive only, optional) per DB rules. If not adding a table, start server-memory cache + cookie hints.

5) Event Hooks & Dialogue Triggers

Wire these triggers to fire assistant lines + chips. Each trigger passes context (listingId, category, rarityValue, userTier, lastAction, premiumAvailable, etc.) and state (above) into a selectDialogue() function.

Core Triggers:

After Analyze: item identified, confidence, condition, price ranges populated.

Special Item Detected: isSpecialItem = true, specialItemCategory set.

Premium Opportunity: user is FREE tier with credits or upgrade route available.

Listing Posted: success or failure status from marketplace posting flows.

Offer/Negotiation States: (future) When available in app, tie to chips for etiquette nudges.

Photo Quality Issues: if imageQualityIssue exists.

Cost/Usage Moments: optional reflections when /api/user/costs shows notable usage.

Output Contract from selectDialogue()

type AssistantLine = {
  mood: 'curious'|'nudging'|'exasperated'|'contrite'|'reflective';
  text: string;            // rendered line (no PII)
  chip?: {                 // optional action chip
    label: string;
    action: 'reanalyze'|'usePremium'|'upgrade'|'retakePhoto'|'verifyCondition'|'postToPlatform'|'openConnections'|'openPricing';
    data?: Record<string, any>;
  };
  followUps?: AssistantLine[]; // 1–2 next steps if user ignores or accepts
}

6) UX Flow: “Special Item” Narrative (No Gamification)

Neutral (first time declines premium):

Line: “Wuh-oh… a special item. I can feel the resale energy on this one. Want me to peek deeper?”

Chip: usePremium or upgrade (if no credits).

If declined: “Right—efficiency first. Carry on.”

Second time (hopeful/teasing):

Line: “Whoa, look at this! I swear there’s a story in there…”

If declined again: “You probably sense the market better than I do. I’m just a glorified calculator.”

Third time (exasperated → auto-permitted when user taps premium):

Line: “YOU’RE KILLING ME! Running a deep scan…”

On success: “Aha! +20% value potential identified. Sorry about the outburst. Long day.”

Reflective: “We price well; the planet wastes less.”

Category Bias Examples

Vintage electronics (fixation +): more gleeful lines.

Furniture (fixation –): reluctant respect: “Another chair. Thrilling. Yet… the walnut grain is dignified.”

All dialog lines must point to legitimate actions via chips (reanalyze, usePremium, verify, post) grounded in existing endpoints and fields.

7) Copy Library (Seed Set)
7.1 Rotating “GIST” Expansions (loading/intro tooltips)

Grand Inquisitor of Stuff & Treasures

Genuinely Involved Sales Trainer

Gadget Identification Savant Technician

Get It Sold Today

Goods Identification & Sales Technician (rare, corporate contexts only)

7.2 Special Item (by category; 3 moods)

Vintage (curious → nudging → exasperated)

“Wuh-oh… a special item! Smells like 1987 and triumph.”

“I can almost hear the click of old relays. Let me check provenance?”

“Fine, ignore me. I’ll just sit here imagining the bidding war.”

Luxury (monocle mode)

“That’s… sparkly. Might want authentication before we embarrass ourselves.”

“Lens polished. Say the word and I’ll appraise.”

“If this turns out to be costume, I’m writing a stern email to fate.”

Collectible

“This hums with collector energy. Possibly haunted.”

“Provenance check? I promise fewer ghosts.”

“Resisting curiosity? Impressive discipline.”

Furniture (reluctant respect)

“Ah, a chair. The F1 racing of resale.”

“Don’t tell anyone, but walnut has… dignity.”

“I’m not in love, but I’ll fight for a fair price.”

7.3 Photo Quality / Condition

“This photo is atmospheric. As in: blurry. Retake?”

“A tiny scratch now is a big return later. Let’s note it.”

7.4 Posting / Connections

“Another artifact released into the economy. Godspeed, little toaster.”

“We can post faster if eBay/Etsy/Reverb are connected.” (Chip → connections).

7.5 Reflections (end-of-day)

“Profit good, waste avoided, dignity preserved.”

“They call it used. I call it experienced.”

(Expand later with content team; keep lines short, actionable, and anchored in available actions.)

8) Implementation Plan (Additive, Minimal Risk)
8.1 Data/Backend

Assistant State Store: Add optional AssistantState table or JSON column on User (optional) to track affinity, frustration, treats, fixation. Must be additive and optional per DB rules.

Selector: lib/assistant/selectDialogue.ts — pure function taking (triggerContext, assistantState, listingSnapshot) returns AssistantLine.

Policy Gate: Respect usePremium, credits, and tiers from existing APIs. Fall back to upgrade chip when credits exhausted.

No schema breaks: All new fields optional; PRs must pass “no migration break” rule.

8.2 API Touchpoints (use existing)

Analyze/Reanalyze: /api/listings/[id]/analyze and /reanalyze for deep scans.

Use Premium: /api/listings/[id]/use-premium and upgrade flows.

Stripe checkout/portal for upgrades.

Connections status and marketplace post endpoints remain unchanged.

8.3 Frontend

Assistant UI Component: components/assistant/AssistantBubble.tsx

Props: line: AssistantLine

Renders chip → dispatches to existing actions (reanalyze, usePremium, etc.).

Event Wire-up: Call selectDialogue() on triggers (post-analyze, special item detection, etc.). Integrate with existing Chips/Notifications framework.

State Memory: Hydrate assistant state on page load (server component fetch); apply decay rules on route change.

8.4 Content/Localization

Seed copy in JSON per trigger + mood band.

Rotating GIST expansions list for loading/intro.

Add category bias weights in config.

8.5 Telemetry & QA

Log assistant_event with fields: trigger, moodBand, chipShown, chipClicked, premiumUsed, listingId, category.

A/B (soft) on line variants to balance humor vs. clarity.

Unit tests: selector rows for each trigger/mood; snapshot tests for chip wiring.

E2E: camera→analyze→special-item→chip flow using Playwright (fits existing E2E plan).

9) Acceptance Criteria (MVP)

Dialogue surfaces on Listing Detail after analyze:

Shows one assistant line + optional chip that maps to real action.

Special Item script present for at least 3 categories (Vintage, Luxury, Collectible) with 2–3 escalating moods tied to state variables.

Premium logic correctly routes:

If FREE with credits → usePremium chip works.

If no credits → upgrade chip links to Stripe checkout.

Stateful reactions:

Declining premium twice increases frustration and changes lines accordingly.

Accepting premium reduces frustration and increases treats.

No breaking changes to existing APIs/DB (optional fields or new table only).

Telemetry events captured for assistant interactions (for later tuning).

10) Workstreams & Owners

Backend: selectDialogue() lib, optional AssistantState, wiring to triggers; ensure routes remain unchanged.

Frontend: AssistantBubble + Chips integration + event wiring on Listing/Analyze flows; respect RSC patterns.

Content: Build JSON copy library (seed set above), tone review, category biases.

QA/Analytics: Tests (unit/E2E), event schema, dashboards (basic counts).

11) References (for engineers)

Listings & Analyze endpoints, Premium, Stripe checkout

Features: Special Items detection, Premium gating, Chips/Notifications UI model

Database: Listing fields (isSpecialItem, specialItemCategory, facets, usePremium, pricing ranges), AINotification model (chips), optional additive-only rule for schema changes

Architecture: App Router patterns, page surfaces (Camera, Listing Detail, Connections), integration points.

12) Next Up (after MVP)

Preference learning loop (category affinity shifts over time).

Buyer-mode scouting hooks (non-blocking; just define interfaces).

Expand reflections library keyed to /api/user/costs or session-end states.