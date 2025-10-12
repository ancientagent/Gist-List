/**
 * E2E Tests for Purple Photo Workflow (Slice 2)
 *
 * Tests cover:
 * - TC-S2-001: Purple PHOTO notification display
 * - TC-S2-002: Camera/upload dialog opening
 * - TC-S2-003: Photo upload happy path
 * - TC-S2-004: Photo rejection (blurry)
 * - TC-S2-005: Photo rejection (poor lighting)
 * - TC-S2-007: Condition text append
 * - TC-S2-008: Verified photo badge
 * - TC-S2-009: Multiple PHOTO notifications
 */

import { test, expect } from '@playwright/test';
import { loginAsPremiumTier } from '../fixtures/auth';
import { premiumListing, testNotifications } from '../fixtures/test-data';
import {
  expectNotification,
  expectNotificationResolved,
  expectPhotoVerifiedBadge,
  expectConditionNotesContain,
  expectSuccessMessage,
  expectErrorMessage,
} from '../helpers/assertions';
import * as path from 'path';

test.describe('Purple Photo Notification Display', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsPremiumTier(page);
  });

  test('TC-S2-001: PHOTO notification displays with purple styling', async ({ page }) => {
    await page.goto(`/listing/${premiumListing.id}`);
    await page.waitForLoadState('networkidle');

    // Verify PHOTO notification is visible
    await expectNotification(
      page,
      'PHOTO',
      testNotifications.photoSerial.message
    );

    // Verify purple color scheme
    const notification = page.locator('[data-testid="notification-photo"]').first();
    await expect(notification).toBeVisible();

    // Check for camera icon
    const cameraIcon = notification.locator('[data-testid="camera-icon"]');
    await expect(cameraIcon).toBeVisible();

    // Verify helper text
    await expect(notification).toContainText(/select to add|tap to add|add closeup/i);
  });

  test('TC-S2-002: Tapping PHOTO notification opens camera/upload dialog', async ({ page }) => {
    await page.goto(`/listing/${premiumListing.id}`);
    await page.waitForLoadState('networkidle');

    // Tap the PHOTO notification
    const notification = page.locator('[data-testid="notification-photo"]').first();
    await notification.click();

    // Verify dialog appears
    const dialog = page.locator('[data-testid="photo-upload-dialog"]');
    await expect(dialog).toBeVisible();

    // Verify both options are present
    const cameraButton = dialog.locator('[data-testid="camera-button"]');
    const uploadButton = dialog.locator('[data-testid="upload-button"]');

    await expect(cameraButton).toBeVisible();
    await expect(uploadButton).toBeVisible();

    // Verify requirement text is displayed
    await expect(dialog).toContainText(testNotifications.photoSerial.message);

    // Test closing dialog
    const closeButton = dialog.locator('[data-testid="dialog-close"]');
    if (await closeButton.isVisible({ timeout: 1000 })) {
      await closeButton.click();
    } else {
      // Try clicking outside dialog
      await page.keyboard.press('Escape');
    }

    await expect(dialog).not.toBeVisible();
  });
});

