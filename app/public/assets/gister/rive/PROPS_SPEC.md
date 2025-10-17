# GISTer Props: Mapping, Moods, Motion, Control

## 1) Category → Prop Mapping (MVP)

| Source signal (from Listing / analysis) | Prop | Why |
|------------------------------------------|------|-----|
| specialItemCategory === "luxury" OR category in {"Jewelry", "Watches", "Gems"} | Monocle | Appraiser mode; authentication vibes |
| category in {"Electronics", "Vintage Electronics", "Cameras", "Audio"} | Goggles | "Bench tech" / repair energy |
| specialItemCategory === "vintage" OR category in {"Antiques", "Furniture", "Historical"} | Bowtie | Historian / curator tone |
| category in {"Instruments", "Pro Audio Gear"} | Bowtie (alt) | Formal, reverent appraisal of instruments |
| category in {"Collectibles", "Ephemera", "Comics", "Trading Cards"} | Bowtie (light) | Archivist angle |
| category in {"Dolls", "Toys (plush/dolls)"} | None (by design) | Keep face clear; let text carry the joke |
| No strong match | None | Minimalism by default |

**Conflict rule (multiple matches):** pick the first in this priority order: **Monocle → Goggles → Bowtie → None**.

(We prefer monocle when luxury is present, then goggles for electronics specificity; bowtie is the broad "heritage" fallback.)

## 2) Mood Combinations (when props appear)

Props shouldn't shout during every emotion. Use this matrix:

| Mood | Monocle | Goggles | Bowtie |
|------|---------|---------|--------|
| Neutral | hidden | hidden | hidden |
| Curious | show | show | show |
| Encouraging | show (subtle) | hidden | show (subtle) |
| Exasperated | hidden | show (brief) | hidden |
| Contrite | hidden | hidden | hidden |
| Reflective | show (dim) | hidden | show (dim) |
| Joyful | show (quick) | show (quick) | show (quick) |

"Show (subtle/quick/dim)" just tweaks opacity and motion amplitude.

## 3) Entrance/Exit Animations (Rive Clip Specs)

### Entrance (when prop becomes visible):

- **Duration:** 180–220 ms
- **Easing:** cubic-bezier(0.42,0,0.58,1) (standard ease in/out)
- **Motion:**
  - **Monocle:** drop from y = –6 px to y = 0, tiny 1-frame lens flash (opacity 0.5 → 0).
  - **Goggles:** slide down from y = –4 px, 2 px scale "settle" on impact.
  - **Bowtie:** fade-in + 4° swing settle (2 swings, decaying).
- **Opacity curve:** 0 → 1 with a 40 ms lead before position finishes (feels snappy).

### Exit (when prop hides):

- **Duration:** 120–160 ms
- Reverse motion, opacity 1 → 0; no bounce.

### Dim variants (Reflective):

- Same transform path, but cap opacity at 0.6 and skip flashes/bounces.

## 4) Rive Inputs (Control Surface)

### Current inputs:
- `mood` (number 0–5)
- `prop_toggle` (boolean)
- `blink` (trigger)

### Recommended upgrade:

Add a numeric prop selector to avoid juggling booleans:

| Input | Type | Values |
|-------|------|--------|
| prop_kind | Number | 0=None, 1=Monocle, 2=Goggles, 3=Bowtie |

Keep `prop_toggle` for entrance/exit gating (visibility).

### State Machine hookups:

- From any mood state, if `prop_toggle == true` → play the entrance animation for `prop_kind`; else play exit.
- For mood-specific variants (subtle/dim/quick), drive small differences via the mood value inside each prop layer (e.g., opacity multiplier keyed to mood).

## 5) App-Level Logic (How to Set Props)

```typescript
type PropKind = 0 | 1 | 2 | 3; // 0=none, 1=monocle, 2=goggles, 3=bowtie

function pickProp(listing: ListingSnapshot): PropKind {
  const cat = (listing.category || '').toLowerCase();
  const special = (listing.specialItemCategory || '').toLowerCase();

  if (special === 'luxury' || ['jewelry','watches','gems'].some(k => cat.includes(k))) return 1; // monocle
  if (['electronics','vintage electronics','cameras','audio'].some(k => cat.includes(k))) return 2; // goggles
  if (special === 'vintage' || ['antiques','furniture','historical','collectibles','ephemera','instruments','pro audio gear','trading cards','comics'].some(k => cat.includes(k))) return 3; // bowtie
  return 0; // none
}

function shouldShowPropForMood(mood: number, kind: PropKind): boolean {
  if (kind === 0) return false;
  switch (mood) {
    case 0: /* neutral */     return false;
    case 1: /* curious */     return true;
    case 2: /* encouraging */ return kind !== 2; // no goggles on encouraging
    case 3: /* exasperated */ return kind === 2; // only goggles briefly
    case 4: /* reflective */  return kind !== 2; // dim monocle/bowtie, no goggles
    case 5: /* joyful */      return true;       // quick show for all
    default: return false;
  }
}
```

### Rive control (React example):

```typescript
useEffect(() => {
  if (!rive) return;
  const inputs = rive.stateMachineInputs("GisterMoods");
  const moodInput = inputs.find(i => i.name === "mood");
  const toggle = inputs.find(i => i.name === "prop_toggle");
  const kind = inputs.find(i => i.name === "prop_kind");

  if (moodInput) moodInput.value = moodNumber; // 0..5

  const prop = pickProp(listing);
  const show = shouldShowPropForMood(moodNumber, prop);
  if (kind) kind.value = prop;
  if (toggle) toggle.value = show;

  // Optional: auto-hide goggles after 800ms when exasperated
  if (show && prop === 2 && moodNumber === 3) {
    const t = setTimeout(() => { if (toggle) toggle.value = false; }, 800);
    return () => clearTimeout(t);
  }
}, [rive, moodNumber, listing]);
```

## 6) Special Cases & Polish

- **Luxury + Electronics** (e.g., a jewel-studded smartwatch): monocle wins (appraisal first).
- **Instruments:** bowtie, but only show on curious/reflective/joyful (keep reverent).
- **Dolls:** no props, ever — we let the copy deliver the gag so visuals stay respectful/minimal.
- **Reflective mood:** dim prop opacity to 0.6 and suppress any "flashy" sub-motions.

## 7) Acceptance Checklist

- [ ] Props never obscure the eyes/mouth (z-index and safe zones verified).
- [ ] Entrance/exit timing matches spec and feels sincere (no bouncy cartoon).
- [ ] Monocle lens flash is < 60 ms and ≤ 0.5 opacity.
- [ ] Goggles "settle" scale is ≤ 1.05 (barely perceptible).
- [ ] Bowtie swing total arc ≤ 8°, two swings max.

## Future Enhancements

If you want more flair later, we can add:
- A tiny chain to the monocle in luxury mode
- A subtle lens glare when the user triggers premium analysis

Both easy to keep tasteful within these constraints.
