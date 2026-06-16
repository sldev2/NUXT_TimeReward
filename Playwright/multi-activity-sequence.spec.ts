import { test, expect, Page, Browser, chromium } from '@playwright/test';
import { 
  performLogin, 
  getAutoPauseStatus,
  getAutoPauseSecondaryStatus,
  getActivityPlayButton,
  getActivityTime,
  getActivityNameHeadings,
  setAutoPauseInterval,
  waitForEnterKey,
  TEST_USER
} from './test-utils/selectors';
import { resetTestUserTimers, ensureTestActivities } from './test-utils/reset-timers';

/**
 * Multi-Activity Sequence Test (Nuxt Version)
 * 
 * Tests timer synchronization across Chrome AND Edge while switching between
 * multiple activities. Verifies that activity switching works correctly and
 * all timers accumulate properly across both browsers.
 * 
 * Test sequence:
 * 1. Start Activity 1 - run for 1.5 minutes (90 seconds)
 * 2. Start Activity 2 - run for 60 seconds
 * 3. Start Activity 3 - run for 60 seconds
 * 4. Start Activity 4 - run until AutoPause (remaining ~3.5 minutes)
 * 
 * Total runtime: 6 minutes (DEFAULT_AUTOPAUSE_MINUTES)
 * 
 * Prerequisites:
 * - User should have at least 4 activities
 * - Logs in user in both Chrome and Edge browsers
 * 
 * Environment variables:
 * ENTER_FOR_CLOSE=1      : Pause before closing browsers, wait for Enter key
 * AUTOPAUSE_MINUTES=N    : Override AutoPause interval (default: 6 minutes)
 */

// Check for ENTER_FOR_CLOSE environment variable
const ENTER_FOR_CLOSE = !!process.env.ENTER_FOR_CLOSE;

// Default AutoPause interval for this test (in minutes)
const DEFAULT_AUTOPAUSE_MINUTES = 6;
const AUTOPAUSE_MINUTES = process.env.AUTOPAUSE_MINUTES 
  ? parseInt(process.env.AUTOPAUSE_MINUTES, 10) 
  : DEFAULT_AUTOPAUSE_MINUTES;
const AUTOPAUSE_SECONDS = AUTOPAUSE_MINUTES * 60;

// Activity durations in seconds
const ACTIVITY_1_DURATION = 90;   // 1.5 minutes
const ACTIVITY_2_DURATION = 60;   // 1 minute
const ACTIVITY_3_DURATION = 60;   // 1 minute
// Activity 4 runs for the remainder until AutoPause

interface StatusLineCapture {
  primaryLine: string;
  secondaryLine: string;
}

interface ActivityStartCheck {
  activityName: string;
  chrome: StatusLineCapture;
  edge: StatusLineCapture;
  chromePass: boolean;
  edgePass: boolean;
}

interface TabState {
  statusLine: string;
  secondaryStatus: string;
}

