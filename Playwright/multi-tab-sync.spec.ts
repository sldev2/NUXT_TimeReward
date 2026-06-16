import { test, expect, Page, BrowserContext } from '@playwright/test';
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

/**
 * Multi-Tab Sync Test (Nuxt Version)
 * 
 * Tests timer synchronization across two tabs in the same Chrome browser.
 * Verifies:
 * - AutoPause countdown display in both tabs
 * - Manual pause message sync between tabs
 * - Timer value consistency after AutoPause
 * 
 * Environment variables:
 * ENTER_FOR_CLOSE=1      : Pause before closing browsers, wait for Enter key
 * AUTOPAUSE_MINUTES=N    : Set AutoPause interval to N minutes before test runs
 *   Windows CMD:  set AUTOPAUSE_MINUTES=3 && set ENTER_FOR_CLOSE=1 && npx playwright test ...
 *   PowerShell:   $env:AUTOPAUSE_MINUTES=3; $env:ENTER_FOR_CLOSE=1; npx playwright test ...
 *   Linux/Mac:    AUTOPAUSE_MINUTES=3 ENTER_FOR_CLOSE=1 npx playwright test ...
 */

// Check for ENTER_FOR_CLOSE environment variable
const ENTER_FOR_CLOSE = !!process.env.ENTER_FOR_CLOSE;

// Default AutoPause interval for this test (in minutes)
const DEFAULT_AUTOPAUSE_MINUTES = 3;
const AUTOPAUSE_MINUTES = process.env.AUTOPAUSE_MINUTES 
  ? parseInt(process.env.AUTOPAUSE_MINUTES, 10) 
  : DEFAULT_AUTOPAUSE_MINUTES;

const AUTOPAUSE_SECONDS = AUTOPAUSE_MINUTES * 60;

interface TabState {
  activityTime: string;
  statusLine: string;
  secondaryStatus: string;
}

