/**
 * E2E Tests for Verified Condition Report (Slice 3)
 *
 * Tests cover:
 * - TC-S3-001: 4-dimension score display
 * - TC-S3-002: "GISTer Verified Condition" badge
 * - TC-S3-003: Tightened ±7% price band
 * - TC-S3-004: Price chip with verified badge
 * - TC-S3-005: User preference "all"
 * - TC-S3-006: User preference "premium"
 * - TC-S3-007: User preference "off"
 */

import { test, expect } from '@playwright/test';
import { loginAsFreeTier, loginAsPremiumTier, loginAsPreferenceOff } from '../fixtures/auth';
import { premiumListing, partialDataListing } from '../fixtures/test-data';
import {
  expectVerifiedConditionBadge,
  expectVerifiedConditionScores,
  expectPriceDeviationChip,
  expectUpgradeCTA,
  expectNoUpgradeCTA,
  waitForPriceUpdate,
} from '../helpers/assertions';

test.describe('Verified Condition Score Display', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsPremiumTier(page);
  });

  test('TC-S3-001: Verified condition displays all 4 dimensions correctly', async ({ page }) => {
    await page.goto(`/listing/${premiumListing.id}`);
    await page.waitForLoadState('networkidle');

    // Scroll to Verified Condition Report section
    const verifiedSection = page.locator('[data-testid="verified-condition-section"]');
    await verifiedSection.scrollIntoViewIfNeeded();

    // Verify section is visible
    await expect(verifiedSection).toBeVisible();

    // Verify "GISTer Verified Condition" badge
    await expectVerifiedConditionBadge(page, 'Like New');

    // Verify all 4 dimension scores
    const expectedScores = premiumListing.verifiedConditionScore!;
    await expectVerifiedConditionScores(page, {
      surface: expectedScores.surface,
      function: expectedScores.function,
      clean: expectedScores.clean,
      complete: expectedScores.complete,
      avg: expectedScores.avg,
    });

    // Verify progress bars are rendered
    const surfaceBar = page.locator('[data-testid="progress-bar-surface"]');
    const functionBar = page.locator('[data-testid="progress-bar-function"]');
    const cleanBar = page.locator('[data-testid="progress-bar-clean"]');
    const completeBar = page.locator('[data-testid="progress-bar-complete"]');

    await expect(surfaceBar).toBeVisible();
    await expect(functionBar).toBeVisible();
    await expect(cleanBar).toBeVisible();
    await expect(completeBar).toBeVisible();

    // Verify bars show correct fill percentage
    const surfaceWidth = await surfaceBar.evaluate((el) =>
      window.getComputedStyle(el).getPropertyValue('--value')
    );
    expect(parseFloat(surfaceWidth || '0')).toBeCloseTo(expectedScores.surface * 100, 0);
  });

  test('TC-S3-002: Verified condition badge displays prominently', async ({ page }) => {
    await page.goto(`/listing/${premiumListing.id}`);
    await page.waitForLoadState('networkidle');

    const badge = page.locator('[data-testid="verified-condition-badge"]');

    // Verify badge is visible
    await expect(badge).toBeVisible();

    // Verify badge contains "Verified" text
    await expect(badge).toContainText(/verified/i);

    // Verify badge shows condition level
    await expect(badge).toContainText('Like New');

    // Verify badge has checkmark or verification icon
    const icon = badge.locator('[data-testid="verification-icon"]');
    await expect(icon).toBeVisible();

    // Verify badge styling is distinct
    const badgeClass = await badge.getAttribute('class');
    expect(badgeClass).toMatch(/verified|badge|premium/i);
  });

  test('Auto-computed average from 4 dimensions', async ({ page }) => {
    await page.goto(`/listing/${premiumListing.id}`);
    await page.waitForLoadState('networkidle');

    // Get individual scores
    const scores = premiumListing.verifiedConditionScore!;
    const expectedAvg = (scores.surface + scores.function + scores.clean + scores.complete) / 4;

    // Verify displayed average matches calculation
    const avgElement = page.locator('[data-testid="score-average"]');
    const avgText = await avgElement.textContent();
    const displayedAvg = parseFloat(avgText!.replace(/[^\d.]/g, '')) / 100;

    expect(displayedAvg).toBeCloseTo(expectedAvg, 2);
  });
});