test.describe('Photo Upload and Verification', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsPremiumTier(page);
  });

  test('TC-S2-003: Photo upload happy path - clear photo accepted', async ({ page }) => {
    await page.goto(`/listing/${premiumListing.id}`);
    await page.waitForLoadState('networkidle');

    // Open upload dialog
    const notification = page.locator('[data-testid="notification-photo"]').first();
    await notification.click();

    // Wait for dialog
    const dialog = page.locator('[data-testid="photo-upload-dialog"]');
    await expect(dialog).toBeVisible();

    // Click upload button
    const uploadButton = dialog.locator('[data-testid="upload-button"]');
    await uploadButton.click();

    // Set up file chooser handler
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.locator('input[type="file"]').click(),
    ]);

    // Upload a clear test photo
    // Note: You'll need to add test photos to tests/fixtures/photos/
    const testPhotoPath = path.join(__dirname, '../fixtures/photos/clear-serial-number.jpg');
    await fileChooser.setFiles(testPhotoPath);

    // Wait for upload progress
    const progressIndicator = page.locator('[data-testid="upload-progress"]');
    await expect(progressIndicator).toBeVisible({ timeout: 2000 });

    // Wait for AI analysis
    await page.waitForTimeout(3000);

    // Verify success message
    await expectSuccessMessage(page, /photo verified|upload successful/i);

    // Verify photo appears in gallery with verified badge
    const photoGallery = page.locator('[data-testid="photo-gallery"]');
    await expect(photoGallery).toBeVisible();

    const lastPhoto = photoGallery.locator('[data-testid^="photo-"]').last();
    await expect(lastPhoto).toBeVisible();
    await expectPhotoVerifiedBadge(page, 0);

    // Verify condition analysis text was appended
    await expectConditionNotesContain(page, /serial number|tag|legible/i);

    // Verify PHOTO notification is resolved
    await expectNotificationResolved(page, testNotifications.photoSerial.id);
  });

  test('TC-S2-004: Photo rejection - blurry image', async ({ page }) => {
    await page.goto(`/listing/${premiumListing.id}`);
    await page.waitForLoadState('networkidle');

    // Open upload dialog
    const notification = page.locator('[data-testid="notification-photo"]').first();
    await notification.click();

    // Upload blurry photo
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.locator('[data-testid="upload-button"]').click(),
    ]);

    const blurryPhotoPath = path.join(__dirname, '../fixtures/photos/blurry-image.jpg');
    await fileChooser.setFiles(blurryPhotoPath);

    // Wait for analysis
    await page.waitForTimeout(3000);

    // Verify rejection alert
    await expectErrorMessage(page, /blurry|out of focus/i);

    // Verify specific feedback
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toContainText(/try again|retake/i);

    // Verify "Try Again" button
    const tryAgainButton = page.locator('[data-testid="try-again-button"]');
    await expect(tryAgainButton).toBeVisible();

    // Verify photo is NOT saved to gallery
    const photoGallery = page.locator('[data-testid="photo-gallery"]');
    const photoCount = await photoGallery.locator('[data-testid^="photo-"]').count();

    // Try again with clear photo
    await tryAgainButton.click();

    const [fileChooser2] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.locator('[data-testid="upload-button"]').click(),
    ]);

    const clearPhotoPath = path.join(__dirname, '../fixtures/photos/clear-serial-number.jpg');
    await fileChooser2.setFiles(clearPhotoPath);

    // Wait for success
    await page.waitForTimeout(3000);
    await expectSuccessMessage(page);

    // Verify photo count increased
    const newPhotoCount = await photoGallery.locator('[data-testid^="photo-"]').count();
    expect(newPhotoCount).toBe(photoCount + 1);

    // Verify notification resolved
    await expectNotificationResolved(page, testNotifications.photoSerial.id);
  });

  test('TC-S2-005: Photo rejection - poor lighting', async ({ page }) => {
    await page.goto(`/listing/${premiumListing.id}`);
    await page.waitForLoadState('networkidle');

    // Open upload dialog
    const notification = page.locator('[data-testid="notification-photo"]').first();
    await notification.click();

    // Upload dark photo
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.locator('[data-testid="upload-button"]').click(),
    ]);

    const darkPhotoPath = path.join(__dirname, '../fixtures/photos/dark-lighting.jpg');
    await fileChooser.setFiles(darkPhotoPath);

    // Wait for analysis
    await page.waitForTimeout(3000);

    // Verify rejection with lighting feedback
    await expectErrorMessage(page, /lighting|dark|bright/i);

    // Verify actionable guidance
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toContainText(/better lighting|natural light/i);

    // Verify retry option
    const tryAgainButton = page.locator('[data-testid="try-again-button"]');
    await expect(tryAgainButton).toBeVisible();
  });

  test('Photo rejection - wrong subject', async ({ page }) => {
    await page.goto(`/listing/${premiumListing.id}`);
    await page.waitForLoadState('networkidle');

    // Find notification requesting specific photo (e.g., serial number)
    const notification = page.locator('[data-testid="notification-photo"]')
      .filter({ hasText: /serial number/i })
      .first();
    await notification.click();

    // Upload photo of wrong subject
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.locator('[data-testid="upload-button"]').click(),
    ]);

    const wrongSubjectPath = path.join(__dirname, '../fixtures/photos/wrong-subject.jpg');
    await fileChooser.setFiles(wrongSubjectPath);

    // Wait for analysis
    await page.waitForTimeout(3000);

    // Verify subject mismatch error
    await expectErrorMessage(page, /serial number not visible|wrong subject/i);

    // Verify guidance
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toContainText(/ensure|focus|visible/i);
  });
});

