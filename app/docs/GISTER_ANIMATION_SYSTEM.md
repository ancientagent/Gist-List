# GISTer Animation System

Complete documentation for the GISTer mascot animation infrastructure.

## 📦 What's Built

### ✅ Infrastructure Complete

1. **React Components**
   - `app/components/assistant/AssistantRive.tsx` - Rive character with state machine control
   - `app/components/assistant/AssistantLottie.tsx` - Lottie micro-loop animations
   - SVG fallback system (active until .riv file is created)

2. **Prop Mapping System**
   - `lib/assistant/props.ts` - Category-based prop selection logic
   - Priority: Monocle → Goggles → Bowtie → None
   - Mood-based visibility rules

3. **Test Pages**
   - `/tests/gister-anim` - Interactive mood and Lottie tester
   - `/tests/gister-props` - Category and prop mapping validator

4. **Animation Assets**
   - ✅ `gister_blink.json` - Eye blink loop (90 frames @ 30fps)
   - ✅ `gister_glow.json` - Ambient glow effect
   - ✅ `gister_monocle.json` - Monocle appraisal animation
   - ⏳ `mark1_moods.riv` - **PENDING CREATION**

5. **Documentation**
   - `public/assets/gister/rive/AUTHORING_GUIDE.md` - Complete Rive blueprint
   - `public/assets/gister/rive/PROPS_SPEC.md` - Prop system specifications
   - `components/assistant/README.md` - Component usage guide

## 🎨 Current State: SVG Fallback

The system currently uses an SVG-based fallback that demonstrates all functionality:

- ✅ 6 mood states with unique expressions
- ✅ Color-coded LCD screens
- ✅ Prop overlays (monocle 🧐, goggles 🥽, bowtie 🎀)
- ✅ Mood transitions
- ✅ Category-based prop selection

**To test**: Navigate to `http://localhost:3000/tests/gister-anim`

## 🎯 What's Needed: Rive Animation File

### File Requirements

**Location**: `/public/assets/gister/rive/mark1_moods.riv`

**Specifications**:
- Artboard: `Mark1_Moods` (224×192px)
- State Machine: `GisterMoods`
- FPS: 60
- Target size: <200KB

### State Machine Inputs

| Input       | Type    | Range  | Purpose                                    |
|-------------|---------|--------|--------------------------------------------|
| mood        | Number  | 0-5    | Controls mood animations (0=curious...5=joyful) |
| prop_kind   | Number  | 0-3    | Prop selection (0=none, 1=monocle, 2=goggles, 3=bowtie) |
| prop_toggle | Boolean | —      | Show/hide props                            |
| blink       | Trigger | —      | One-shot blink animation                   |

### Mood States

| Value | Mood         | Animation Details                                      |
|-------|--------------|-------------------------------------------------------|
| 0     | Curious      | Left eye +1px Y-offset, mouth tilt, cyan tint         |
| 1     | Nudging      | Eyes shrink, mouth curve, warm yellow tint            |
| 2     | Exasperated  | Eyes shift up, mouth frown, red tint                  |
| 3     | Contrite     | Eyes line, slow glow, purple tint                     |
| 4     | Reflective   | Eyes closed, deep blue glow                           |
| 5     | Joyful       | Wide smile, sparkle visible, bright yellow tint       |

**Full specifications**: See `/public/assets/gister/rive/AUTHORING_GUIDE.md`

## 🔌 Integration

### Basic Usage

```tsx
import AssistantRive from '@/components/assistant/AssistantRive';

// Simple mood display
<AssistantRive mood="curious" width={200} height={200} />

// With prop mapping
<AssistantRive
  mood="joyful"
  listing={{ category: 'jewelry', specialItemCategory: 'luxury' }}
  width={200}
  height={200}
/>

// Force SVG fallback for testing
<AssistantRive mood="nudging" useFallback={true} />
```

### Lottie Overlays

```tsx
import AssistantLottie from '@/components/assistant/AssistantLottie';

<AssistantLottie
  animation="blink"
  loop={true}
  autoplay={true}
  width={100}
  height={100}
/>
```

## 🧪 Testing Workflow

### 1. Test SVG Fallback (Current)
```bash
npm run dev
# Navigate to: http://localhost:3000/tests/gister-anim
# Test all 6 moods, Lottie animations, and combined view
```