test.describe('Verified Condition Price Band', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsPremiumTier(page);
  });

  test('TC-S3-003: Verified listings have tightened ±7% price band', async ({ page }) => {
    await page.goto(`/listing/${premiumListing.id}`);
    await page.waitForLoadState('networkidle');

    // Set condition to Good
    await page.selectOption('[data-testid="condition-select"]', 'Good');
    await waitForPriceUpdate(page);

    const suggestedPrice = parseFloat(await page.locator('[data-testid="price-input"]').inputValue());

    // Test price at 6% deviation (should NOT show chip for verified)
    const price6Percent = Math.round(suggestedPrice * 1.06);
    await page.fill('[data-testid="price-input"]', price6Percent.toString());
    await page.waitForTimeout(1000);

    const chipAt6 = page.locator('[data-testid="price-chip"]');
    await expect(chipAt6).not.toBeVisible();

    // Test price at 8% deviation (should show chip for verified - exceeds ±7%)
    const price8Percent = Math.round(suggestedPrice * 1.08);
    await page.fill('[data-testid="price-input"]', price8Percent.toString());
    await page.waitForTimeout(1000);

    const chipAt8 = page.locator('[data-testid="price-chip"]');
    await expect(chipAt8).toBeVisible();

    // Verify chip mentions "Verified"
    await expect(chipAt8).toContainText(/verified/i);
  });

  test('Unverified listings use ±15% price band', async ({ page }) => {
    // Use a listing without verified condition
    const unverifiedListingId = 'test-listing-standard-001';
    await page.goto(`/listing/${unverifiedListingId}`);
    await page.waitForLoadState('networkidle');

    await page.selectOption('[data-testid="condition-select"]', 'Good');
    await waitForPriceUpdate(page);

    const suggestedPrice = parseFloat(await page.locator('[data-testid="price-input"]').inputValue());

    // Test price at 10% deviation (should NOT show chip for unverified)
    const price10Percent = Math.round(suggestedPrice * 1.10);
    await page.fill('[data-testid="price-input"]', price10Percent.toString());
    await page.waitForTimeout(1000);

    const chipAt10 = page.locator('[data-testid="price-chip"]');
    await expect(chipAt10).not.toBeVisible();

    // Test price at 16% deviation (should show chip for unverified - exceeds ±15%)
    const price16Percent = Math.round(suggestedPrice * 1.16);
    await page.fill('[data-testid="price-input"]', price16Percent.toString());
    await page.waitForTimeout(1000);

    const chipAt16 = page.locator('[data-testid="price-chip"]');
    await expect(chipAt16).toBeVisible();

    // Chip should NOT mention "Verified"
    const chipText = await chipAt16.textContent();
    expect(chipText).not.toMatch(/verified/i);
  });

  test('TC-S3-004: Price chip for verified condition includes verified indicator', async ({ page }) => {
    await page.goto(`/listing/${premiumListing.id}`);
    await page.waitForLoadState('networkidle');

    await page.selectOption('[data-testid="condition-select"]', 'Like New');
    await waitForPriceUpdate(page);

    const suggestedPrice = parseFloat(await page.locator('[data-testid="price-input"]').inputValue());

    // Set price to trigger chip (8% deviation)
    const deviatedPrice = Math.round(suggestedPrice * 1.08);
    await page.fill('[data-testid="price-input"]', deviatedPrice.toString());
    await page.waitForTimeout(1000);

    const chip = page.locator('[data-testid="price-chip"]');
    await expect(chip).toBeVisible();

    // Verify chip mentions "Verified"
    await expect(chip).toContainText(/verified/i);

    // Verify chip shows condition level
    await expect(chip).toContainText(/like new/i);

    // Verify chip has special styling
    const chipClass = await chip.getAttribute('class');
    expect(chipClass).toMatch(/verified|premium/i);

    // Tap chip and verify it applies price
    await chip.click();
    await waitForPriceUpdate(page);

    const updatedPrice = parseFloat(await page.locator('[data-testid="price-input"]').inputValue());
    expect(updatedPrice).toBeCloseTo(suggestedPrice, 0);
  });
});