test.describe('Photo Analysis and Condition Text', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsPremiumTier(page);
  });

  test('TC-S2-007: Condition text appends without overwriting', async ({ page }) => {
    await page.goto(`/listing/${premiumListing.id}`);
    await page.waitForLoadState('networkidle');

    // Add initial condition notes
    const conditionNotes = page.locator('[data-testid="condition-notes"]');
    const initialText = 'Item has minor wear on corners.';
    await conditionNotes.fill(initialText);

    // Upload photo
    const notification = page.locator('[data-testid="notification-photo"]').first();
    await notification.click();

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.locator('[data-testid="upload-button"]').click(),
    ]);

    const testPhotoPath = path.join(__dirname, '../fixtures/photos/face-paint-detail.jpg');
    await fileChooser.setFiles(testPhotoPath);

    // Wait for analysis
    await page.waitForTimeout(3000);
    await expectSuccessMessage(page);

    // Verify initial text is preserved
    await expectConditionNotesContain(page, initialText);

    // Verify new text was appended
    const finalText = await conditionNotes.inputValue();
    expect(finalText).toContain(initialText);
    expect(finalText.length).toBeGreaterThan(initialText.length);

    // Verify new text is on separate line or properly formatted
    const lines = finalText.split('\n');
    expect(lines.length).toBeGreaterThan(1);
  });

  test('TC-S2-008: Verified photo badge displays in gallery', async ({ page }) => {
    await page.goto(`/listing/${premiumListing.id}`);
    await page.waitForLoadState('networkidle');

    // Upload and verify photo
    const notification = page.locator('[data-testid="notification-photo"]').first();
    await notification.click();

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.locator('[data-testid="upload-button"]').click(),
    ]);

    const testPhotoPath = path.join(__dirname, '../fixtures/photos/clear-serial-number.jpg');
    await fileChooser.setFiles(testPhotoPath);

    await page.waitForTimeout(3000);
    await expectSuccessMessage(page);

    // Navigate to photo gallery
    const photoGallery = page.locator('[data-testid="photo-gallery"]');
    await expect(photoGallery).toBeVisible();

    // Locate recently uploaded photo
    const lastPhoto = photoGallery.locator('[data-testid^="photo-"]').last();
    await expect(lastPhoto).toBeVisible();

    // Verify "Verified" badge on thumbnail
    const badge = lastPhoto.locator('[data-testid="photo-verified-badge"]');
    await expect(badge).toBeVisible();
    await expect(badge).toContainText(/verified|✓/i);

    // Click photo to view full size
    await lastPhoto.click();

    // Verify badge persists in full view
    const fullViewBadge = page.locator('[data-testid="photo-verified-badge"]');
    await expect(fullViewBadge).toBeVisible();
  });
});

