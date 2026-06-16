/**
 * Shared Playwright Selectors for Nuxt TimeReward UI
 * 
 * This file contains proven selectors adapted for the Nuxt/Tailwind-based UI.
 * When writing new tests, import from here to avoid rediscovering selector patterns.
 * 
 * Usage:
 *   import { getActivityCard, getTodayRewardableTime } from '../test-utils/selectors';
 */

import { Page, Locator } from '@playwright/test';

// ============================================================================
// Constants
// ============================================================================

/** Default timeout for element interactions (ms) */
export const DEFAULT_TIMEOUT = 5000;

/** Test user credentials */
export const TEST_USER = {
  username: 'kyrie',
  email: 'kyrie@timereward.local',
  password: '@Password1',
  firstName: 'Kyrie',
  lastName: 'Irving'
};

// ============================================================================
// Activity Card Selectors
// ============================================================================

/**
 * Activity name headings inside the home page activity list.
 */
export function getActivityNameHeadings(page: Page): Locator {
  return page.locator('div.space-y-3 > div h3');
}

/**
 * Get an activity card by name.
 * In Nuxt UI, activity cards are rounded-xl rows in div.space-y-3 with an h3 for the name.
 *
 * @example
 * const workCard = getActivityCard(page, 'Work');
 * await workCard.waitFor({ state: 'visible' });
 */
export function getActivityCard(page: Page, activityName: string): Locator {
  return page.locator('div.space-y-3 > div').filter({
    has: page.getByRole('heading', { level: 3, name: activityName, exact: true }),
  }).first();
}

/**
 * Get the play/pause button for an activity.
 * In Nuxt UI, this is a round button with w-12 h-12 classes.
 * 
 * @example
 * await getActivityPlayButton(page, 'Work').click();
 */
export function getActivityPlayButton(page: Page, activityName: string): Locator {
  return getActivityCard(page, activityName).locator('button.w-12.h-12.rounded-full').first();
}

/**
 * Get the activity timer display (e.g., "00:01:30").
 * In Nuxt UI, this is a span.timer-display element.
 * 
 * @example
 * const time = await getActivityTime(page, 'Work').innerText();
 */
export function getActivityTime(page: Page, activityName: string): Locator {
  return getActivityCard(page, activityName).locator('span.timer-display').first();
}

// ============================================================================
// Rewardable Time Selectors
// ============================================================================

/**
 * Get Today's rewardable time value element.
 * Note: The Nuxt UI may not have a dedicated "Today Rewardable Time" section yet.
 * This selector targets the summary totals section if available.
 */
export function getTodayRewardableTime(page: Page): Locator {
  return page.locator('text=Rewardable').locator('xpath=following-sibling::*').first();
}

/**
 * Get the rewardable total from the summary section.
 */
export function getRewardableTotalTime(page: Page): Locator {
  return page.locator('[data-testid="rewardable-total"]')
    .or(page.locator('text=/Rewardable.*\\d+:\\d+:\\d+/'));
}

// ============================================================================
// AutoPause Status Selectors
// ============================================================================

/**
 * Get the primary autopause status line.
 * Uses the #autopause-status ID selector (same as Blazor).
 * 
 * @example
 * const status = await getAutoPauseStatus(page).textContent();
 * // Running: "Activity Work Auto Pause in 2m 59s"
 * // Auto-paused: "Auto Paused after 3 minutes of total activity"
 */
export function getAutoPauseStatus(page: Page): Locator {
  return page.locator('#autopause-status').first();
}

/**
 * Get the secondary status line (last activity info).
 * Only present when auto-paused or on break (PRD 4.2.1: no secondary line when running).
 * In Nuxt UI, this is a p.text-slate-400 element in the status container.
 * 
 * @example
 * const secondary = await getAutoPauseSecondaryStatus(page).textContent();
 * // "last Activity run: Chores" (when auto-paused or on break)
 */
export function getAutoPauseSecondaryStatus(page: Page): Locator {
  return page.locator('#status-message-container p.text-slate-400').first();
}

/**
 * Get the status message container.
 */
export function getStatusMessageContainer(page: Page): Locator {
  return page.locator('#status-message-container').first();
}

// ============================================================================
// Login/Authentication Selectors
// ============================================================================

