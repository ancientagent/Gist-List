# Data-TestId Recommendations for GISTer Components

This document provides recommendations for adding `data-testid` attributes to GISTer components to enable reliable E2E testing with Playwright.

## Why data-testid Attributes?

- **Stable Selectors**: Unlike CSS classes or element structure, `data-testid` attributes remain stable across UI changes
- **Test Maintainability**: Tests don't break when styling or markup changes
- **Clarity**: Makes it obvious which elements are intended for testing
- **Performance**: Direct attribute selectors are faster than complex CSS selectors

## Naming Convention

Format: `data-testid="component-element-variant"`

Examples:
- `data-testid="price-input"`
- `data-testid="condition-select"`
- `data-testid="notification-photo"`
- `data-testid="verified-condition-badge"`

## Priority Components to Update

### CRITICAL PRIORITY

These components are essential for the core test suites:

#### 1. Listing Detail Page (`app/listing/[id]/_components/listing-detail.tsx`)

```tsx
// Core form fields
<input data-testid="listing-title" ... />
<input data-testid="price-input" ... />
<select data-testid="condition-select" ... />
<textarea data-testid="condition-notes" ... />
<textarea data-testid="description" ... />

// Section containers
<div data-testid="pricing-section" ... />
<div data-testid="condition-section" ... />
<div data-testid="photos-section" ... />

// Buttons
<button data-testid="save-button" ... />
<button data-testid="publish-button" ... />
<button data-testid="analyze-button" ... />
```

#### 2. Notification List (`app/listing/[id]/_components/notification-list.tsx`)

```tsx
// Notification container by type
<div data-testid="notification-alert" ... />
<div data-testid="notification-question" ... />
<div data-testid="notification-insight" ... />
<div data-testid="notification-photo" ... />

// Individual notification (with ID)
<div data-testid={`notification-${notification.id}`} ... />

// Icons
<CameraIcon data-testid="camera-icon" />
<AlertIcon data-testid="alert-icon" />
```

#### 3. Price Chips (`app/listing/[id]/_components/smart-chip-bin.tsx`)

```tsx
// Price deviation chip
<button data-testid="price-chip" ... />

// Chip container
<div data-testid="chip-bin" ... />
<div data-testid="chip-lane-insight" ... />
```

#### 4. Photo Gallery (`app/listing/[id]/_components/photo-gallery.tsx`)

```tsx
// Gallery container
<div data-testid="photo-gallery" ... />

// Individual photos (with index)
<div data-testid={`photo-${index}`} ... />

// Verified badge
<span data-testid="photo-verified-badge" ... />

// Upload button
<button data-testid="add-photo-button" ... />
```

#### 5. Photo Upload Dialog

```tsx
// Dialog container
<div data-testid="photo-upload-dialog" ... />

// Action buttons
<button data-testid="camera-button" ... />
<button data-testid="upload-button" ... />
<button data-testid="dialog-close" ... />

// Progress and status
<div data-testid="upload-progress" ... />
<div data-testid="success-message" ... />
<div data-testid="error-message" ... />
<button data-testid="try-again-button" ... />
```

### HIGH PRIORITY

#### 6. Verified Condition Report

```tsx
// Section container
<div data-testid="verified-condition-section" ... />

// Badge
<div data-testid="verified-condition-badge" ... />
<svg data-testid="verification-icon" ... />

// Score displays
<div data-testid="score-surface" ... />
<div data-testid="score-function" ... />
<div data-testid="score-clean" ... />
<div data-testid="score-complete" ... />
<div data-testid="score-average" ... />

// Progress bars
<div data-testid="progress-bar-surface" ... />
<div data-testid="progress-bar-function" ... />
<div data-testid="progress-bar-clean" ... />
<div data-testid="progress-bar-complete" ... />
```

#### 7. Premium Item / Roadshow Reveal

```tsx
// Premium badge
<div data-testid="premium-badge" ... />
<svg data-testid="gem-icon" ... />

// Roadshow Reveal card
<div data-testid="roadshow-reveal" ... />

// Value displays
<div data-testid="baseline-value" ... />
<div data-testid="verified-value" ... />
<div data-testid="value-increase" ... />
<div data-testid="value-explanation" ... />

// Facets section
<div data-testid="top-facets" ... />
<div data-testid={`facet-${facet.name.toLowerCase().replace(/\s+/g, '-')}`} ... />
<span data-testid={`category-icon-${category.toLowerCase()}`} ... />
<span data-testid="status-present" ... /> // or status-likely, status-absent

// Uplift information
<div data-testid="uplift-breakdown" ... />
<div data-testid="uplift-cap-message" ... />
<div data-testid="parts-no-uplift-message" ... />

// Upgrade CTA
<button data-testid="upgrade-cta" ... />
```