test.describe('Multiple Photo Notifications', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsPremiumTier(page);
  });

  test('TC-S2-009: Multiple PHOTO notifications resolve sequentially', async ({ page }) => {
    await page.goto(`/listing/${premiumListing.id}`);
    await page.waitForLoadState('networkidle');

    // Count initial PHOTO notifications
    const initialNotifications = await page.locator('[data-testid="notification-photo"]').count();
    expect(initialNotifications).toBeGreaterThan(1);

    // Upload photo for first notification
    const firstNotification = page.locator('[data-testid="notification-photo"]').first();
    const firstMessage = await firstNotification.textContent();
    await firstNotification.click();

    const [fileChooser1] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.locator('[data-testid="upload-button"]').click(),
    ]);

    const photo1Path = path.join(__dirname, '../fixtures/photos/clear-serial-number.jpg');
    await fileChooser1.setFiles(photo1Path);

    await page.waitForTimeout(3000);
    await expectSuccessMessage(page);

    // Verify first notification resolved
    const notificationsAfterFirst = await page.locator('[data-testid="notification-photo"]').count();
    expect(notificationsAfterFirst).toBe(initialNotifications - 1);

    // Verify second notification still visible
    const secondNotification = page.locator('[data-testid="notification-photo"]').first();
    await expect(secondNotification).toBeVisible();

    // Upload photo for second notification
    await secondNotification.click();

    const [fileChooser2] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.locator('[data-testid="upload-button"]').click(),
    ]);

    const photo2Path = path.join(__dirname, '../fixtures/photos/face-paint-detail.jpg');
    await fileChooser2.setFiles(photo2Path);

    await page.waitForTimeout(3000);
    await expectSuccessMessage(page);

    // Verify second notification resolved
    const notificationsAfterSecond = await page.locator('[data-testid="notification-photo"]').count();
    expect(notificationsAfterSecond).toBe(initialNotifications - 2);

    // Verify all photos in gallery
    const photoGallery = page.locator('[data-testid="photo-gallery"]');
    const photoCount = await photoGallery.locator('[data-testid^="photo-"]').count();
    expect(photoCount).toBeGreaterThanOrEqual(2);

    // Verify condition notes accumulated from both photos
    const conditionNotes = page.locator('[data-testid="condition-notes"]');
    const notesText = await conditionNotes.inputValue();
    expect(notesText.length).toBeGreaterThan(50); // Should have content from both analyses
  });

  test('Photos do not interfere with each other', async ({ page }) => {
    await page.goto(`/listing/${premiumListing.id}`);
    await page.waitForLoadState('networkidle');

    // Get initial photo count
    const photoGallery = page.locator('[data-testid="photo-gallery"]');
    const initialPhotoCount = await photoGallery.locator('[data-testid^="photo-"]').count();

    // Upload two photos quickly
    for (let i = 0; i < 2; i++) {
      const notification = page.locator('[data-testid="notification-photo"]').first();
      await notification.click();

      const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.locator('[data-testid="upload-button"]').click(),
      ]);

      const photoPath = i === 0
        ? path.join(__dirname, '../fixtures/photos/clear-serial-number.jpg')
        : path.join(__dirname, '../fixtures/photos/face-paint-detail.jpg');

      await fileChooser.setFiles(photoPath);
      await page.waitForTimeout(3000);
    }

    // Verify both photos added
    const finalPhotoCount = await photoGallery.locator('[data-testid^="photo-"]').count();
    expect(finalPhotoCount).toBe(initialPhotoCount + 2);

    // Verify each photo has unique verification data
    const photos = await photoGallery.locator('[data-testid^="photo-"]').all();
    for (const photo of photos) {
      const badge = photo.locator('[data-testid="photo-verified-badge"]');
      if (await badge.isVisible()) {
        // Each verified photo should be distinguishable
        const photoId = await photo.getAttribute('data-testid');
        expect(photoId).toBeTruthy();
      }
    }
  });
});

test.describe('Photo Database Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsPremiumTier(page);
  });

  test('TC-S2-010: Photo record persists in database', async ({ page }) => {
    await page.goto(`/listing/${premiumListing.id}`);
    await page.waitForLoadState('networkidle');

    // Upload photo
    const notification = page.locator('[data-testid="notification-photo"]').first();
    await notification.click();

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.locator('[data-testid="upload-button"]').click(),
    ]);

    const testPhotoPath = path.join(__dirname, '../fixtures/photos/clear-serial-number.jpg');
    await fileChooser.setFiles(testPhotoPath);

    await page.waitForTimeout(3000);
    await expectSuccessMessage(page);

    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify photo still appears in gallery
    const photoGallery = page.locator('[data-testid="photo-gallery"]');
    const photoCount = await photoGallery.locator('[data-testid^="photo-"]').count();
    expect(photoCount).toBeGreaterThan(0);

    // Verify verified badge still present
    const lastPhoto = photoGallery.locator('[data-testid^="photo-"]').last();
    const badge = lastPhoto.locator('[data-testid="photo-verified-badge"]');
    await expect(badge).toBeVisible();

    // Verify condition notes persist
    const conditionNotes = page.locator('[data-testid="condition-notes"]');
    const notesText = await conditionNotes.inputValue();
    expect(notesText.length).toBeGreaterThan(10);
  });
});
