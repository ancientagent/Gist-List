# Context-Aware Smart Chips System

## Overview

Smart chips must be **context-aware** - providing relevant options based on the specific notification, not generic categories. When AI generates a notification, it must include actionable data that becomes chip options.

---

## The Problem

**Current Behavior (Wrong):**
```
Notification: "Mention color variations - 1960s batches had differences collectors track"
User clicks → Generic chip bin opens
Categories shown: Missing, Comes With, Condition, Functional
Result: ❌ User has no relevant options
```

**Expected Behavior (Correct):**
```
Notification: "Mention color variations - 1960s batches had differences collectors track"
User clicks → Context-aware chip bin opens
Options shown:
  - Platinum blonde with pink lips
  - Titian red with coral lips
  - Brunette with red lips
  - Color variation unknown
  - [Custom text input]
Result: ✅ User can quickly select the actual color variation
```

---

## Principle

**If AI knows enough to ask the question, it must provide the answers.**

When AI generates a notification requesting information:
1. AI must research/identify possible values for that information
2. Those values must be stored in `actionData.options`
3. Chip bin reads `actionData.options` and displays them
4. User selects from provided options or types custom answer

---

## Implementation

### Notification Generation (AI Backend)

When creating notifications, AI must include relevant options:

```typescript
// Example: Color variation notification
{
  id: "notif-13",
  type: "INSIGHT",
  message: "Mention color variations - 1960s batches had differences collectors track",
  field: "fineDetails",
  actionType: "add_detail",
  actionData: JSON.stringify({
    section: "fineDetails",
    mood: "doll",
    context: "This Barbie model came in multiple color variations that affect value",
    options: [
      "Platinum blonde with pink lips",
      "Titian red with coral lips",
      "Brunette with red lips",
      "Color variation unknown"
    ]
  })
}
```

```typescript
// Example: Storage condition notification
{
  id: "notif-14",
  type: "INSIGHT",
  message: "Mention storage - smoke-free home is major selling point",
  field: "fineDetails",
  actionType: "add_detail",
  actionData: JSON.stringify({
    section: "fineDetails",
    mood: "doll",
    options: [
      "Stored in smoke-free home",
      "Stored in climate-controlled environment",
      "Stored in original packaging",
      "Storage conditions unknown"
    ]
  })
}
```

```typescript
// Example: Shipping insurance question
{
  id: "notif-9",
  type: "QUESTION",
  message: "Will you include insurance for this high-value collectible?",
  field: "shipping",
  actionType: "add_insurance",
  actionData: JSON.stringify({
    section: "shipping",
    options: [
      "Insurance included in shipping cost",
      "Insurance available upon request",
      "Buyer responsible for insurance",
      "Insurance not offered"
    ]
  })
}
```

### Smart Chip Bin Display

The chip bin already supports `actionData.options` (implemented for question-based notifications). This same pattern extends to all notification types:

**Priority Order for Chip Options:**
1. **Check `actionData.options`** (AI-provided context-aware options) → Show these
2. **Check notification message for patterns** (e.g., "A, B, or C?") → Parse and show
3. **Fall back to generic categories** (Missing, Comes With, etc.) → Only if no context available

---

## Quick Facts & Auto-Population

Quick Facts (Slice 1) now consumes notification context to insert structured lines:
- "Comes with" → adds `Comes with: …`
- "Missing" → adds `Missing: …`
- "Inoperable" → appends condition text, flips condition to "For parts / not working", and reapplies ladder pricing
- Per-user/category memory stored in localStorage so frequent disclosures surface first

## Auto-Population for Premium Items

### When AI Should Auto-Populate (No Notification Needed)

**Premium Items + Photos Uploaded:**

If the item is premium AND has photos, AI should:
1. Analyze photos to extract information
2. **Automatically add** that information to the appropriate field
3. **Do not generate notification** (already handled)
4. Adjust price/value based on verified data

**Examples:**

**Color Variations:**
- AI analyzes doll photos
- Identifies: "Platinum blonde hair with pink lips"
- **Auto-adds to description**: "Color: Platinum blonde with pink lips (1960s first edition variant)"
- **No notification generated** (AI already handled it)
- Price adjusted +15% for rare color variant

**Condition Details:**
- AI analyzes close-up photos
- Identifies: "Minor crazing on left eye, hair slight frizzing at temples"
- **Auto-adds to Condition Assessment**: "Eyes show minor age-appropriate crazing on left side. Hair exhibits slight frizzing at temples, typical for vintage rubber band rooting."
- **No notification generated** (AI already documented it)
- Price adjusted -5% for minor condition issues