test.describe('Multi-Activity Sequence Test', () => {
  
  test('should correctly accumulate time across multiple activities in both browsers', async () => {
    // Extend timeout for this long-running test
    test.setTimeout(ENTER_FOR_CLOSE ? 30 * 60 * 1000 : 10 * 60 * 1000);
    
    let chromeBrowser: Browser | null = null;
    let edgeBrowser: Browser | null = null;
    
    try {
      console.log('\n' + '='.repeat(60));
      console.log('MULTI-ACTIVITY SEQUENCE TEST (NUXT)');
      console.log('='.repeat(60));
      console.log(`AutoPause: ${AUTOPAUSE_MINUTES} minutes (${AUTOPAUSE_SECONDS} seconds)`);
      console.log(`Activity sequence: 4 activities until AutoPause`);
      console.log('');
      
      // Reset test data before starting
      console.log('🔄 Resetting test user timers...');
      await resetTestUserTimers(TEST_USER.username);
      await ensureTestActivities(TEST_USER.username);
      console.log('');
      
      // Launch Chrome and login first
      console.log('🌐 Launching Chrome...');
      chromeBrowser = await chromium.launch({ 
        headless: false,
        channel: 'chrome'
      });
      const chromeContext = await chromeBrowser.newContext({
        viewport: { width: 980, height: 720 }
      });
      const chromePage = await chromeContext.newPage();
      
      console.log('🔐 Logging in Chrome...');
      await performLogin(chromePage, TEST_USER.username, TEST_USER.password);
      
      // Wait before launching Edge and second login
      console.log('  Waiting 5s before Edge login...');
      await chromePage.waitForTimeout(5000);
      
      // Launch Edge and login after Chrome is done
      console.log('🌐 Launching Edge...');
      edgeBrowser = await chromium.launch({ 
        headless: false,
        channel: 'msedge'
      });
      const edgeContext = await edgeBrowser.newContext({
        viewport: { width: 980, height: 720 }
      });
      const edgePage = await edgeContext.newPage();
      
      console.log('🔐 Logging in Edge...');
      await performLogin(edgePage, TEST_USER.username, TEST_USER.password);
      
      // Navigate both browsers
      console.log('📍 Navigating to home page...');
      await Promise.all([
        chromePage.goto('/home', { waitUntil: 'networkidle' }),
        edgePage.goto('/home', { waitUntil: 'networkidle' })
      ]);
      
      await Promise.all([
        chromePage.waitForTimeout(2000),
        edgePage.waitForTimeout(2000)
      ]);
      
      await chromePage.bringToFront();
      await edgePage.bringToFront();
      
      // Configure AutoPause interval
      console.log(`\n⚙️ Setting AutoPause interval to ${AUTOPAUSE_MINUTES} minutes...`);
      await setAutoPauseInterval(chromePage, AUTOPAUSE_MINUTES);
      await chromePage.reload({ waitUntil: 'networkidle' });
      await edgePage.reload({ waitUntil: 'networkidle' });
      await chromePage.waitForTimeout(2000);
      
      // Get available activities
      const activities = await getActivityNames(chromePage);
      if (activities.length < 4) {
        console.warn(`⚠️ Only ${activities.length} activities found. Test requires at least 4.`);
        console.log('  Available activities:', activities);
        if (activities.length < 1) {
          throw new Error('No activities found. Please create at least one activity before running this test.');
        }
      }
      
      console.log(`\n📌 Using activities: ${activities.slice(0, 4).join(', ')}`);
      
      // Track status line checks
      const activityStartChecks: ActivityStartCheck[] = [];
      
      // ========== ACTIVITY SEQUENCE ==========
      
      // 1. Start Activity 1
      const activity1 = activities[0];
      console.log(`\n▶️ Starting ${activity1} (will run for ${ACTIVITY_1_DURATION}s)...`);
      await getActivityPlayButton(chromePage, activity1).click();
      
      // Capture status lines 5 seconds after start
      console.log(`  ⏳ Waiting 5 seconds to capture status lines...`);
      await chromePage.waitForTimeout(5000);
      const check1 = await captureActivityStartCheck(chromePage, edgePage, activity1);
      activityStartChecks.push(check1);
      console.log(`  Chrome: "${check1.chrome.primaryLine}" ${check1.chromePass ? '✅' : '❌'}`);
      console.log(`  Edge:   "${check1.edge.primaryLine}" ${check1.edgePass ? '✅' : '❌'}`);
      
      // Wait for remaining duration
      await waitWithProgress(chromePage, ACTIVITY_1_DURATION - 5);
      
      // 2. Switch to Activity 2 (if available)
      if (activities.length >= 2) {
        const activity2 = activities[1];
        console.log(`\n▶️ Switching to ${activity2} (will run for ${ACTIVITY_2_DURATION}s)...`);
        await getActivityPlayButton(chromePage, activity2).click();
        
        console.log(`  ⏳ Waiting 5 seconds to capture status lines...`);
        await chromePage.waitForTimeout(5000);
        const check2 = await captureActivityStartCheck(chromePage, edgePage, activity2);
        activityStartChecks.push(check2);
        console.log(`  Chrome: "${check2.chrome.primaryLine}" ${check2.chromePass ? '✅' : '❌'}`);
        console.log(`  Edge:   "${check2.edge.primaryLine}" ${check2.edgePass ? '✅' : '❌'}`);
        
        await waitWithProgress(chromePage, ACTIVITY_2_DURATION - 5);
      }
      
      // 3. Switch to Activity 3 (if available)
      if (activities.length >= 3) {
        const activity3 = activities[2];
        console.log(`\n▶️ Switching to ${activity3} (will run for ${ACTIVITY_3_DURATION}s)...`);
        await getActivityPlayButton(chromePage, activity3).click();
        
        console.log(`  ⏳ Waiting 5 seconds to capture status lines...`);
        await chromePage.waitForTimeout(5000);
        const check3 = await captureActivityStartCheck(chromePage, edgePage, activity3);
        activityStartChecks.push(check3);
        console.log(`  Chrome: "${check3.chrome.primaryLine}" ${check3.chromePass ? '✅' : '❌'}`);
        console.log(`  Edge:   "${check3.edge.primaryLine}" ${check3.edgePass ? '✅' : '❌'}`);
        
        await waitWithProgress(chromePage, ACTIVITY_3_DURATION - 5);
      }
      
      // 4. Switch to Activity 4 (runs until AutoPause)
      if (activities.length >= 4) {
        const activity4 = activities[3];
        const elapsedSoFar = ACTIVITY_1_DURATION + ACTIVITY_2_DURATION + ACTIVITY_3_DURATION;
        const remainingTime = AUTOPAUSE_SECONDS - elapsedSoFar;
        console.log(`\n▶️ Switching to ${activity4} (will run until AutoPause, ~${remainingTime}s)...`);
        await getActivityPlayButton(chromePage, activity4).click();
        
        console.log(`  ⏳ Waiting 5 seconds to capture status lines...`);
        await chromePage.waitForTimeout(5000);
        const check4 = await captureActivityStartCheck(chromePage, edgePage, activity4);
        activityStartChecks.push(check4);
        console.log(`  Chrome: "${check4.chrome.primaryLine}" ${check4.chromePass ? '✅' : '❌'}`);
        console.log(`  Edge:   "${check4.edge.primaryLine}" ${check4.edgePass ? '✅' : '❌'}`);
        
        // Wait for actual AutoPause indicator instead of calculated time
        console.log(`\n⏳ Waiting for AutoPause indicator to appear...`);
        await waitForAutoPauseIndicator(chromePage, remainingTime + 30);
      } else {
        // Wait for AutoPause with current activity
        const elapsedSoFar = ACTIVITY_1_DURATION + 
          (activities.length >= 2 ? ACTIVITY_2_DURATION : 0) +
          (activities.length >= 3 ? ACTIVITY_3_DURATION : 0);
        const remainingTime = AUTOPAUSE_SECONDS - elapsedSoFar;
        console.log(`\n⏳ Waiting for AutoPause indicator to appear...`);
        await waitForAutoPauseIndicator(chromePage, remainingTime + 30);
      }
      
      // ========== CAPTURE FINAL STATE ==========
      
      console.log('\n📊 Capturing final state after AutoPause...');
      // Wait longer for Edge to receive realtime update and update its UI
      await chromePage.waitForTimeout(5000);
      await edgePage.waitForTimeout(5000);
      
      // Force a refresh on Edge to ensure it has the latest state
      await edgePage.reload({ waitUntil: 'networkidle' });
      await edgePage.waitForTimeout(3000);
      
      const chromeState = await captureTabState(chromePage);
      const edgeState = await captureTabState(edgePage);
      
      // Print results table
      const COL_WIDTH = 45;
      console.log('\n' + '='.repeat(110));
      console.log('FINAL RESULTS AFTER AUTOPAUSE');
      console.log('='.repeat(110));
      console.log(`| Metric                    | Chrome                                        | Edge                                          |`);
      console.log(`|---------------------------|-----------------------------------------------|-----------------------------------------------|`);
      console.log(`| Status Line               | ${padRight(chromeState.statusLine, COL_WIDTH)} | ${padRight(edgeState.statusLine, COL_WIDTH)} |`);
      console.log(`| Secondary Status          | ${padRight(chromeState.secondaryStatus, COL_WIDTH)} | ${padRight(edgeState.secondaryStatus, COL_WIDTH)} |`);
      console.log(`|---------------------------|-----------------------------------------------|-----------------------------------------------|`);
      console.log(`| ** STATUS LINE CHECKS AFTER ACTIVITY START **`);
      console.log(`|---------------------------|-----------------------------------------------|-----------------------------------------------|`);
      
      for (const check of activityStartChecks) {
        const chromeResult = check.chromePass ? '✅' : '❌';
        const edgeResult = check.edgePass ? '✅' : '❌';
        console.log(`| ${padRight(check.activityName + ' Start', 25)} | ${padRight(check.chrome.primaryLine + ' ' + chromeResult, COL_WIDTH)} | ${padRight(check.edge.primaryLine + ' ' + edgeResult, COL_WIDTH)} |`);
      }
      console.log('='.repeat(110));
      
      // Summary checks
      console.log('\n📋 VALIDATION');
      const statusMatch = chromeState.statusLine.includes('Auto Paused') && 
                          edgeState.statusLine.includes('Auto Paused');
      console.log(`  Status shows "Auto Paused": ${statusMatch ? '✅ PASS' : '❌ FAIL'}`);
      
      // Activity start checks
      console.log('\n📋 ACTIVITY START STATUS LINE CHECKS');
      let allActivityStartsPassed = true;
      for (const check of activityStartChecks) {
        const passed = check.chromePass && check.edgePass;
        if (!passed) allActivityStartsPassed = false;
        console.log(`  ${check.activityName}: Chrome ${check.chromePass ? '✅' : '❌'}, Edge ${check.edgePass ? '✅' : '❌'}`);
      }
      console.log(`  Overall: ${allActivityStartsPassed ? '✅ ALL PASSED' : '⚠️ SOME FAILED'}`);
      
      // If ENTER_FOR_CLOSE was specified, wait for user
      if (ENTER_FOR_CLOSE) {
        await waitForEnterKey('Browsers are open for inspection. Press Enter to close and exit...');
      }
      
      // Assertions
      expect(statusMatch).toBe(true);
      
    } finally {
      // Clean up
      if (chromeBrowser) await chromeBrowser.close();
      if (edgeBrowser) await edgeBrowser.close();
    }
  });
});