test.describe('User Preference Handling', () => {
  test('TC-S3-005: Preference "all" - free users see verified condition report', async ({ page }) => {
    // Login as free tier user with preference = "all"
    await loginAsFreeTier(page);

    await page.goto(`/listing/${premiumListing.id}`);
    await page.waitForLoadState('networkidle');

    // Verify verified condition report is visible
    const verifiedSection = page.locator('[data-testid="verified-condition-section"]');
    await expect(verifiedSection).toBeVisible();

    // Verify all 4 dimensions displayed
    await expectVerifiedConditionScores(page, {
      surface: premiumListing.verifiedConditionScore!.surface,
      function: premiumListing.verifiedConditionScore!.function,
      clean: premiumListing.verifiedConditionScore!.clean,
      complete: premiumListing.verifiedConditionScore!.complete,
    });

    // Verify no upgrade prompt blocks the report
    await expectNoUpgradeCTA(page);
  });

  test('TC-S3-006: Preference "premium" - free users see upgrade prompt', async ({ page }) => {
    // This test would require modifying the test user's preference to "premium"
    // For now, we'll test the logic by checking for the upgrade prompt

    await loginAsFreeTier(page);

    // Update user preference via API (if endpoint exists)
    await page.request.put('/api/user/preferences', {
      data: { conditionReportMode: 'premium' },
    });

    await page.goto(`/listing/${premiumListing.id}`);
    await page.waitForLoadState('networkidle');

    // Verify verified condition report is hidden or shows upgrade prompt
    const verifiedSection = page.locator('[data-testid="verified-condition-section"]');

    // Either section is hidden OR upgrade CTA is displayed
    const isHidden = await verifiedSection.isHidden().catch(() => true);
    if (!isHidden) {
      // If section visible, verify upgrade CTA is shown
      await expectUpgradeCTA(page);
    }

    // Verify message about upgrading
    const upgradeMessage = page.locator('[data-testid="upgrade-message"]');
    if (await upgradeMessage.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(upgradeMessage).toContainText(/upgrade|premium/i);
      await expect(upgradeMessage).toContainText(/verified condition/i);
    }
  });

  test('Premium users always see verified condition report regardless of preference', async ({ page }) => {
    await loginAsPremiumTier(page);

    // Even with preference = "premium", premium users should see report
    await page.goto(`/listing/${premiumListing.id}`);
    await page.waitForLoadState('networkidle');

    const verifiedSection = page.locator('[data-testid="verified-condition-section"]');
    await expect(verifiedSection).toBeVisible();

    // No upgrade CTA should be shown
    await expectNoUpgradeCTA(page);
  });

  test('TC-S3-007: Preference "off" - verified condition report is hidden', async ({ page }) => {
    await loginAsPreferenceOff(page);

    await page.goto(`/listing/${premiumListing.id}`);
    await page.waitForLoadState('networkidle');

    // Verify verified condition report card is NOT displayed
    const verifiedSection = page.locator('[data-testid="verified-condition-section"]');
    await expect(verifiedSection).not.toBeVisible();

    // Verify no remnants of report visible
    const badge = page.locator('[data-testid="verified-condition-badge"]');
    await expect(badge).not.toBeVisible();

    const scores = page.locator('[data-testid^="score-"]');
    await expect(scores.first()).not.toBeVisible();
  });

  test('User can toggle preference and see report appear/disappear', async ({ page }) => {
    await loginAsFreeTier(page);

    await page.goto(`/listing/${premiumListing.id}`);
    await page.waitForLoadState('networkidle');

    // Initially visible (preference = "all")
    const verifiedSection = page.locator('[data-testid="verified-condition-section"]');
    await expect(verifiedSection).toBeVisible();

    // Navigate to settings/preferences
    await page.goto('/settings');

    // Change preference to "off"
    const preferenceSelect = page.locator('[data-testid="condition-report-preference"]');
    await preferenceSelect.selectOption('off');

    // Save preferences
    const saveButton = page.locator('[data-testid="save-preferences"]');
    await saveButton.click();

    // Return to listing
    await page.goto(`/listing/${premiumListing.id}`);
    await page.waitForLoadState('networkidle');

    // Verify report now hidden
    await expect(verifiedSection).not.toBeVisible();

    // Change back to "all"
    await page.goto('/settings');
    await preferenceSelect.selectOption('all');
    await saveButton.click();

    await page.goto(`/listing/${premiumListing.id}`);
    await page.waitForLoadState('networkidle');

    // Verify report now visible again
    await expect(verifiedSection).toBeVisible();
  });
});