/**
 * Navigate to login page and perform login.
 * In Nuxt, login is a separate page at /login.
 * 
 * @example
 * await performLogin(page, 'kyrie', '@Password1');
 */
export async function performLogin(
  page: Page, 
  username: string = TEST_USER.username, 
  password: string = TEST_USER.password
): Promise<void> {
  // Navigate to login page if not already there
  if (!page.url().includes('/login')) {
    await page.goto('/login');
  }
  
  // Wait for page to fully load and hydrate
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000); // Extra time for Vue hydration
  
  // Fill username (input#username with type="text")
  const usernameInput = page.locator('input#username');
  await usernameInput.waitFor({ state: 'visible', timeout: 5000 });
  await usernameInput.fill(username);
  
  // Fill password (input#password)
  const passwordInput = page.locator('input#password');
  await passwordInput.fill(password);
  
  // Wait longer for Vue/Nuxt hydration to complete
  // Nuxt SSR apps need time for hydration before events work
  console.log(`  Waiting for Vue hydration...`);
  await page.waitForTimeout(2000);
  
  // Click login button
  console.log(`  Clicking Sign In button...`);
  const submitBtn = page.getByRole('button', { name: 'Sign In' });
  await submitBtn.waitFor({ state: 'visible' });
  
  // Try clicking the button first
  await submitBtn.click();
  
  // Wait for the button text to change to "Signing in..." or become disabled
  let formSubmitted = false;
  try {
    await page.waitForFunction(
      () => {
        const btn = document.querySelector('button[type="submit"]');
        return btn && (btn.textContent?.includes('Signing') || btn.disabled);
      },
      { timeout: 3000 }
    );
    console.log(`  Form submitted via button click`);
    formSubmitted = true;
  } catch {
    console.log(`  Button click didn't trigger form, trying Enter key...`);
  }
  
  if (!formSubmitted) {
    // Try pressing Enter on the password field to submit
    await passwordInput.press('Enter');
    try {
      await page.waitForFunction(
        () => {
          const btn = document.querySelector('button[type="submit"]');
          return btn && (btn.textContent?.includes('Signing') || btn.disabled);
        },
        { timeout: 3000 }
      );
      console.log(`  Form submitted via Enter key`);
      formSubmitted = true;
    } catch {
      console.log(`  Enter key didn't trigger form either`);
    }
  }
  
  // Wait for navigation using multiple strategies
  // Strategy 1: Wait for URL change
  // Strategy 2: Wait for home page elements to appear
  // Strategy 3: Check for error messages
  
  let navigationSucceeded = false;
  
  // First, try waiting for URL change
  try {
    await page.waitForURL('**/home', { timeout: 10000 });
    navigationSucceeded = true;
    console.log('  ✅ Login successful, navigated to /home (URL changed)');
  } catch {
    // URL didn't change, but Nuxt's client-side navigation might have occurred
    // Check if we're now on the home page by looking for home-specific elements
    console.log('  ⏳ URL wait timeout, checking for home page elements...');
  }
  
  if (!navigationSucceeded) {
    // Strategy 2: Look for elements that only exist on home page
    try {
      const homeIndicators = page.locator('button:has-text("Sign out"), h1:has-text("TimeReward") + div:has-text("Connecting"), h1:has-text("TimeReward") + div:has-text("Connected")');
      await homeIndicators.first().waitFor({ state: 'visible', timeout: 5000 });
      navigationSucceeded = true;
      console.log('  ✅ Login successful, found home page elements');
    } catch {
      console.log('  ⏳ No home page elements found...');
    }
  }
  
  if (!navigationSucceeded) {
    // Strategy 3: Check for error message
    const errorLocator = page.locator('.text-red-400, .bg-red-500\\/10, [class*="error"]');
    const errorCount = await errorLocator.count();
    if (errorCount > 0) {
      const errorText = await errorLocator.first().textContent();
      console.log(`  ❌ Login error displayed: ${errorText}`);
      throw new Error(`Login failed: ${errorText}`);
    }
    
    // Check if button is still showing "Sign In" (login failed silently)
    const btnText = await submitBtn.textContent();
    const currentUrl = page.url();
    console.log(`  Button text: "${btnText}"`);
    console.log(`  Current URL: ${currentUrl}`);
    
    // If still on login page, try one more time with longer wait
    if (currentUrl.includes('/login') && btnText === 'Sign In') {
      console.log('  Retrying login...');
      // Re-click the button
      await submitBtn.click();
      try {
        await page.waitForURL('**/home', { timeout: 15000 });
        navigationSucceeded = true;
        console.log('  ✅ Login successful on retry');
      } catch {
        // Really failed
        throw new Error(
          'Login did not navigate to /home. Check:\n' +
          '  - User exists in Supabase auth.users\n' +
          '  - Password is correct (@Password1)\n' +
          '  - SUPABASE_URL and SUPABASE_KEY in .env point to correct instance\n' +
          '  - RPC function get_email_by_username exists and is accessible'
        );
      }
    }
  }
  
  // Wait for page to stabilize after navigation
  await page.waitForTimeout(2000);
}