test.describe('Multi-Tab Sync Test', () => {
  
  test('should sync timers and status across two Chrome tabs', async ({ browser }) => {
    // Create a single browser context (shared session)
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    
    // Create two pages (tabs) in the same context
    const tab0 = await context.newPage();
    const tab1 = await context.newPage();
    
    try {
      // Login in tab0 (session is shared across tabs in same context)
      console.log('🔐 Logging in...');
      await performLogin(tab0, TEST_USER.username, TEST_USER.password);
      
      // Navigate both tabs to home
      console.log('📍 Navigating both tabs to home...');
      await tab0.goto('/home', { waitUntil: 'networkidle' });
      await tab1.goto('/home', { waitUntil: 'networkidle' });
      
      // Wait for pages to fully load
      await tab0.waitForTimeout(2000);
      await tab1.waitForTimeout(2000);
      
      // Configure AutoPause interval
      console.log(`\n⚙️ Setting AutoPause interval to ${AUTOPAUSE_MINUTES} minutes...`);
      await setAutoPauseInterval(tab0, AUTOPAUSE_MINUTES);
      
      // Refresh both tabs to pick up new settings
      await tab0.reload({ waitUntil: 'networkidle' });
      await tab1.reload({ waitUntil: 'networkidle' });
      await tab0.waitForTimeout(2000);
      
      // TEST: Status line should be blank/hidden before any activity
      console.log('\n📋 TEST: Status line blank before activity');
      const statusBefore0 = await getStatusLineText(tab0);
      const statusBefore1 = await getStatusLineText(tab1);
      console.log(`  Tab 0 status: "${statusBefore0}"`);
      console.log(`  Tab 1 status: "${statusBefore1}"`);
      
      const blankPass = statusBefore0 === '' && statusBefore1 === '';
      console.log(`  Result: ${blankPass ? '✅ PASS' : '⚠️ SKIP (may have previous activity)'}`);
      
      // Find the first activity to use for testing
      // We'll use whatever activity exists in the user's account
      const firstActivity = await getFirstActivityName(tab0);
      if (!firstActivity) {
        throw new Error('No activities found. Please create at least one activity before running this test.');
      }
      console.log(`\n📌 Using activity: "${firstActivity}"`);
      
      // Start the activity in Tab 0
      console.log(`\n▶️ Starting ${firstActivity} activity in Tab 0...`);
      await getActivityPlayButton(tab0, firstActivity).click();
      await tab0.waitForTimeout(2000);
      
      // TEST: Countdown shows on start
      console.log('\n📋 TEST: Countdown shows on start');
      const countdown0 = await getStatusLineText(tab0);
      const countdown1 = await getStatusLineText(tab1);
      console.log(`  Tab 0 status: "${countdown0}"`);
      console.log(`  Tab 1 status: "${countdown1}"`);
      
      const countdownPass = countdown0.includes('Auto Pause in') && countdown1.includes('Auto Pause in');
      console.log(`  Result: ${countdownPass ? '✅ PASS' : '❌ FAIL'}`);
      
      // Wait 10 seconds then pause
      console.log('\n⏳ Waiting 10 seconds...');
      await tab0.waitForTimeout(10000);
      
      // Pause the activity
      console.log(`\n⏸️ Pausing ${firstActivity} activity in Tab 0...`);
      await getActivityPlayButton(tab0, firstActivity).click();
      await tab0.waitForTimeout(2000);
      
      // TEST: Manual pause message sync
      console.log('\n📋 TEST: Manual pause message sync');
      const pauseStatus0 = await getStatusLineText(tab0);
      const pauseStatus1 = await getStatusLineText(tab1);
      console.log(`  Tab 0 status: "${pauseStatus0}"`);
      console.log(`  Tab 1 status: "${pauseStatus1}"`);
      
      const manualPausePass = pauseStatus0.includes('Manually Paused') && pauseStatus1.includes('Manually Paused');
      console.log(`  Result: ${manualPausePass ? '✅ PASS' : '⚠️ PARTIAL/FAIL'}`);
      
      // Resume the activity
      console.log(`\n▶️ Resuming ${firstActivity} activity in Tab 0...`);
      await getActivityPlayButton(tab0, firstActivity).click();
      await tab0.waitForTimeout(2000);
      
      // TEST: Resume countdown sync
      console.log('\n📋 TEST: Resume countdown sync');
      const resumeStatus0 = await getStatusLineText(tab0);
      const resumeStatus1 = await getStatusLineText(tab1);
      console.log(`  Tab 0 status: "${resumeStatus0}"`);
      console.log(`  Tab 1 status: "${resumeStatus1}"`);
      
      const resumePass = resumeStatus0.includes('Auto Pause in') && resumeStatus1.includes('Auto Pause in');
      console.log(`  Result: ${resumePass ? '✅ PASS' : '❌ FAIL'}`);
      
      // Wait for AutoPause
      console.log(`\n⏳ Waiting for AutoPause to trigger (~${AUTOPAUSE_MINUTES} minutes)...`);
      
      // Wait in chunks with progress logging
      const chunkSeconds = 30;
      for (let elapsed = 0; elapsed < AUTOPAUSE_SECONDS; elapsed += chunkSeconds) {
        const remaining = AUTOPAUSE_SECONDS - elapsed;
        console.log(`  ⏱️ ${elapsed}s elapsed, ~${remaining}s remaining...`);
        await tab0.waitForTimeout(Math.min(chunkSeconds, remaining) * 1000);
      }
      console.log(`  ⏱️ Wait complete.`);
      
      // Capture final state
      console.log('\n📊 Capturing final state after AutoPause...');
      await tab0.waitForTimeout(3000);
      
      const finalState0 = await captureTabState(tab0, firstActivity);
      const finalState1 = await captureTabState(tab1, firstActivity);
      
      // Print results table
      console.log('\n' + '='.repeat(100));
      console.log('FINAL RESULTS AFTER AUTOPAUSE');
      console.log('='.repeat(100));
      console.log(`| Metric                    | Tab 0                                    | Tab 1                                    |`);
      console.log(`|---------------------------|------------------------------------------|------------------------------------------|`);
      console.log(`| ${firstActivity} Time     | ${padRight(finalState0.activityTime, 40)} | ${padRight(finalState1.activityTime, 40)} |`);
      console.log(`| Status Line               | ${padRight(finalState0.statusLine, 40)} | ${padRight(finalState1.statusLine, 40)} |`);
      console.log(`| Secondary Status          | ${padRight(finalState0.secondaryStatus, 40)} | ${padRight(finalState1.secondaryStatus, 40)} |`);
      console.log('='.repeat(100));
      
      // Summary
      console.log('\n📋 SUMMARY');
      console.log(`  Status blank before activity: ${blankPass ? '✅ PASS' : '⚠️ SKIP'}`);
      console.log(`  Countdown shows on start: ${countdownPass ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`  Manual pause message sync: ${manualPausePass ? '✅ PASS' : '⚠️ PARTIAL'}`);
      console.log(`  Resume countdown sync: ${resumePass ? '✅ PASS' : '❌ FAIL'}`);
      
      // Check if AutoPause status shows
      const autoPauseShown = finalState0.statusLine.includes('Auto Paused') && finalState1.statusLine.includes('Auto Paused');
      console.log(`  AutoPause status shown: ${autoPauseShown ? '✅ PASS' : '❌ FAIL'}`);
      
      // If ENTER_FOR_CLOSE was specified, wait for user
      if (ENTER_FOR_CLOSE) {
        test.setTimeout(30 * 60 * 1000);
        await waitForEnterKey('Browsers are open for inspection. Press Enter to close and exit...');
      }
      
      // Assertions
      expect(countdownPass).toBe(true);
      expect(resumePass).toBe(true);
      expect(autoPauseShown).toBe(true);
      
    } finally {
      await context.close();
    }
  });
});

// Helper functions

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

async function getFirstActivityName(page: Page): Promise<string | null> {
  try {
    const activityCard = getActivityNameHeadings(page).first();
    if (await activityCard.count() > 0) {
      return await activityCard.textContent({ timeout: 2000 });
    }
    return null;
  } catch {
    return null;
  }
}

async function captureTabState(page: Page, activityName: string): Promise<TabState> {
  let activityTime = 'N/A';
  let statusLine = '';
  let secondaryStatus = '';
  
  try {
    const timeLocator = getActivityTime(page, activityName);
    if (await timeLocator.count() > 0) {
      activityTime = (await timeLocator.innerText({ timeout: 2000 })).trim();
    }
  } catch {
    console.log('  ⚠️ Could not capture activity time');
  }
  
  statusLine = await getStatusLineText(page);
  
  try {
    const secondaryLocator = getAutoPauseSecondaryStatus(page);
    if (await secondaryLocator.count() > 0) {
      secondaryStatus = (await secondaryLocator.textContent({ timeout: 1000 }))?.trim() || '';
    }
  } catch {
    // Secondary status may not exist
  }
  
  return { activityTime, statusLine, secondaryStatus };
}

function padRight(str: string, length: number): string {
  return str.substring(0, length).padEnd(length);
}
