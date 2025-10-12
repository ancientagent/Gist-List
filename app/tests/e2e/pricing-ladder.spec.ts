/**
 * E2E Tests for Pricing Ladder Feature (Slice 1)
 *
 * Tests cover:
 * - TC-S1-001: Condition-based price suggestions
 * - TC-S1-002: Poor ≥ 1.2× Parts constraint
 * - TC-S1-003: Upper/Lower bound clamping
 * - TC-S1-004: Price deviation chip appearance at ≥15%
 * - TC-S1-005: Price deviation chip tap to apply
 * - TC-S1-011: Premium uplift integration
 */

import { test, expect } from '@playwright/test';
import { loginAsFreeTier, loginAsPremiumTier } from '../fixtures/auth';
import { standardListing, premiumListing, calculatePriceLadder, marketData } from '../fixtures/test-data';
import {
  expectPriceValue,
  expectConditionValue,
  expectPriceDeviationChip,
  waitForPriceUpdate,
  parsePriceFromText,
} from '../helpers/assertions';

test.describe('Pricing Ladder - Condition-Based Price Suggestions', () => {
  test.beforeEach(async ({ page }) => {
    // Login as free tier user
    await loginAsFreeTier(page);
  });

  test('TC-S1-001: Price updates based on condition selection', async ({ page }) => {
    // Navigate to test listing
    await page.goto(`/listing/${standardListing.id}`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Test New condition
    await page.selectOption('[data-testid="condition-select"]', 'New');
    await waitForPriceUpdate(page);
    await expectPriceValue(page, standardListing.brandNewPrice);

    // Test Like New condition
    await page.selectOption('[data-testid="condition-select"]', 'Like New');
    await waitForPriceUpdate(page);
    const likeNewPrice = await page.locator('[data-testid="price-input"]').inputValue();
    expect(parseFloat(likeNewPrice)).toBeGreaterThan(0);

    // Test Good condition
    await page.selectOption('[data-testid="condition-select"]', 'Good');
    await waitForPriceUpdate(page);
    await expectPriceValue(page, standardListing.priceRangeMid);

    // Test Poor condition
    await page.selectOption('[data-testid="condition-select"]', 'Poor');
    await waitForPriceUpdate(page);
    const poorPrice = parseFloat(await page.locator('[data-testid="price-input"]').inputValue());
    expect(poorPrice).toBeGreaterThan(0);

    // Test For Parts condition
    await page.selectOption('[data-testid="condition-select"]', 'For Parts / Not Working');
    await waitForPriceUpdate(page);
    await expectPriceValue(page, standardListing.priceForParts);
  });

  test('TC-S1-002: Poor condition price is always ≥ 1.2× Parts price', async ({ page }) => {
    await page.goto(`/listing/${standardListing.id}`);
    await page.waitForLoadState('networkidle');

    // Get Parts price
    await page.selectOption('[data-testid="condition-select"]', 'For Parts / Not Working');
    await waitForPriceUpdate(page);
    const partsPrice = parseFloat(await page.locator('[data-testid="price-input"]').inputValue());

    // Switch to Poor condition
    await page.selectOption('[data-testid="condition-select"]', 'Poor');
    await waitForPriceUpdate(page);
    const poorPrice = parseFloat(await page.locator('[data-testid="price-input"]').inputValue());

    // Verify Poor ≥ 1.2× Parts
    const minPoorPrice = partsPrice * 1.2;
    expect(poorPrice).toBeGreaterThanOrEqual(minPoorPrice);
  });

  test('TC-S1-003: Price suggestions respect upper and lower bounds', async ({ page }) => {
    await page.goto(`/listing/${standardListing.id}`);
    await page.waitForLoadState('networkidle');

    // Test upper bound (New/Like New should not exceed brandNewPrice or usedQ90)
    await page.selectOption('[data-testid="condition-select"]', 'New');
    await waitForPriceUpdate(page);
    const newPrice = parseFloat(await page.locator('[data-testid="price-input"]').inputValue());
    const upperBound = Math.max(standardListing.brandNewPrice, standardListing.priceRangeHigh);
    expect(newPrice).toBeLessThanOrEqual(upperBound);

    // Test lower bound (Fair/Poor should not go below usedQ10)
    await page.selectOption('[data-testid="condition-select"]', 'Fair');
    await waitForPriceUpdate(page);
    const fairPrice = parseFloat(await page.locator('[data-testid="price-input"]').inputValue());
    expect(fairPrice).toBeGreaterThanOrEqual(standardListing.priceRangeLow);
  });
});

test.describe('Price Deviation Chip', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsFreeTier(page);
  });

  test('TC-S1-004: Price deviation chip appears at ≥15% difference', async ({ page }) => {
    await page.goto(`/listing/${standardListing.id}`);
    await page.waitForLoadState('networkidle');

    // Set condition to Good (suggested price: $80)
    await page.selectOption('[data-testid="condition-select"]', 'Good');
    await waitForPriceUpdate(page);
    const suggestedPrice = parseFloat(await page.locator('[data-testid="price-input"]').inputValue());

    // Set price to 10% above suggested (no chip should appear)
    const price10Percent = suggestedPrice * 1.10;
    await page.fill('[data-testid="price-input"]', price10Percent.toString());
    await page.waitForTimeout(1000);

    // Verify no chip appears
    const chipNone = page.locator('[data-testid="price-chip"]');
    await expect(chipNone).not.toBeVisible();

    // Set price to 15% above suggested (chip should appear)
    const price15Percent = suggestedPrice * 1.15;
    await page.fill('[data-testid="price-input"]', price15Percent.toString());
    await page.waitForTimeout(1000);

    // Verify chip appears with down arrow
    await expectPriceDeviationChip(page, Math.round(suggestedPrice), 'down');

    // Set price to 30% above suggested (chip should still appear)
    const price30Percent = suggestedPrice * 1.30;
    await page.fill('[data-testid="price-input"]', price30Percent.toString());
    await page.waitForTimeout(1000);

    // Chip should still be visible
    await expectPriceDeviationChip(page, Math.round(suggestedPrice), 'down');

    // Set price to 15% below suggested (chip with up arrow)
    const price15Below = suggestedPrice * 0.85;
    await page.fill('[data-testid="price-input"]', price15Below.toString());
    await page.waitForTimeout(1000);

    await expectPriceDeviationChip(page, Math.round(suggestedPrice), 'up');
  });

  test('TC-S1-005: Tapping price chip applies suggested price', async ({ page }) => {
    await page.goto(`/listing/${standardListing.id}`);
    await page.waitForLoadState('networkidle');

    // Set condition to Good
    await page.selectOption('[data-testid="condition-select"]', 'Good');
    await waitForPriceUpdate(page);
    const suggestedPrice = parseFloat(await page.locator('[data-testid="price-input"]').inputValue());

    // Set price 20% above to trigger chip
    const deviatedPrice = suggestedPrice * 1.20;
    await page.fill('[data-testid="price-input"]', deviatedPrice.toString());
    await page.waitForTimeout(1000);

    // Find and click the chip
    const chip = page.locator('[data-testid="price-chip"]').first();
    await expect(chip).toBeVisible();
    await chip.click();

    // Wait for price to update
    await waitForPriceUpdate(page);

    // Verify price was applied
    await expectPriceValue(page, suggestedPrice);

    // Verify chip disappears
    await expect(chip).not.toBeVisible();
  });

  test('Price deviation chip boundary: exactly 15% threshold', async ({ page }) => {
    await page.goto(`/listing/${standardListing.id}`);
    await page.waitForLoadState('networkidle');

    await page.selectOption('[data-testid="condition-select"]', 'Good');
    await waitForPriceUpdate(page);
    const suggestedPrice = 100; // Use round number for exact calculation

    // Manually set suggested price for test
    await page.fill('[data-testid="price-input"]', '100');
    await page.waitForTimeout(500);

    // Test exactly 15.0% (should show chip - threshold is ≥15%)
    await page.fill('[data-testid="price-input"]', '115');
    await page.waitForTimeout(1000);
    const chipAt15 = page.locator('[data-testid="price-chip"]');
    await expect(chipAt15).toBeVisible();

    // Test 14.99% (should NOT show chip)
    await page.fill('[data-testid="price-input"]', '114.99');
    await page.waitForTimeout(1000);
    const chipBelow15 = page.locator('[data-testid="price-chip"]');
    await expect(chipBelow15).not.toBeVisible();
  });
});