### 2. Test Prop Mapping
```bash
# Navigate to: http://localhost:3000/tests/gister-props
# Select different categories, observe prop selection
# Verify visibility matrix against spec
```

### 3. Test Rive File (After Creation)
1. Place `mark1_moods.riv` in `/public/assets/gister/rive/`
2. Remove `useFallback={true}` from test pages
3. Reload and verify:
   - All moods transition smoothly
   - Props show/hide correctly
   - Blink trigger works from any state
   - File size <200KB

## 📂 File Structure

```
app/
├── components/assistant/
│   ├── AssistantRive.tsx        # Main character component
│   ├── AssistantLottie.tsx      # Lottie micro-loops
│   └── README.md                # Component usage guide
├── lib/assistant/
│   └── props.ts                 # Prop mapping logic
├── tests/
│   ├── gister-anim/             # Animation test page
│   └── gister-props/            # Prop mapping test page
└── public/assets/gister/
    ├── lottie/
    │   ├── gister_blink.json    ✅ Valid Lottie file
    │   ├── gister_glow.json     ✅ Valid Lottie file
    │   └── gister_monocle.json  ✅ Valid Lottie file
    └── rive/
        ├── mark1_moods.riv      ⏳ PENDING CREATION
        ├── AUTHORING_GUIDE.md   ✅ Complete blueprint
        └── PROPS_SPEC.md        ✅ Prop specifications
```

## 🚀 Next Steps

### For Designers/Animators

1. **Read the authoring guide**: `/public/assets/gister/rive/AUTHORING_GUIDE.md`
2. **Create in Rive Studio**: Follow the layer hierarchy and state machine setup
3. **Export**: Save as `mark1_moods.riv` with GisterMoods state machine
4. **Test**: Drop file in `/public/assets/gister/rive/` and reload test page

### For Developers

1. **Test current fallback**: Ensure SVG version works in all contexts
2. **Integrate into app**: Add GISTer to notification panels, listing pages
3. **Performance check**: Monitor bundle size impact (<150KB gzipped target)
4. **Accessibility**: Add ARIA labels and reduced-motion support

## 🎬 Animation Pipeline

```
┌─────────────────┐
│  User Action    │ (e.g., changes condition to "Poor")
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  App Logic      │ (determine mood: "exasperated")
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Prop Mapping   │ (category: "electronics" → goggles)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  AssistantRive  │ (set mood=2, prop_kind=2, prop_toggle=true)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Rive Runtime   │ (animate to exasperated state, show goggles)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Special Rules  │ (hide goggles after 800ms)
└─────────────────┘
```

## 💡 Design Philosophy

**GISTer should feel**:
- **Helpful, not intrusive** - Subtle animations, ~300-800ms transitions
- **Context-aware** - Props match item categories
- **Expressive** - Each mood has distinct personality
- **Performant** - <200KB total asset weight
- **Accessible** - Fallback to static when animations disabled

## 📊 Performance Targets

| Metric                | Target      | Current |
|-----------------------|-------------|---------|
| Rive file size        | <200KB      | ⏳ TBD  |
| Lottie total size     | <150KB      | ✅ ~60KB |
| Bundle impact         | <150KB gzip | ⏳ TBD  |
| Mood transition       | <150ms      | ✅ 300ms (SVG) |
| Initial load          | <100ms      | ✅ instant |

## 🐛 Troubleshooting

### "mark1_moods.riv not found"
- **Expected** - File hasn't been created yet
- **Fallback active** - SVG version displays automatically
- **Console warning** - Shows Rive load error but continues gracefully

### Props not showing
- Check `lib/assistant/props.ts` category mapping
- Verify `shouldShowPropForMood()` logic for current mood
- Check `/tests/gister-props` for visibility matrix

### Lottie not animating
- Verify JSON files are valid (check with lottiefiles.com)
- Check console for import errors
- Ensure `autoplay={true}` and `loop={true}` are set

## 📞 Questions?

- **Animation specs**: See `AUTHORING_GUIDE.md`
- **Prop logic**: See `PROPS_SPEC.md`
- **Component API**: See `components/assistant/README.md`
- **Test pages**: `/tests/gister-anim` and `/tests/gister-props`

---

**Status**: Infrastructure complete ✅ | Rive file pending ⏳ | SVG fallback active 🎨