#### 8. Quick Facts Panel (`src/components/QuickFactsPanel.tsx`)

```tsx
// Panel container
<div data-testid="quick-facts-panel" ... />

// Section headings
<h3 data-testid="comes-with-section" ... />
<h3 data-testid="missing-section" ... />

// Chips
<button
  data-testid="quick-facts-chip"
  data-selected={isSelected}
  ...
/>

// Inoperable toggle
<input data-testid="inoperable-toggle" type="checkbox" ... />
```

### MEDIUM PRIORITY

#### 9. Authentication Pages

```tsx
// Sign in page
<input data-testid="email-input" name="email" ... />
<input data-testid="password-input" name="password" ... />
<button data-testid="signin-button" type="submit" ... />

// Sign up page
<input data-testid="signup-email" name="email" ... />
<input data-testid="signup-password" name="password" ... />
<input data-testid="signup-name" name="fullName" ... />
<button data-testid="signup-button" type="submit" ... />
```

#### 10. Settings/Preferences

```tsx
// Condition report preference
<select data-testid="condition-report-preference" ... />

// Save button
<button data-testid="save-preferences" ... />
```

#### 11. Loading and Error States

```tsx
// Loading spinner
<div data-testid="loading-spinner" ... />

// Error messages
<div data-testid="error-message" ... />

// Success messages
<div data-testid="success-message" ... />
```

## Implementation Guide

### 1. Add to Existing Components

For each component, add `data-testid` attributes to key interactive elements:

```tsx
// Before
<button className="btn-primary" onClick={handleSave}>
  Save
</button>

// After
<button
  className="btn-primary"
  onClick={handleSave}
  data-testid="save-button"
>
  Save
</button>
```

### 2. Dynamic TestIds

For lists or repeated elements, use dynamic testIds:

```tsx
{notifications.map((notification, index) => (
  <div
    key={notification.id}
    data-testid={`notification-${notification.type.toLowerCase()}`}
    data-notification-id={notification.id}
  >
    {notification.message}
  </div>
))}
```

### 3. Conditional TestIds

For elements that change based on state:

```tsx
<div
  data-testid="verified-condition-badge"
  data-verified={isFullyVerified}
  data-condition={verifiedCondition}
>
  {isFullyVerified ? 'Verified' : 'Partially Verified'} - {verifiedCondition}
</div>
```

### 4. Test-Only Attributes

Use additional `data-*` attributes for test assertions:

```tsx
<div
  data-testid="price-chip"
  data-direction={direction} // "up" or "down"
  data-price={suggestedPrice}
>
  Set ${suggestedPrice} ({direction === 'up' ? '↑' : '↓'})
</div>
```

## Testing Pattern Examples

### Finding Elements

```typescript
// Simple find
const priceInput = page.locator('[data-testid="price-input"]');

// Find with additional filtering
const photoNotification = page.locator('[data-testid="notification-photo"]')
  .filter({ hasText: 'serial number' });

// Find by dynamic ID
const notification = page.locator(`[data-testid="notification-${notificationId}"]`);
```

### Assertions

```typescript
// Visibility
await expect(page.locator('[data-testid="premium-badge"]')).toBeVisible();

// Content
await expect(page.locator('[data-testid="score-average"]')).toContainText('85.7%');

// Attributes
await expect(chip).toHaveAttribute('data-direction', 'down');
```

### Interactions

```typescript
// Click
await page.locator('[data-testid="save-button"]').click();

// Fill input
await page.fill('[data-testid="price-input"]', '100');

// Select option
await page.selectOption('[data-testid="condition-select"]', 'Good');
```

## Implementation Checklist

Use this checklist to track progress:

- [ ] **Listing Detail Page**
  - [ ] Price input
  - [ ] Condition select
  - [ ] Condition notes textarea
  - [ ] Title input
  - [ ] Description textarea
  - [ ] Save button
  - [ ] Publish button

- [ ] **Notifications**
  - [ ] ALERT notifications
  - [ ] QUESTION notifications
  - [ ] INSIGHT notifications
  - [ ] PHOTO notifications
  - [ ] Camera icon
  - [ ] Individual notification IDs

