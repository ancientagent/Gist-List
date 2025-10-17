# GISTer Animation Assets

## Directory Structure

```
/public/assets/gister/
├── rive/
│   └── mark1_moods.riv          # Main character with mood state machine
└── lottie/
    ├── gister_blink.json        # Micro-loop: blinking animation
    ├── gister_glow.json         # Ambient glow effect
    └── gister_monocle.json      # Luxury item appraisal mode
```

## Rive Animation Spec

**File**: `rive/mark1_moods.riv`

**State Machine**: `GisterMoods`
- **Input**: `mood` (trigger/number)
- **States**:
  - `curious` - Eyes wide, slight head tilt, questioning expression
  - `nudging` - Friendly smile, encouraging gesture
  - `exasperated` - Eye roll, slight slump, hands on hips
  - `contrite` - Sheepish look, small wave, apologetic
  - `reflective` - Calm, distant gaze, contemplative pose
  - `joyful` - Big smile, excited bounce (for special item finds)

**Transitions**: <150ms for smooth mood changes

## Lottie Animations

### gister_blink.json
- Micro-loop animation (2-3 seconds)
- Subtle eye blink during idle states
- Plays continuously when no active mood change

### gister_glow.json
- Ambient particle/glow effect
- Plays when analyzing or discovering special items
- Color shifts based on item category

### gister_monocle.json
- Special animation for luxury/jewelry items
- Monocle appears with a shine effect
- Plays when `fixation` detects high-value items

## Usage

See `/app/components/assistant/` for React components that load these assets.

## Asset Requirements

- **Rive**: Single .riv file, max 200KB
- **Lottie**: Individual JSON files, max 50KB each
- **Total bundle impact**: <150KB gzipped

## Creating Assets

1. **Rive**: Use Rive Editor (rive.app)
   - Create artboard with multiple states
   - Set up state machine with mood input
   - Export as .riv file

2. **Lottie**: Use After Effects + Bodymovin or LottieFiles
   - Export as JSON
   - Optimize with lottie-colorify if needed
   - Test with lottie-react preview

## State Machine Mapping

From `docs/features/19_GISTer_Assistant_System.md`:

| Mood Band    | Rive State    | Trigger Context              |
|-------------|---------------|------------------------------|
| curious     | curious       | First special item detection |
| nudging     | nudging       | Second prompt, gentle push   |
| exasperated | exasperated   | Third decline, frustrated    |
| contrite    | contrite      | After exasperation, apology  |
| reflective  | reflective    | End of session, idle state   |
| joyful      | joyful        | Premium analysis success     |