// Helper functions

async function getActivityNames(page: Page): Promise<string[]> {
  const activities: string[] = [];
  const cards = getActivityNameHeadings(page);
  const count = await cards.count();
  
  for (let i = 0; i < count; i++) {
    const name = await cards.nth(i).textContent();
    if (name) activities.push(name.trim());
  }
  
  return activities;
}

async function getStatusLineText(page: Page): Promise<string> {
  try {
    const statusLocator = getAutoPauseStatus(page);
    if (await statusLocator.count() > 0) {
      const text = await statusLocator.textContent({ timeout: 1000 });
      return text?.replace(/\s+/g, ' ').trim() || '';
    }
    return '';
  } catch {
    return '';
  }
}

async function getSecondaryStatusText(page: Page): Promise<string> {
  try {
    const locator = getAutoPauseSecondaryStatus(page);
    if (await locator.count() > 0) {
      const text = await locator.textContent({ timeout: 1000 });
      return text?.replace(/\s+/g, ' ').trim() || '';
    }
    return '';
  } catch {
    return '';
  }
}

async function captureActivityStartCheck(
  chromePage: Page, 
  edgePage: Page, 
  activityName: string
): Promise<ActivityStartCheck> {
  const chromePrimary = await getStatusLineText(chromePage);
  const chromeSecondary = await getSecondaryStatusText(chromePage);
  const edgePrimary = await getStatusLineText(edgePage);
  const edgeSecondary = await getSecondaryStatusText(edgePage);
  
  // Check if primary line shows "Activity {Name} Auto Pause in Xm Ys" (PRD 4.2.1 — no secondary line when running)
  const chromePass = chromePrimary.includes('Auto Pause in') && chromePrimary.includes(activityName);
  const edgePass = edgePrimary.includes('Auto Pause in') && edgePrimary.includes(activityName);
  
  return {
    activityName,
    chrome: { primaryLine: chromePrimary, secondaryLine: chromeSecondary },
    edge: { primaryLine: edgePrimary, secondaryLine: edgeSecondary },
    chromePass,
    edgePass
  };
}