**Authentication Markers:**
- AI analyzes tag photo
- Identifies: "Original Mattel tag #1234-5678, 1965 manufacturing date"
- **Auto-adds to description**: "Authenticated original with Mattel tag #1234-5678 (1965)"
- **No notification generated** (AI verified authenticity)
- Price adjusted +25% for verified authenticity

### When AI Should Generate Notification

**Premium Items + No Photos:**

If the item is premium but lacks photos, AI should:
1. Research what information is important for this item type
2. Identify possible values for that information
3. **Generate notification** with `options` in `actionData`
4. User selects from options or provides custom answer

**Example:**
```typescript
// No photos uploaded, so AI can't determine color
{
  message: "Mention color variations - 1960s batches had differences collectors track",
  actionData: {
    options: [
      "Platinum blonde with pink lips",
      "Titian red with coral lips",
      "Brunette with red lips",
      "Ash blonde with red lips",
      "Color variation unknown"
    ]
  }
}
```

---

## Notification Types & Context-Aware Chips

### ALERT Notifications
**Purpose**: Required fields or blocking issues

**Chip Options**:
- Should provide common values for the required field
- Example: "Brand required for eBay listing"
  - Options: [Common brands for this category]

### QUESTION Notifications
**Purpose**: Clarifications needed

**Chip Options**:
- Should provide direct answers to the question
- Example: "Is this from Japan, Germany, or the US?"
  - Options: ["Japan", "Germany", "The US", "Unknown"]

### INSIGHT Notifications
**Purpose**: Optimization tips and value-enhancing details

**Chip Options**:
- Should provide specific details AI researched
- Example: "Mention color variations - collectors track differences"
  - Options: [Known color variants for this model]
- Example: "Mention storage conditions - important for vintage items"
  - Options: ["Smoke-free home", "Climate controlled", "Original packaging"]

### PHOTO Notifications
**Purpose**: Request specific photos

**Chip Options**:
- N/A - Opens camera/upload dialog instead of chip bin

---

## Implementation Checklist

### Backend (AI Analysis)
- [ ] When generating notifications, research relevant options
- [ ] Store options in `actionData.options` array
- [ ] For premium items with photos, auto-populate instead of generating notifications
- [ ] For premium items without photos, generate notifications with contextual options

### Frontend (Chip Bin)
- [x] Read `actionData.options` and display as chips (already implemented)
- [x] Parse question-format messages for options (already implemented)
- [ ] Show contextual options before falling back to generic categories
- [ ] Display "Custom" option alongside contextual chips

### Database
- [x] `actionData` field exists on AINotification table
- [ ] Ensure all notifications include `options` array when applicable

---

## Benefits

### For Sellers
- **Faster listing creation**: Click relevant option instead of typing
- **Better listings**: AI-researched details improve quality
- **Confidence**: Knowing the right information to include

### For Buyers
- **Accurate information**: Sellers provide details buyers care about
- **Consistency**: All listings include comparable information
- **Trust**: AI-verified details reduce misrepresentation

### For GISTer
- **Data quality**: Structured, consistent information across listings
- **Reduced abandonment**: Easy-to-complete notifications
- **Premium value**: Smart suggestions justify premium features

---

## Examples by Item Category

### Vintage Dolls
**Notifications with Context-Aware Chips:**
- Color variations → [Specific color combos for that model]
- Hair condition → ["Mint", "Minor frizzing", "Moderate wear", "Rerooted"]
- Original outfit → ["Complete original", "Missing accessories", "Reproduction", "Unknown"]
- Storage conditions → ["Smoke-free", "Climate controlled", "Original box", "Unknown"]

### Designer Handbags
**Notifications with Context-Aware Chips:**
- Hardware condition → ["Gold-tone pristine", "Minor tarnishing", "Significant wear"]
- Interior condition → ["Clean and odor-free", "Light wear", "Staining present"]
- Authenticity → ["With certificate", "Authentication card", "Receipt included", "No papers"]
- Serial number → ["Verified authentic", "Present but not verified", "Missing/unclear"]

### Vintage Electronics
**Notifications with Context-Aware Chips:**
- Working condition → ["Fully functional", "Powers on", "For parts", "Untested"]
- Included accessories → ["All original cables", "Power supply only", "No accessories"]
- Modifications → ["Unmodified original", "Professionally serviced", "Modified/upgraded"]

---

## Related Documentation

- [Smart Chip Bin Component](../app/listing/[id]/_components/smart-chip-bin.tsx)
- [Notification Types](./INDEX.md)
- [Special Items Feature](./SPECIAL_ITEMS_FEATURE.md)
- [AI Analysis Pipeline](../EXTERNAL_API_SETUP.md)

---

**Document Status**: 🟡 In Progress
**Last Updated**: 2025-10-10
**Owner**: GISTer Product Team
