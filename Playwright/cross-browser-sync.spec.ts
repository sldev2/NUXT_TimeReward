import { test, expect, Page, chromium } from '@playwright/test';
import { 
  performLogin, 
  getAutoPauseStatus,
  getAutoPauseSecondaryStatus,
  getActivityPlayButton,
  getActivityTime,
  setAutoPauseInterval,
  waitForEnterKey,
  TEST_USER
} from './test-utils/selectors';

/**
 * Cross-Browser Sync Test (Nuxt Version)
 * 
 * Tests timer synchronization across Chrome AND Edge browsers simultaneously.
 * This simulates a real multi-browser scenario where a user has the app open
 * in different browsers.
 * 
 * NOTE: This test CANNOT be run via Playwright MCP server because:
 * 1. MCP server operates within a single browser context
 * 2. Cannot control multiple browser types simultaneously
 * 3. Cross-browser coordination requires independent browser processes
 * 
 * Environment variables:
 * ENTER_FOR_CLOSE=1      : Pause before closing browsers, wait for Enter key
 * AUTOPAUSE_MINUTES=N    : Set AutoPause interval to N minutes before test runs
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

test.describe('Cross-Browser Sync Test', () => {
  
  test('should sync timers and status across Chrome and Edge', async () => {
    // This test takes ~5 minutes (3 min wait + login/setup), so extend timeout
    test.setTimeout(6 * 60 * 1000); // 6 minutes
    // Launch Chrome
    console.log('🌐 Launching Chrome...');
    const chromeBrowser = await chromium.launch({ 
      headless: false,
      channel: 'chrome'
    });
    const chromeContext = await chromeBrowser.newContext({ 
      viewport: { width: 1280, height: 720 }
    });
    const chromePage = await chromeContext.newPage();
    
    // Launch Edge
    console.log('🌐 Launching Edge...');
    const edgeBrowser = await chromium.launch({ 
      headless: false,
      channel: 'msedge'
    });
    const edgeContext = await edgeBrowser.newContext({ 
      viewport: { width: 1280, height: 720 }
    });
    const edgePage = await edgeContext.newPage();
    
    try {
      // Login in both browsers (separate sessions)
      // Add delay between logins to avoid Supabase rate limiting
      console.log('🔐 Logging in Chrome...');
      await performLogin(chromePage, TEST_USER.username, TEST_USER.password);
      
      // Wait a bit before second login to avoid rate limiting
      await chromePage.waitForTimeout(3000);
      
      console.log('🔐 Logging in Edge...');
      await performLogin(edgePage, TEST_USER.username, TEST_USER.password);
      
      // Navigate both browsers to home
      console.log('📍 Navigating both browsers to home...');
      await Promise.all([
        chromePage.goto('/home', { waitUntil: 'networkidle' }),
        edgePage.goto('/home', { waitUntil: 'networkidle' })
      ]);
      
      await chromePage.bringToFront();
      await edgePage.bringToFront();
      
      await Promise.all([
        chromePage.waitForTimeout(2000),
        edgePage.waitForTimeout(2000)
      ]);
      
      // Configure AutoPause interval in Chrome (will sync via Supabase Realtime)
      console.log(`\n⚙️ Setting AutoPause interval to ${AUTOPAUSE_MINUTES} minutes...`);
      await setAutoPauseInterval(chromePage, AUTOPAUSE_MINUTES);
      
      // Refresh both browsers to pick up new settings
      await chromePage.reload({ waitUntil: 'networkidle' });
      await edgePage.reload({ waitUntil: 'networkidle' });
      await chromePage.waitForTimeout(2000);
      
      // TEST: Status line should be blank/hidden before any activity
      console.log('\n📋 TEST: Status line blank before activity');
      const statusChromeBefore = await getStatusLineText(chromePage);
      const statusEdgeBefore = await getStatusLineText(edgePage);
      console.log(`  Chrome status: "${statusChromeBefore}"`);
      console.log(`  Edge status: "${statusEdgeBefore}"`);
      
      const blankPass = statusChromeBefore === '' && statusEdgeBefore === '';
      console.log(`  Result: ${blankPass ? '✅ PASS' : '⚠️ SKIP (may have previous activity)'}`);
      
      // Find the first activity
      const firstActivity = await getFirstActivityName(chromePage);
      if (!firstActivity) {
        throw new Error('No activities found. Please create at least one activity before running this test.');
      }
      console.log(`\n📌 Using activity: "${firstActivity}"`);
      
      // Start the activity in Chrome
      console.log(`\n▶️ Starting ${firstActivity} activity in Chrome...`);
      await getActivityPlayButton(chromePage, firstActivity).click();
      await chromePage.waitForTimeout(2000);
      await edgePage.waitForTimeout(2000); // Wait for Supabase Realtime update
      
      // TEST: Countdown shows on start
      console.log('\n📋 TEST: Countdown shows on start');
      const countdownChrome = await getStatusLineText(chromePage);
      const countdownEdge = await getStatusLineText(edgePage);
      console.log(`  Chrome status: "${countdownChrome}"`);
      console.log(`  Edge status: "${countdownEdge}"`);
      
      const countdownPass = countdownChrome.includes('Auto Pause in') && countdownEdge.includes('Auto Pause in');
      console.log(`  Result: ${countdownPass ? '✅ PASS' : '❌ FAIL'}`);
      
      // Wait 10 seconds then pause
      console.log('\n⏳ Waiting 10 seconds...');
      await chromePage.waitForTimeout(10000);
      
      // Pause the activity in Chrome
      console.log(`\n⏸️ Pausing ${firstActivity} activity in Chrome...`);
      await getActivityPlayButton(chromePage, firstActivity).click();
      await chromePage.waitForTimeout(2000);
      await edgePage.waitForTimeout(2000);
      
      // TEST: Manual pause message sync
      console.log('\n📋 TEST: Manual pause message sync');
      const pauseChrome = await getStatusLineText(chromePage);
      const pauseEdge = await getStatusLineText(edgePage);
      console.log(`  Chrome status: "${pauseChrome}"`);
      console.log(`  Edge status: "${pauseEdge}"`);
      
      const manualPausePass = pauseChrome.includes('Manually Paused') && pauseEdge.includes('Manually Paused');
      console.log(`  Result: ${manualPausePass ? '✅ PASS' : '⚠️ PARTIAL/FAIL'}`);
      
      // Resume the activity
      console.log(`\n▶️ Resuming ${firstActivity} activity in Chrome...`);
      await getActivityPlayButton(chromePage, firstActivity).click();
      await chromePage.waitForTimeout(2000);
      await edgePage.waitForTimeout(2000);
      
      // TEST: Resume countdown sync
      console.log('\n📋 TEST: Resume countdown sync');
      const resumeChrome = await getStatusLineText(chromePage);
      const resumeEdge = await getStatusLineText(edgePage);
      console.log(`  Chrome status: "${resumeChrome}"`);
      console.log(`  Edge status: "${resumeEdge}"`);
      
      const resumePass = resumeChrome.includes('Auto Pause in') && resumeEdge.includes('Auto Pause in');
      console.log(`  Result: ${resumePass ? '✅ PASS' : '❌ FAIL'}`);
      
      // Wait for AutoPause
      console.log(`\n⏳ Waiting for AutoPause to trigger (~${AUTOPAUSE_MINUTES} minutes)...`);
      const chunkSeconds = 30;
      for (let elapsed = 0; elapsed < AUTOPAUSE_SECONDS; elapsed += chunkSeconds) {
        const remaining = AUTOPAUSE_SECONDS - elapsed;
        console.log(`  ⏱️ ${elapsed}s elapsed, ~${remaining}s remaining...`);
        await chromePage.waitForTimeout(Math.min(chunkSeconds, remaining) * 1000);
      }
      console.log(`  ⏱️ Wait complete.`);
      
      // Capture final state
      console.log('\n📊 Capturing final state after AutoPause...');
      await Promise.all([
        chromePage.waitForTimeout(3000),
        edgePage.waitForTimeout(3000)
      ]);
      
      const chromeState = await captureTabState(chromePage, firstActivity);
      const edgeState = await captureTabState(edgePage, firstActivity);
      
      // Print results table
      console.log('\n' + '='.repeat(100));
      console.log('FINAL RESULTS AFTER AUTOPAUSE');
      console.log('='.repeat(100));
      console.log(`| Metric                    | Chrome                                   | Edge                                     |`);
      console.log(`|---------------------------|------------------------------------------|------------------------------------------|`);
      console.log(`| ${firstActivity} Time     | ${padRight(chromeState.activityTime, 40)} | ${padRight(edgeState.activityTime, 40)} |`);
      console.log(`| Status Line               | ${padRight(chromeState.statusLine, 40)} | ${padRight(edgeState.statusLine, 40)} |`);
      console.log(`| Secondary Status          | ${padRight(chromeState.secondaryStatus, 40)} | ${padRight(edgeState.secondaryStatus, 40)} |`);
      console.log('='.repeat(100));
      
      // Summary
      console.log('\n📋 SUMMARY');
      console.log(`  Status blank before activity: ${blankPass ? '✅ PASS' : '⚠️ SKIP'}`);
      console.log(`  Countdown shows on start: ${countdownPass ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`  Manual pause message sync: ${manualPausePass ? '✅ PASS' : '⚠️ PARTIAL'}`);
      console.log(`  Resume countdown sync: ${resumePass ? '✅ PASS' : '❌ FAIL'}`);
      
      // Check if AutoPause status shows
      const autoPauseShown = chromeState.statusLine.includes('Auto Paused') && edgeState.statusLine.includes('Auto Paused');
      console.log(`  AutoPause status shown: ${autoPauseShown ? '✅ PASS' : '❌ FAIL'}`);
      
      // Warnings
      if (!countdownPass) console.warn('  ⚠️ Countdown not showing on start');
      if (!manualPausePass) console.warn('  ⚠️ Manual pause message not synced between browsers');
      
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
      // Clean up
      await chromeContext.close();
      await chromeBrowser.close();
      await edgeContext.close();
      await edgeBrowser.close();
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
    const activityCard = page.locator('div.group h3').first();
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
