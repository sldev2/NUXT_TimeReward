# TimeReward Playwright Test Suite

This folder contains the standalone Playwright-based end-to-end tests that ship with the extracted `NUXT_TimeReward` repo.

The focus here is the Nuxt application running locally at `http://localhost:4000`. This index documents only the Playwright assets that exist inside this repository.

**Before running tests:** start the app from the **repository root** with `npm run dev` (Playwright does not auto-start the dev server here). For `npm run reset-timers`, ensure the **repo root** `.env` contains `SUPABASE_URL` (or `NUXT_PUBLIC_SUPABASE_URL`) and `SUPABASE_SECRET_KEY` so `test-utils/reset-timers.ts` can reach Supabase.

## Prerequisites

```bash
# Install Playwright dependencies
cd Playwright
npm install
npx playwright install
```

## Available npm Scripts

From the `Playwright` folder:

```bash
npm test
npm run test:multi-tab
npm run test:cross-browser
npm run test:multi-activity
npm run test:headed
npm run install-browsers
npm run reset-timers
```

## Test Index (Real Time)

| Test | File | Description | MCP Prompt Available |
|------|------|-------------|----------------------|
| [1](#test-1-multi-tab-sync-test) | `multi-tab-sync.spec.ts` | Multi-tab sync test (2 Chrome tabs) | Yes |
| [2](#test-2-cross-browser-sync-test) | `cross-browser-sync.spec.ts` | Cross-browser sync test (Chrome + Edge) | No |
| [3](#test-3-multi-activity-sequence-test) | `multi-activity-sequence.spec.ts` | Multi-activity sequence test (Chrome + Edge, 4 activities) | No |

---

## Test 1: Multi-Tab Sync Test

**File:** `multi-tab-sync.spec.ts`

**Description:** Tests timer synchronization across two tabs in the same browser (Chrome). Verifies AutoPause countdown display, manual pause message sync, and timer value consistency.

**Default AutoPause:** 3 minutes (`DEFAULT_AUTOPAUSE_MINUTES = 3`)

### Running from Command Line

```bash
cd Playwright
npx playwright test multi-tab-sync.spec.ts --headed --timeout=300000
```

**With AutoPause configuration and browser inspection pause:**

PowerShell:
```powershell
cd Playwright
$env:AUTOPAUSE_MINUTES=3; $env:ENTER_FOR_CLOSE=1; npx playwright test multi-tab-sync.spec.ts --headed --timeout=300000
```

Windows Command Prompt (cmd.exe):
```cmd
cd Playwright
set AUTOPAUSE_MINUTES=3 && set ENTER_FOR_CLOSE=1 && npx playwright test multi-tab-sync.spec.ts --headed --timeout=300000
```

### Expected Output

```
Running 1 test using 1 worker

  Multi-Tab Sync Test
    should sync timers and status across two Chrome tabs
      - Status line blank before activity: PASS/SKIP
      - Countdown shows on start: PASS
      - Manual pause message sync: PASS/FAIL
      - Resume countdown sync: PASS
      - AutoPause status shown: PASS

  1 passed (4m 30s)
```

---

## Test 2: Cross-Browser Sync Test

**File:** `cross-browser-sync.spec.ts`

**Description:** Tests timer synchronization across Chrome AND Edge browsers simultaneously. This simulates a real multi-browser scenario where a user has the app open in different browsers.

**Default AutoPause:** 3 minutes (`DEFAULT_AUTOPAUSE_MINUTES = 3`)

### Running from Command Line

```bash
cd Playwright
npx playwright test cross-browser-sync.spec.ts --headed --timeout=300000
```

**With AutoPause configuration and browser inspection pause:**

PowerShell:
```powershell
cd Playwright
$env:AUTOPAUSE_MINUTES=3; $env:ENTER_FOR_CLOSE=1; npx playwright test cross-browser-sync.spec.ts --headed --timeout=300000
```

### MCP Prompt Version

**Not Available**

This test CANNOT be run via Playwright MCP server because:

1. **Single browser context limitation**: The Playwright MCP server operates within a single browser context. It cannot control multiple different browser types (Chrome AND Edge) simultaneously.

2. **Session isolation**: Each browser type requires a separate browser instance with its own session.

---

## Test 3: Multi-Activity Sequence Test

**File:** `multi-activity-sequence.spec.ts`

**Description:** Tests timer synchronization across Chrome AND Edge while switching between multiple activities. Verifies that activity switching works correctly and all timers accumulate properly across both browsers.

**Default AutoPause:** 6 minutes (`DEFAULT_AUTOPAUSE_MINUTES = 6`)

**Activity Sequence:**
1. **Activity 1** - runs for 1.5 minutes (90 seconds)
2. **Activity 2** - runs for 1 minute (60 seconds)
3. **Activity 3** - runs for 1 minute (60 seconds)
4. **Activity 4** - runs until AutoPause (~3.5 minutes remaining)

**Prerequisites:**
- User should have at least 4 activities created

### Running from Command Line

```bash
cd Playwright
npx playwright test multi-activity-sequence.spec.ts --headed --timeout=600000
```

**With browser inspection pause:**

PowerShell:
```powershell
cd Playwright
$env:ENTER_FOR_CLOSE=1; npx playwright test multi-activity-sequence.spec.ts --headed --timeout=600000
```

---

## Command Line Options

| Option | Description |
|--------|-------------|
| `--headed` | Run with visible browser windows (required for visual inspection) |
| `--timeout=300000` | Set test timeout to 5 minutes (needed for AutoPause wait) |
| `AUTOPAUSE_MINUTES=N` | **Environment variable.** Override the AutoPause interval to N minutes. |
| `ENTER_FOR_CLOSE=1` | **Environment variable.** Pause before closing browsers. Browser windows remain open for manual inspection. Press Enter in the terminal to close them and exit. |

---

## Shared Selectors & Utilities

All proven Playwright selectors are centralized in `test-utils/selectors.ts`. When writing new tests, **import from this module** to avoid rediscovering selector patterns.

### Usage

```typescript
import { 
  getActivityPlayButton, 
  getAutoPauseStatus,
  performLogin,
  setAutoPauseInterval
} from '../test-utils/selectors';

// Login
await performLogin(page, 'user@example.com', 'password');

// Click an activity button
await getActivityPlayButton(page, 'Work').click();

// Get status line text
const status = await getAutoPauseStatus(page).textContent();
```

### Available Selectors

| Function | Description |
|----------|-------------|
| `getActivityCard(page, name)` | Activity card by name |
| `getActivityPlayButton(page, name)` | Play/pause button |
| `getActivityTime(page, name)` | Activity timer display |
| `getAutoPauseStatus(page)` | Primary autopause status (`#autopause-status`) |
| `getAutoPauseSecondaryStatus(page)` | Secondary status line |
| `performLogin(page, email, password)` | Login flow |
| `setAutoPauseInterval(page, minutes)` | Set AutoPause in settings |

### Utilities

| Function | Description |
|----------|-------------|
| `parseHHMMSSToSeconds("00:09:04")` | Parse HH:MM:SS to seconds (returns 544) |
| `parseTimeToMinutes("9h 4m")` | Parse time string to minutes (returns 544) |
| `parseTimeToSeconds("1m 30s")` | Parse time string to seconds (returns 90) |
| `waitForEnterKey(message)` | Wait for user to press Enter |

---

## AutoPause Behavior

**CUMULATIVE AutoPause:** AutoPause is based on **total daily activity** across ALL activity types (Rewardable, Non-Rewardable, AND Wasted), not per-session.

- Switching between activities does **NOT** reset the countdown
- AutoPause fires after N minutes of cumulative activity across ALL types
- Example: With a 6-minute AutoPause, if you run Work (rewardable) for 2 min, Facebook (wasted) for 2 min, and Chores (non-rewardable) for 2 min, AutoPause will fire (2+2+2 = 6 minutes total)
- This is distinct from Rewardable Time, which only tracks Rewardable activities (and optionally Non-Rewardable based on user settings)

---

## Historical Note

This Playwright folder was adapted from earlier TimeReward Playwright work in the broader project history, but this standalone repo should be treated as the source of truth for the commands, selectors, and expectations documented here.

Compared with the earlier Blazor/MudBlazor-oriented tests, the main Nuxt differences are:

| Aspect | Blazor | Nuxt |
|--------|--------|------|
| Base URL | `https://localhost:5001` | `http://localhost:4000` |
| Login | Click SIGNIN button, fill dialog | Navigate to `/login` page |
| Settings | Control Panel popup menu | Navigate to `/settings` page |
| Activity cards | `div[id^='activity-card-']` | `div.space-y-3 > div` rows with `h3` activity name |
| Play button | `button.mud-fab` | `button.w-12.h-12.rounded-full` |
| Status line | `#autopause-status` | `#autopause-status` (same) |

---

## Notes

- Ensure the Nuxt dev server is running before executing tests (`npm run dev` in the repo root)
- Tests use the configured test user credentials in `test-utils/selectors.ts`
- Each test has its own default AutoPause interval and configures it before running
- Use `AUTOPAUSE_MINUTES=N` to override the default for all tests
- `test-utils/reset-timers.ts` expects environment values from the app root `.env`