/**
 * Check if user is logged in by looking for elements on the home page.
 */
export async function isUserLoggedIn(page: Page): Promise<boolean> {
  try {
    // Check for logout button or settings link
    const logoutBtn = page.locator('text=Logout, button:has-text("Sign Out")').first();
    return await logoutBtn.isVisible({ timeout: 2000 });
  } catch {
    return false;
  }
}

/**
 * Perform logout.
 */
export async function performLogout(page: Page): Promise<void> {
  const logoutBtn = page.locator('text=Logout').or(page.locator('button:has-text("Sign Out")')).first();
  await logoutBtn.click();
  await page.waitForURL('**/login', { timeout: 5000 });
}

// ============================================================================
// Settings Selectors
// ============================================================================

/**
 * Navigate to settings page.
 */
export async function navigateToSettings(page: Page): Promise<void> {
  await page.goto('/settings');
  await page.waitForLoadState('networkidle');
}

/**
 * Get the Auto Pause minutes input on settings page.
 */
export function getAutoPauseInput(page: Page): Locator {
  return page.locator('input[type="number"]').first();
}

/**
 * Set the AutoPause interval on the settings page.
 */
export async function setAutoPauseInterval(page: Page, minutes: number): Promise<void> {
  await navigateToSettings(page);
  
  const input = getAutoPauseInput(page);
  await input.fill(String(minutes));
  
  // Trigger change event
  await input.press('Tab');
  
  // Wait for save
  await page.waitForTimeout(1000);
  
  // Navigate back to home
  await page.goto('/home');
  await page.waitForLoadState('networkidle');
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Parse a time string like "00:09:04" (HH:MM:SS) into total seconds.
 * 
 * @example
 * parseHHMMSSToSeconds("00:09:04")  // returns 544
 * parseHHMMSSToSeconds("01:30:00")  // returns 5400
 */
export function parseHHMMSSToSeconds(timeStr: string): number {
  const match = timeStr.match(/(\d+):(\d+):(\d+)/);
  if (match) {
    return parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]);
  }
  return 0;
}

/**
 * Parse a time string like "9h 4m" into total minutes.
 * 
 * @example
 * parseTimeToMinutes("9h 4m")  // returns 544
 * parseTimeToMinutes("0h 15m") // returns 15
 */
export function parseTimeToMinutes(timeStr: string): number {
  const match = timeStr.match(/(\d+)h\s*(\d+)m/);
  if (match) {
    return parseInt(match[1]) * 60 + parseInt(match[2]);
  }
  return 0;
}

/**
 * Parse a time string like "1m 30s" into total seconds.
 * 
 * @example
 * parseTimeToSeconds("1m 30s")  // returns 90
 * parseTimeToSeconds("2m 0s")   // returns 120
 */
export function parseTimeToSeconds(timeStr: string): number {
  const match = timeStr.match(/(\d+)m\s*(\d+)s/);
  if (match) {
    return parseInt(match[1]) * 60 + parseInt(match[2]);
  }
  return 0;
}

/**
 * Wait for the user to press Enter before continuing.
 * Used when ENTER_FOR_CLOSE is specified to allow manual inspection.
 */
export async function waitForEnterKey(message: string = 'Press Enter to close browsers and exit...'): Promise<void> {
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    console.log(`\n🔍 ${message}`);
    rl.question('', () => {
      rl.close();
      resolve();
    });
  });
}