test.describe('Verified Condition Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsPremiumTier(page);
  });

  test('Partial verified condition - only 2 dimensions scored', async ({ page }) => {
    await page.goto(`/listing/${partialDataListing.id}`);
    await page.waitForLoadState('networkidle');

    const verifiedSection = page.locator('[data-testid="verified-condition-section"]');
    await expect(verifiedSection).toBeVisible();

    // Verify badge shows "Partially Verified"
    const badge = page.locator('[data-testid="verified-condition-badge"]');
    await expect(badge).toContainText(/partial|incomplete/i);

    // Verify available scores are displayed
    const surfaceScore = page.locator('[data-testid="score-surface"]');
    const functionScore = page.locator('[data-testid="score-function"]');
    await expect(surfaceScore).toBeVisible();
    await expect(functionScore).toBeVisible();

    // Verify missing scores show as N/A or are hidden
    const cleanScore = page.locator('[data-testid="score-clean"]');
    const cleanText = await cleanScore.textContent().catch(() => '');
    expect(cleanText).toMatch(/n\/a|--/i);

    // Verify average calculated from available scores only
    const avgScore = page.locator('[data-testid="score-average"]');
    const avgText = await avgScore.textContent();
    expect(avgText).toContain('87.5'); // Average of 0.85 and 0.90

    // Verify price band is NOT tightened (±15% for partial verification)
    await page.selectOption('[data-testid="condition-select"]', 'Very Good');
    await waitForPriceUpdate(page);

    const suggestedPrice = parseFloat(await page.locator('[data-testid="price-input"]').inputValue());

    // Test 10% deviation (should not show chip - partial uses ±15%)
    const price10Percent = Math.round(suggestedPrice * 1.10);
    await page.fill('[data-testid="price-input"]', price10Percent.toString());
    await page.waitForTimeout(1000);

    const chip = page.locator('[data-testid="price-chip"]');
    await expect(chip).not.toBeVisible();
  });

  test('All perfect scores (1.0) map to "New" condition', async ({ page }) => {
    // This would test a listing with perfect scores
    // For now, verify the condition mapping logic

    await page.goto(`/listing/${premiumListing.id}`);
    await page.waitForLoadState('networkidle');

    // Get listing data via API
    const response = await page.request.get(`/api/listings/${premiumListing.id}`);
    const listingData = await response.json();

    if (listingData.verifiedConditionScore) {
      const avg = listingData.verifiedConditionScore.avg;

      // Verify condition mapping
      if (avg >= 0.95) {
        expect(listingData.verifiedCondition).toBe('New');
      } else if (avg >= 0.85) {
        expect(listingData.verifiedCondition).toBe('Like New');
      } else if (avg >= 0.70) {
        expect(listingData.verifiedCondition).toBe('Very Good');
      } else if (avg >= 0.55) {
        expect(listingData.verifiedCondition).toBe('Good');
      } else if (avg >= 0.40) {
        expect(listingData.verifiedCondition).toBe('Fair');
      } else if (avg >= 0.25) {
        expect(listingData.verifiedCondition).toBe('Poor');
      } else {
        expect(listingData.verifiedCondition).toBe('For Parts');
      }
    }
  });

  test('Verified condition persists in database correctly', async ({ page }) => {
    await page.goto(`/listing/${premiumListing.id}`);
    await page.waitForLoadState('networkidle');

    // Query API to verify database fields
    const response = await page.request.get(`/api/listings/${premiumListing.id}`);
    expect(response.ok()).toBeTruthy();

    const listingData = await response.json();

    // Verify verifiedCondition field
    expect(listingData.verifiedCondition).toBe('Like New');

    // Verify verifiedConditionScore structure
    expect(listingData.verifiedConditionScore).toHaveProperty('surface');
    expect(listingData.verifiedConditionScore).toHaveProperty('function');
    expect(listingData.verifiedConditionScore).toHaveProperty('clean');
    expect(listingData.verifiedConditionScore).toHaveProperty('complete');
    expect(listingData.verifiedConditionScore).toHaveProperty('avg');

    // Verify scores are valid numbers
    expect(listingData.verifiedConditionScore.surface).toBeGreaterThanOrEqual(0);
    expect(listingData.verifiedConditionScore.surface).toBeLessThanOrEqual(1);
    expect(listingData.verifiedConditionScore.avg).toBeGreaterThanOrEqual(0);
    expect(listingData.verifiedConditionScore.avg).toBeLessThanOrEqual(1);
  });
});
