# Rive Authoring Blueprint – "GISTer Mark I Moods"

The goal: one .riv file that contains all moods and props, animated with absolute consistency.

## 🧱 1. Document Setup

- **Artboard name:** `Mark1_Moods`
- **Canvas size:** 224 × 192 px (4× scale of 56×48 for crisp scaling)
- **Background:** transparent
- **FPS:** 60
- **Runtime target:** @rive-app/react-canvas

## 🧠 2. Layer Hierarchy

```
Mark1_Moods
│
├── Body
│   ├── Bezel (rounded rectangle, base grey #B9BAB7)
│   ├── Screws (2× small circles #5E584A)
│   ├── PowerLED (circle top-left)
│   └── MoodLED (circle top-right)
│
├── ScreenGroup
│   ├── LCD_Back (rectangle #9DBA6C → #8DA968 gradient)
│   ├── LCD_Tint (color layer; animated per mood)
│   ├── GridOverlay (subtle pattern; opacity 6%)
│   ├── Eyes (2 rectangles, grouped)
│   ├── Mouth (rectangle or path)
│   └── Sparkle (hidden by default; used for "Joyful")
│
└── FX
    ├── Glow (blur layer behind ScreenGroup)
    └── Shadow (drop shadow below body)
```

Keep each facial element centered within a 56×48 px safe zone inside the screen rectangle.

## 🎛 3. Artboard Inputs

Create a State Machine named **GisterMoods**.

Add Inputs:

| Input        | Type    | Range / Values | Purpose                              |
|--------------|---------|----------------|--------------------------------------|
| mood         | Number  | 0–6            | Controls mood animations             |
| prop_kind    | Number  | 0–3            | Prop selection (0=none, 1=monocle, 2=goggles, 3=bowtie) |
| prop_toggle  | Boolean | true/false     | Enables props (entrance/exit gating) |
| blink        | Trigger | —              | One-shot blink animation             |

## 🎞 4. Animations

Each mood is its own animation clip (0.5–1 s).
All start from the same neutral pose.

| Mood (Input value) | Animation name    | Keyframes / Notes                                           |
|--------------------|-------------------|-------------------------------------------------------------|
| 0 = Neutral        | Neutral_Idle      | subtle 2s breathing pulse of LCD_Tint opacity 0.05 → 0.1   |
| 1 = Curious        | Curious           | left eye +1px Y-offset, mouth 3° up-tilt, tint #4CC6C4 @ 0.2α |
| 2 = Encouraging    | Encouraging       | eyes –1px H shrink, mouth 2px curve, tint #FFD77A          |
| 3 = Exasperated    | Exasperated       | eyes +1px Y shift, mouth –3° tilt, tint #F47B7B            |
| 4 = Reflective     | Reflective        | eyes → line, glow #4951A5 @ 0.18α, slower pulse            |
| 5 = Joyful         | Joyful            | wide smile, sparkle visible, tint #FFD55C @ 0.3α           |

Each clip should return to neutral smoothly for seamless cross-fades.

## 🪄 5. Blink Animation

Create **Blink** (6 frames, 0.15 s).

- Animate `Eyes.scaleY → 0` then back to 1.
- Keep in same coordinates so every mood can play blink overlayed.

State machine:
`AnyState → Blink` (on blink trigger) → returns to current mood.

## 🧰 6. Props Layer

Add a group **Props** above ScreenGroup:

- **Monocle** (ellipse + chain, silver #D8D8D8)
- **Goggles** (two cyan circles with highlights)
- **Bowtie** (polygon #8C5AA8)

Visibility toggled by `prop_toggle` boolean or via sub-state machine.

Optional: assign each prop a small intro animation (drop, fade, bounce < 300 ms).

## 🌈 7. Color & Lighting

- Use **Color animations** instead of opacity where possible for efficient runtime blending.
- Limit to 1–2 key color properties per animation (`LCD_Tint.fillColor`, `MoodLED.fillColor`).
- Keep `Glow`'s alpha low (< 0.25) to avoid flattening pixel contrast.

## 🧩 8. State Machine Graph

```
Entry
 ↓
Neutral_Idle
 ├── mood == 1 → Curious
 ├── mood == 2 → Encouraging
 ├── mood == 3 → Exasperated
 ├── mood == 4 → Reflective
 ├── mood == 5 → Joyful
 ↖── mood == 0 ←── (return)
```

- **Transitions:** 0.2 s linear blend.
- **Blink** can trigger from any state.

## ⚙️ 9. Export Settings

- **File:** `/assets/gister/rive/mark1_moods.riv`
- **Artboard:** `Mark1_Moods`
- **State Machine:** `GisterMoods`
- **Default animation:** `Neutral_Idle`
- **Scale Mode:** Fit → Contain
- **Origin:** Center

## 🧩 10. Testing Checklist

- [ ] All moods transition smoothly.
- [ ] Blink trigger works from any state.
- [ ] Prop toggle hides/shows overlays without affecting underlying animations.
- [ ] File size < 200 KB.
- [ ] Rive runtime in React reads mood input correctly and updates LED/tint.

## React Integration

When this file is built, you can:

- Wire it directly to the app state (mood = 0–5).
- Trigger blinks on timer.
- Toggle props based on item category (e.g., monocle for jewelry).

See `AssistantRive.tsx` for implementation details.