- [ ] **Price Chips**
  - [ ] Price deviation chip
  - [ ] Chip lanes
  - [ ] Chip bin container

- [ ] **Photo Gallery**
  - [ ] Gallery container
  - [ ] Individual photos
  - [ ] Verified badge
  - [ ] Add photo button

- [ ] **Photo Upload Dialog**
  - [ ] Dialog container
  - [ ] Camera button
  - [ ] Upload button
  - [ ] Close button
  - [ ] Progress indicator
  - [ ] Success message
  - [ ] Error message
  - [ ] Try again button

- [ ] **Verified Condition**
  - [ ] Section container
  - [ ] Verified badge
  - [ ] 4 dimension scores
  - [ ] 4 progress bars
  - [ ] Average score

- [ ] **Premium/Roadshow**
  - [ ] Premium badge
  - [ ] Gem icon
  - [ ] Roadshow card
  - [ ] Baseline value
  - [ ] Verified value
  - [ ] Value increase
  - [ ] Facets list
  - [ ] Uplift breakdown
  - [ ] Upgrade CTA

- [ ] **Quick Facts**
  - [ ] Panel container
  - [ ] Section headings
  - [ ] Chips
  - [ ] Inoperable toggle

- [ ] **Auth Pages**
  - [ ] Email input
  - [ ] Password input
  - [ ] Sign in button
  - [ ] Sign up button

- [ ] **Settings**
  - [ ] Condition report preference
  - [ ] Save preferences button

- [ ] **Global States**
  - [ ] Loading spinner
  - [ ] Error messages
  - [ ] Success messages

## Best Practices

### DO:
- ✅ Use descriptive, kebab-case names
- ✅ Add to all interactive elements (buttons, inputs, links)
- ✅ Add to key display elements (badges, scores, values)
- ✅ Use dynamic IDs for list items
- ✅ Keep testIds stable across refactors

### DON'T:
- ❌ Use CSS classes or IDs for test selectors
- ❌ Use text content as primary selector (it may change with i18n)
- ❌ Over-nest testIds (keep them direct)
- ❌ Use generic names like "button-1" or "div-2"
- ❌ Add testIds to every single element (only test-critical ones)

## Migration Strategy

### Phase 1: Critical Path (Week 1)
- Listing detail page core fields
- Notifications (all types)
- Price chips
- Photo gallery and upload

### Phase 2: High Priority Features (Week 2)
- Verified condition report
- Premium items / Roadshow Reveal
- Quick Facts panel

### Phase 3: Supporting Features (Week 3)
- Authentication flows
- Settings/preferences
- Error and loading states

### Phase 4: Polish (Week 4)
- Review all tests
- Add missing testIds discovered during testing
- Refactor any brittle selectors

## Testing the Implementation

After adding data-testid attributes:

1. **Run the test suite**:
   ```bash
   npm run test:e2e
   ```

2. **Check for failed tests**:
   - Tests should now pass if attributes are correct
   - Fix any selector mismatches

3. **Use Playwright Inspector**:
   ```bash
   npm run test:e2e:debug
   ```
   - Step through tests
   - Verify selectors are working

4. **Use Playwright Codegen**:
   ```bash
   npm run test:e2e:codegen
   ```
   - Record new interactions
   - Verify testIds are being used automatically

## Verification

To verify testIds are properly added, run this command in the browser console:

```javascript
// Find all elements with data-testid
const testIds = [...document.querySelectorAll('[data-testid]')].map(el => el.dataset.testid);
console.table(testIds.sort());
```

Or use this Playwright test:

```typescript
test('Verify all critical testIds present', async ({ page }) => {
  await page.goto('/listing/test-listing-001');

  const criticalTestIds = [
    'price-input',
    'condition-select',
    'condition-notes',
    'photo-gallery',
    'premium-badge',
    'verified-condition-badge',
  ];

  for (const testId of criticalTestIds) {
    const element = page.locator(`[data-testid="${testId}"]`);
    await expect(element).toBeAttached({ timeout: 10000 });
  }
});
```

## Support

For questions or issues with test selectors:
1. Check this document first
2. Review the test files in `tests/e2e/`
3. Use Playwright Inspector to debug selector issues
4. Update this document when you discover better patterns

---

**Last Updated**: 2025-10-11
**Maintained By**: QA Team
**Related Docs**: `tests/README.md`, `playwright.config.ts`