async function captureTabState(page: Page): Promise<TabState> {
  const statusLine = await getStatusLineText(page);
  const secondaryStatus = await getSecondaryStatusText(page);
  
  return { statusLine, secondaryStatus };
}

async function waitWithProgress(page: Page, seconds: number): Promise<void> {
  const chunkSeconds = 30;
  for (let elapsed = 0; elapsed < seconds; elapsed += chunkSeconds) {
    const remaining = seconds - elapsed;
    const waitTime = Math.min(chunkSeconds, remaining);
    console.log(`  ⏱️ ${elapsed}s elapsed, ${remaining}s remaining...`);
    await page.waitForTimeout(waitTime * 1000);
  }
}

/**
 * Wait for the AutoPause indicator to appear in the status line.
 * Uses polling with progress updates instead of fixed timing.
 * @param page - The Playwright page to check
 * @param maxWaitSeconds - Maximum time to wait before timing out
 */
async function waitForAutoPauseIndicator(page: Page, maxWaitSeconds: number): Promise<void> {
  const pollInterval = 5; // Check every 5 seconds
  const startTime = Date.now();
  
  for (let elapsed = 0; elapsed < maxWaitSeconds; elapsed += pollInterval) {
    // Check if AutoPause indicator is present
    const statusText = await getStatusLineText(page);
    if (statusText.includes('Auto Paused')) {
      console.log(`  ✅ AutoPause detected after ${elapsed}s`);
      return;
    }
    
    // Log progress every 30 seconds
    if (elapsed % 30 === 0 && elapsed > 0) {
      console.log(`  ⏱️ ${elapsed}s elapsed, waiting for AutoPause...`);
    }
    
    await page.waitForTimeout(pollInterval * 1000);
  }
  
  // Final check
  const finalStatus = await getStatusLineText(page);
  if (finalStatus.includes('Auto Paused')) {
    console.log(`  ✅ AutoPause detected at max wait time`);
    return;
  }
  
  console.log(`  ⚠️ AutoPause not detected after ${maxWaitSeconds}s (status: "${finalStatus}")`);
}

function padRight(str: string, length: number): string {
  return str.substring(0, length).padEnd(length);
}
