# GISTer Assistant Animation Components

React components for GISTer character animations using Rive and Lottie.

## Components

### `AssistantRive.tsx`
Rive-based character with state-driven moods.

**Props:**
```typescript
{
  mood: 'curious' | 'nudging' | 'exasperated' | 'contrite' | 'reflective' | 'joyful';
  listing?: {
    category?: string;
    specialItemCategory?: string;
  };
  className?: string;
  width?: number;  // default: 200
  height?: number; // default: 200
}
```

**Usage:**
```tsx
import AssistantRive from '@/components/assistant/AssistantRive';

// Without props
<AssistantRive mood="curious" width={250} height={250} />

// With props based on listing
<AssistantRive
  mood="curious"
  listing={{ category: 'Jewelry', specialItemCategory: 'luxury' }}
  width={250}
  height={250}
/>
```

**State Machine Inputs:**
- `mood` (Number 0-6): curious=1, nudging=2, exasperated=3, contrite=4, reflective=5, joyful=6
- `prop_kind` (Number 0-3): 0=none, 1=monocle, 2=goggles, 3=bowtie
- `prop_toggle` (Boolean): Controls prop visibility
- `blink` (Trigger): One-shot blink animation

**Prop Mapping:**
- Luxury/Jewelry/Watches → Monocle (appraiser mode)
- Electronics/Cameras/Audio → Goggles (bench tech)
- Vintage/Antiques/Collectibles → Bowtie (curator tone)
- See `/lib/assistant/props.ts` for full mapping logic

### `AssistantLottie.tsx`
Lottie-based micro-loops for ambient and special effects.

**Props:**
```typescript
{
  animation: 'blink' | 'glow' | 'monocle';
  loop?: boolean;        // default: true
  autoplay?: boolean;    // default: true
  className?: string;
  width?: number;        // default: 100
  height?: number;       // default: 100
  onComplete?: () => void;
}
```

**Usage:**
```tsx
import AssistantLottie from '@/components/assistant/AssistantLottie';

<AssistantLottie animation="blink" loop={true} width={150} height={150} />
```

## Asset Files Required

Before the components will work, you need to create the animation assets:

### 1. Rive File
**Path:** `/public/assets/gister/rive/mark1_moods.riv`

**Complete authoring guide:** See `/public/assets/gister/rive/AUTHORING_GUIDE.md`

Quick summary:
1. Design GISTer Mark I device with LCD screen (224×192px artboard)
2. Create state machine named "GisterMoods" with inputs: `mood` (Number 0-5), `prop_toggle` (Boolean), `blink` (Trigger)
3. Animate 6 mood states: Neutral, Curious, Encouraging, Exasperated, Reflective, Joyful
4. Add props layer (monocle, goggles, bowtie)
5. Export as .riv file < 200KB

### 2. Lottie Files
**Path:** `/public/assets/gister/lottie/`

- `gister_blink.json` - Idle blinking animation (2-3s loop)
- `gister_glow.json` - Particle effect for analysis
- `gister_monocle.json` - Luxury item appraisal animation

Create in After Effects or LottieFiles, export as JSON.

## Testing

- **Animation test:** Visit `/tests/gister-anim` to preview moods and Lottie animations
- **Props test:** Visit `/tests/gister-props` to test category → prop mapping and mood visibility matrix

## Integration with Assistant System

From `docs/features/19_GISTer_Assistant_System.md`:

```tsx
import AssistantRive from '@/components/assistant/AssistantRive';
import { useAssistantState } from '@/lib/assistant/useAssistantState';

export function ListingAssistant({ listingId }: { listingId: string }) {
  const { mood } = useAssistantState(listingId);

  return (
    <div className="assistant-bubble">
      <AssistantRive mood={mood} width={120} height={120} />
      <div className="dialogue-text">...</div>
    </div>
  );
}
```

## Motion Style Guide

When creating animations in Rive or After Effects, follow these constraints:

- **Duration:** 300–800ms per emote (Skype-sincere, never bouncy)
- **Easing:** `cubic-bezier(0.42, 0, 0.58, 1)` (standard ease-in-out)
- **Movement:** Max 2–3px amplitude on the face; express via tint/shape changes
- **Colors:** One accent per mood, no rainbow gradients

**Mood → Accent Color:**
- curious → teal
- nudging → amber
- exasperated → coral
- contrite → indigo
- reflective → indigo
- joyful → gold

## Performance Targets

- Mood transitions: <150ms
- No layout shift during transitions
- Bundle size increase: <150KB gzipped
- Initial load: Lazy load animations on interaction

## Troubleshooting

**Rive not loading:**
- Check file path: `/public/assets/gister/rive/mark1_moods.riv`
- Verify state machine name: "GisterMoods"
- Check input name: "mood"
- Ensure file is <200KB

**Lottie not loading:**
- Check file paths in `/public/assets/gister/lottie/`
- Verify JSON is valid
- Each file should be <50KB
- Check browser console for errors

**Mood not changing:**
- Verify mood value is correct type (string)
- Check state machine input mapping
- Inspect Rive console logs

## Next Steps

1. Create animation assets in Rive and After Effects
2. Export and place in `/public/assets/gister/`
3. Test at `/tests/gister-anim`
4. Integrate with assistant dialogue system
5. Wire to listing events (special items, posting, etc.)
