/**
 * Authentication Fixtures for GISTer E2E Tests
 *
 * Provides helper functions for handling NextAuth authentication in Playwright tests
 */

import { Page } from '@playwright/test';
import { testUsers, TestUser } from './test-data';

/**
 * Login using the signin page
 */
export async function login(page: Page, user: TestUser = testUsers.freeTier) {
  await page.goto('/auth/signin');

  // Wait for the signin form to load
  await page.waitForSelector('#email', { timeout: 10000 });

  // Fill in credentials
  await page.fill('#email', user.email);
  await page.fill('#password', user.password);

  // Submit the form
  await page.click('button[type="submit"]');

  // Wait for navigation to complete (redirects to /camera after signin)
  await page.waitForURL(/\/(camera|listings|listing)/, { timeout: 15000 });

  // Verify we're logged in by checking for user session
  const cookies = await page.context().cookies();
  const hasSessionToken = cookies.some(cookie =>
    cookie.name.includes('next-auth.session-token') ||
    cookie.name.includes('__Secure-next-auth.session-token')
  );

  if (!hasSessionToken) {
    throw new Error('Login failed - no session token found');
  }

  return true;
}

/**
 * Login as free tier user
 */
export async function loginAsFreeTier(page: Page) {
  return login(page, testUsers.freeTier);
}

/**
 * Login as premium tier user
 */
export async function loginAsPremiumTier(page: Page) {
  return login(page, testUsers.premiumTier);
}

/**
 * Login as user with condition report preference off
 */
export async function loginAsPreferenceOff(page: Page) {
  return login(page, testUsers.preferenceOff);
}

/**
 * Logout from the application
 */
export async function logout(page: Page) {
  // Navigate to signout page
  await page.goto('/auth/signout');

  // Confirm signout if there's a confirmation button
  const signoutButton = page.locator('button:has-text("Sign out")');
  if (await signoutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await signoutButton.click();
  }

  // Wait for redirect to signin or home page
  await page.waitForURL(/\/(auth\/signin|$)/, { timeout: 10000 });

  // Verify session is cleared
  const cookies = await page.context().cookies();
  const hasSessionToken = cookies.some(cookie =>
    cookie.name.includes('next-auth.session-token') ||
    cookie.name.includes('__Secure-next-auth.session-token')
  );

  return !hasSessionToken;
}

/**
 * Check if user is currently logged in
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  const cookies = await page.context().cookies();
  return cookies.some(cookie =>
    cookie.name.includes('next-auth.session-token') ||
    cookie.name.includes('__Secure-next-auth.session-token')
  );
}

/**
 * Setup authenticated session storage
 * This can be used to bypass the login UI for faster tests
 */
export async function setupAuthenticatedSession(page: Page, user: TestUser) {
  // First, perform actual login to get valid session
  await login(page, user);

  // Save authentication state
  const storageState = await page.context().storageState();

  return storageState;
}

/**
 * Create a test user account via API (if signup endpoint exists)
 */
export async function createTestUser(page: Page, user: TestUser): Promise<boolean> {
  try {
    const response = await page.request.post('/api/signup', {
      data: {
        email: user.email,
        password: user.password,
        fullName: user.fullName,
      },
    });

    return response.ok();
  } catch (error) {
    console.error('Failed to create test user:', error);
    return false;
  }
}

/**
 * Delete a test user (cleanup after tests)
 */
export async function deleteTestUser(page: Page, userId: string): Promise<boolean> {
  try {
    // This would need an admin API endpoint to delete users
    // For now, this is a placeholder
    const response = await page.request.delete(`/api/admin/users/${userId}`);
    return response.ok();
  } catch (error) {
    console.error('Failed to delete test user:', error);
    return false;
  }
}

/**
 * Wait for authentication to complete
 */
export async function waitForAuth(page: Page, timeout = 10000): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await isLoggedIn(page)) {
      return true;
    }
    await page.waitForTimeout(500);
  }

  return false;
}

/**
 * Get current user info from the page
 */
export async function getCurrentUser(page: Page): Promise<any> {
  // Attempt to extract user info from the page
  // This assumes there's a user menu or profile section
  try {
    return await page.evaluate(() => {
      // Try to get user from window object if available
      return (window as any).__USER__;
    });
  } catch {
    return null;
  }
}

/**
 * Verify user has correct subscription tier
 */
export async function verifySubscriptionTier(page: Page, expectedTier: string): Promise<boolean> {
  const user = await getCurrentUser(page);
  return user?.subscriptionTier === expectedTier;
}

/**
 * Helper to ensure clean auth state before test
 */
export async function cleanAuthState(page: Page) {
  // Clear cookies
  await page.context().clearCookies();

  // Clear local storage
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}