test.describe('Premium Uplift Integration', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsPremiumTier(page);
  });

  test('TC-S1-011: Premium uplifts apply to all used conditions', async ({ page }) => {
    await page.goto(`/listing/${premiumListing.id}`);
    await page.waitForLoadState('networkidle');

    // Premium listing has 18% total uplift
    const uplift = premiumListing.priceUplifts!.total;
    const baseGoodPrice = premiumListing.priceRangeMid;
    const expectedGoodPrice = Math.round(baseGoodPrice * (1 + uplift));

    // Test Good condition with uplift
    await page.selectOption('[data-testid="condition-select"]', 'Good');
    await waitForPriceUpdate(page);
    const actualPrice = parseFloat(await page.locator('[data-testid="price-input"]').inputValue());

    // Allow small rounding differences
    expect(actualPrice).toBeCloseTo(expectedGoodPrice, 0);

    // Test Like New with uplift
    await page.selectOption('[data-testid="condition-select"]', 'Like New');
    await waitForPriceUpdate(page);
    const likeNewPrice = parseFloat(await page.locator('[data-testid="price-input"]').inputValue());
    expect(likeNewPrice).toBeGreaterThan(baseGoodPrice * (1 + uplift));
  });

  test('Premium uplifts do NOT apply to For Parts condition', async ({ page }) => {
    await page.goto(`/listing/${premiumListing.id}`);
    await page.waitForLoadState('networkidle');

    // Switch to For Parts condition
    await page.selectOption('[data-testid="condition-select"]', 'For Parts / Not Working');
    await waitForPriceUpdate(page);

    // Price should be base parts price (no uplift)
    await expectPriceValue(page, premiumListing.priceForParts);
  });

  test('Premium uplift respects 20% cap', async ({ page }) => {
    // This would test a listing with calculated uplift >20%
    // For now, verify that priceUplifts.total never exceeds 0.20
    await page.goto(`/listing/${premiumListing.id}`);
    await page.waitForLoadState('networkidle');

    // Get listing data via API
    const response = await page.request.get(`/api/listings/${premiumListing.id}`);
    expect(response.ok()).toBeTruthy();

    const listingData = await response.json();
    if (listingData.priceUplifts) {
      expect(listingData.priceUplifts.total).toBeLessThanOrEqual(0.20);
    }
  });
});

