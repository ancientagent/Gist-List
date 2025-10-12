/**
 * Custom Assertions for GISTer E2E Tests
 *
 * Provides specialized assertion helpers for pricing, notifications, badges, and more
 */

import { expect, Page, Locator } from '@playwright/test';

/**
 * Assert that a price value is within a percentage range
 */
export async function expectPriceInRange(
  actualPrice: number,
  expectedPrice: number,
  tolerancePercent: number
) {
  const lowerBound = expectedPrice * (1 - tolerancePercent / 100);
  const upperBound = expectedPrice * (1 + tolerancePercent / 100);

  expect(actualPrice).toBeGreaterThanOrEqual(lowerBound);
  expect(actualPrice).toBeLessThanOrEqual(upperBound);
}

/**
 * Assert that a price deviation chip is visible with correct values
 */
export async function expectPriceDeviationChip(
  page: Page,
  suggestedPrice: number,
  direction: 'up' | 'down'
) {
  const chipText = `Set $${suggestedPrice}`;
  const chip = page.locator(`[data-testid="price-chip"]:has-text("${chipText}")`);

  await expect(chip).toBeVisible();

  // Check for direction arrow
  const arrow = direction === 'up' ? '↑' : '↓';
  await expect(chip).toContainText(arrow);
}

/**
 * Assert that a notification is displayed with correct type and message
 */
export async function expectNotification(
  page: Page,
  type: 'ALERT' | 'QUESTION' | 'INSIGHT' | 'PHOTO',
  message: string
) {
  const notification = page.locator(`[data-testid="notification-${type.toLowerCase()}"]`).filter({
    hasText: message,
  });

  await expect(notification).toBeVisible();

  // Verify color coding based on type
  if (type === 'PHOTO') {
    await expect(notification).toHaveClass(/purple|photo/);
  } else if (type === 'ALERT') {
    await expect(notification).toHaveClass(/red|alert/);
  } else if (type === 'QUESTION') {
    await expect(notification).toHaveClass(/blue|question/);
  } else if (type === 'INSIGHT') {
    await expect(notification).toHaveClass(/insight/);
  }
}

/**
 * Assert that a notification is NOT visible (resolved)
 */
export async function expectNotificationResolved(
  page: Page,
  notificationId: string
) {
  const notification = page.locator(`[data-testid="notification-${notificationId}"]`);
  await expect(notification).not.toBeVisible();
}

/**
 * Assert that a premium badge is displayed
 */
export async function expectPremiumBadge(page: Page, specialClass?: string) {
  const badge = page.locator('[data-testid="premium-badge"]');
  await expect(badge).toBeVisible();

  // Check for gem icon or special class label
  if (specialClass) {
    await expect(badge).toContainText(specialClass, { ignoreCase: true });
  }
}

/**
 * Assert that verified condition badge is displayed
 */
export async function expectVerifiedConditionBadge(
  page: Page,
  conditionLevel?: string
) {
  const badge = page.locator('[data-testid="verified-condition-badge"]');
  await expect(badge).toBeVisible();
  await expect(badge).toContainText('Verified');

  if (conditionLevel) {
    await expect(badge).toContainText(conditionLevel);
  }
}

/**
 * Assert that verified condition scores are displayed correctly
 */
export async function expectVerifiedConditionScores(
  page: Page,
  scores: {
    surface?: number;
    function?: number;
    clean?: number;
    complete?: number;
    avg?: number;
  }
) {
  if (scores.surface !== undefined) {
    const surfaceScore = page.locator('[data-testid="score-surface"]');
    await expect(surfaceScore).toContainText(`${(scores.surface * 100).toFixed(0)}%`);
  }

  if (scores.function !== undefined) {
    const functionScore = page.locator('[data-testid="score-function"]');
    await expect(functionScore).toContainText(`${(scores.function * 100).toFixed(0)}%`);
  }

  if (scores.clean !== undefined) {
    const cleanScore = page.locator('[data-testid="score-clean"]');
    await expect(cleanScore).toContainText(`${(scores.clean * 100).toFixed(0)}%`);
  }

  if (scores.complete !== undefined) {
    const completeScore = page.locator('[data-testid="score-complete"]');
    await expect(completeScore).toContainText(`${(scores.complete * 100).toFixed(0)}%`);
  }

  if (scores.avg !== undefined) {
    const avgScore = page.locator('[data-testid="score-average"]');
    await expect(avgScore).toContainText(`${(scores.avg * 100).toFixed(1)}%`);
  }
}