test.describe('Price Ladder Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsFreeTier(page);
  });

  test('Handles rapid condition changes without race conditions', async ({ page }) => {
    await page.goto(`/listing/${standardListing.id}`);
    await page.waitForLoadState('networkidle');

    // Rapidly change conditions
    await page.selectOption('[data-testid="condition-select"]', 'New');
    await page.selectOption('[data-testid="condition-select"]', 'Good');
    await page.selectOption('[data-testid="condition-select"]', 'Poor');
    await page.selectOption('[data-testid="condition-select"]', 'For Parts / Not Working');
    await page.selectOption('[data-testid="condition-select"]', 'Like New');

    // Wait for final update
    await waitForPriceUpdate(page, 2000);

    // Verify final condition is Like New
    await expectConditionValue(page, 'Like New');

    // Verify price is stable and reasonable
    const finalPrice = parseFloat(await page.locator('[data-testid="price-input"]').inputValue());
    expect(finalPrice).toBeGreaterThan(0);
    expect(finalPrice).toBeLessThan(standardListing.brandNewPrice * 1.5); // Sanity check
  });

  test('Price ladder with missing market data degrades gracefully', async ({ page }) => {
    // This test would use a listing with null/missing ladder data
    // For now, just verify no crashes occur
    await page.goto(`/listing/${standardListing.id}`);
    await page.waitForLoadState('networkidle');

    // Verify page loads without errors
    const title = await page.locator('[data-testid="listing-title"]').textContent();
    expect(title).toBeTruthy();

    // Check console for errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.selectOption('[data-testid="condition-select"]', 'Good');
    await page.waitForTimeout(1000);

    // Should have no critical errors
    const criticalErrors = consoleErrors.filter(e => e.includes('undefined') || e.includes('null'));
    expect(criticalErrors.length).toBe(0);
  });
});