/**
 * Assert that facets are displayed in Roadshow Reveal
 */
export async function expectFacetsDisplayed(
  page: Page,
  facets: Array<{ name: string; confidence: number }>
) {
  for (const facet of facets) {
    const facetElement = page.locator(`[data-testid="facet-${facet.name.replace(/\s+/g, '-').toLowerCase()}"]`);
    await expect(facetElement).toBeVisible();
    await expect(facetElement).toContainText(`${(facet.confidence * 100).toFixed(0)}%`);
  }
}

/**
 * Assert that Roadshow Reveal shows correct baseline vs verified value
 */
export async function expectRoadshowReveal(
  page: Page,
  baselineValue: number,
  verifiedValue: number
) {
  const baselineElement = page.locator('[data-testid="baseline-value"]');
  await expect(baselineElement).toContainText(`$${baselineValue.toFixed(2)}`);

  const verifiedElement = page.locator('[data-testid="verified-value"]');
  await expect(verifiedElement).toContainText(`$${verifiedValue.toFixed(2)}`);

  // Check increase amount
  const increase = verifiedValue - baselineValue;
  const increasePercent = ((increase / baselineValue) * 100).toFixed(0);
  const increaseElement = page.locator('[data-testid="value-increase"]');
  await expect(increaseElement).toContainText(`+$${increase.toFixed(2)}`);
  await expect(increaseElement).toContainText(`${increasePercent}%`);
}

/**
 * Assert that price uplift is capped at 20%
 */
export async function expectUpliftCapped(page: Page) {
  const capMessage = page.locator('[data-testid="uplift-cap-message"]');
  await expect(capMessage).toBeVisible();
  await expect(capMessage).toContainText('Capped at 20%');
}

/**
 * Assert that a photo has verified badge
 */
export async function expectPhotoVerifiedBadge(page: Page, photoIndex: number) {
  const photo = page.locator(`[data-testid="photo-${photoIndex}"]`);
  const badge = photo.locator('[data-testid="photo-verified-badge"]');
  await expect(badge).toBeVisible();
}

/**
 * Assert that condition notes contain specific text
 */
export async function expectConditionNotesContain(
  page: Page,
  expectedText: string
) {
  const conditionNotes = page.locator('[data-testid="condition-notes"]');
  const text = await conditionNotes.inputValue();
  expect(text).toContain(expectedText);
}

/**
 * Assert that condition notes do NOT contain specific text
 */
export async function expectConditionNotesNotContain(
  page: Page,
  unexpectedText: string
) {
  const conditionNotes = page.locator('[data-testid="condition-notes"]');
  const text = await conditionNotes.inputValue();
  expect(text).not.toContain(unexpectedText);
}

/**
 * Assert that Quick Facts panel is open
 */
export async function expectQuickFactsOpen(page: Page) {
  const panel = page.locator('[data-testid="quick-facts-panel"]');
  await expect(panel).toBeVisible();
}

/**
 * Assert that Quick Facts panel is closed
 */
export async function expectQuickFactsClosed(page: Page) {
  const panel = page.locator('[data-testid="quick-facts-panel"]');
  await expect(panel).not.toBeVisible();
}

/**
 * Assert that a chip is selected in Quick Facts
 */
export async function expectQuickFactsChipSelected(
  page: Page,
  chipText: string
) {
  const chip = page.locator(`[data-testid="quick-facts-chip"]:has-text("${chipText}")`);
  await expect(chip).toHaveAttribute('data-selected', 'true');
}

/**
 * Assert that price field has a specific value
 */
export async function expectPriceValue(page: Page, expectedPrice: number) {
  const priceInput = page.locator('[data-testid="price-input"]');
  const value = await priceInput.inputValue();
  const actualPrice = parseFloat(value.replace(/[$,]/g, ''));
  expect(actualPrice).toBeCloseTo(expectedPrice, 2);
}

/**
 * Assert that condition dropdown has a specific value
 */
export async function expectConditionValue(page: Page, expectedCondition: string) {
  const conditionSelect = page.locator('[data-testid="condition-select"]');
  await expect(conditionSelect).toHaveValue(expectedCondition);
}

/**
 * Assert that upgrade CTA is displayed for free users
 */
export async function expectUpgradeCTA(page: Page) {
  const cta = page.locator('[data-testid="upgrade-cta"]');
  await expect(cta).toBeVisible();
  await expect(cta).toContainText(/upgrade|premium/i);
}

/**
 * Assert that upgrade CTA is NOT displayed
 */
export async function expectNoUpgradeCTA(page: Page) {
  const cta = page.locator('[data-testid="upgrade-cta"]');
  await expect(cta).not.toBeVisible();
}

/**
 * Assert that loading spinner is visible
 */
export async function expectLoadingSpinner(page: Page) {
  const spinner = page.locator('[data-testid="loading-spinner"]');
  await expect(spinner).toBeVisible();
}

/**
 * Assert that loading spinner is hidden
 */
export async function expectNoLoadingSpinner(page: Page) {
  const spinner = page.locator('[data-testid="loading-spinner"]');
  await expect(spinner).not.toBeVisible();
}

/**
 * Assert that an error message is displayed
 */
export async function expectErrorMessage(page: Page, errorText?: string) {
  const error = page.locator('[data-testid="error-message"]');
  await expect(error).toBeVisible();

  if (errorText) {
    await expect(error).toContainText(errorText);
  }
}

/**
 * Assert that a success message/toast is displayed
 */
export async function expectSuccessMessage(page: Page, successText?: string) {
  const success = page.locator('[data-testid="success-message"], .toast-success');
  await expect(success).toBeVisible({ timeout: 5000 });

  if (successText) {
    await expect(success).toContainText(successText);
  }
}

/**
 * Assert that a database record exists with specific values
 */
export async function expectDatabaseRecord(
  page: Page,
  table: string,
  id: string,
  expectedFields: Record<string, any>
) {
  // This would require a test API endpoint to query the database
  const response = await page.request.get(`/api/test/db/${table}/${id}`);
  expect(response.ok()).toBeTruthy();

  const data = await response.json();
  for (const [field, expectedValue] of Object.entries(expectedFields)) {
    expect(data[field]).toEqual(expectedValue);
  }
}

/**
 * Helper to extract numeric value from price text
 */
export function parsePriceFromText(text: string): number {
  const match = text.match(/\$?([\d,]+\.?\d*)/);
  if (!match) {
    throw new Error(`Could not parse price from text: ${text}`);
  }
  return parseFloat(match[1].replace(/,/g, ''));
}

/**
 * Helper to wait for price to stabilize (useful after condition changes)
 */
export async function waitForPriceUpdate(page: Page, timeout = 3000) {
  await page.waitForTimeout(500); // Wait for initial update
  const priceInput = page.locator('[data-testid="price-input"]');

  let lastValue = await priceInput.inputValue();
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    await page.waitForTimeout(200);
    const currentValue = await priceInput.inputValue();
    if (currentValue === lastValue) {
      // Price has stabilized
      return;
    }
    lastValue = currentValue;
  }
}
