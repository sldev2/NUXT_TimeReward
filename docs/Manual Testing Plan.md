# NUXT_TimeReward — Manual Testing Plan

**Date**: February 26, 2026 (last updated March 17, 2026)  
**Purpose**: End-to-end verification of all implemented features before production deployment.  
**Reference**: `docs/REARCHITECT/PRD for NUXT.md` (canonical standalone PRD; v2.6-era content is superseded by this file)  
**Test user**: kyrie / @Password1

---

## 1. Prerequisites

- [x] (human) Ensure the Supabase dev project is running and accessible
- [x] (ai) Verify database connectivity via mcp-time-reward-test (`list_tables`)
- [x] (human) Start the NUXT dev server: `cd NUXT_TimeReward && npm run dev`
- [x] (human) Confirm the app loads at `http://localhost:4000` without console errors
- [x] (ai) Verify Playwright MCP server is available and responsive

---

## 2. Landing Page

- [x] (human) Navigate to `http://localhost:4000`
  - [x] Verify hero section displays with gradient title
  - [x] Verify "Sign In" and "Sign Up" buttons are visible
  - [x] Verify feature preview cards are displayed (Real-Time Tracking, Earn Rewards, Works Offline)
- [x] (human) Verify the page is mobile-responsive (resize browser to ~375px width)

---

## 3. Authentication

### 3.1 Login

- [x] (human) Click "Sign In" on the landing page
  - [x] Verify login page loads with username and password fields
- [x] (human) Attempt login with invalid credentials (e.g., kyrie / wrongpassword)
  - [x] Verify an error message is displayed
- [x] (human) Login with valid credentials: kyrie / @Password1
  - [x] Verify redirect to `/home`
  - [x] Verify the user's display name appears in the UI (Kyrie Irving) — *fixed: display name was not loading due to `useSupabaseUser()` returning null on client; fixed by falling back to `getSession()`. Also updated DB from all-caps to proper case.*

### 3.2 Registration

- [x] (human) Navigate to `/register`
  - [x] Verify registration form loads with username, first name, last name, email, password, confirm password fields
- [x] (human) Attempt registration with mismatched passwords
  - [x] Verify a validation error is shown
- [x] (human) Register a new test user and verify redirect to `/home`
  - [x] Verify the newly registered user is logged in (not the previously logged-in user) — *fixed: added signOut before signUp, explicit signIn after registration*
  - [x] Verify the new user's name appears in the header
- [x] (human) While logged in, navigate to `/register` or `/login`
  - [x] Verify redirect to `/home` (guest middleware prevents authenticated users from accessing auth pages)

> **Note**: Registration uses a server-side admin API endpoint (`POST /api/auth/register`) that creates users via `supabase.auth.admin.createUser()`. This bypasses GoTrue's email confirmation email sending, which fails on the free tier due to rate limits (misleading "email address invalid" error). When `NUXT_SKIP_EMAIL_CONFIRMATION="true"` in `.env`, users are created pre-confirmed and can sign in immediately. When `"false"`, users are created unconfirmed and shown a "check your email" message.

### 3.3 Logout

- [x] (human) While logged in, click the user profile menu and log out
  - [x] Verify redirect to `/login`
  - [x] Verify navigating to `/home` redirects back to `/login` (auth middleware)

### 3.4 Email Verification Flow (Deferred to end of Manual Testing Plan)

> **Status**: Postponed — requires `NUXT_SKIP_EMAIL_CONFIRMATION` set to `"false"` and a working Resend API key in `.env`. The registration server endpoint already supports this mode (creates user unconfirmed, returns `emailConfirmed: false`, client shows "check your email" message). Test this before production deployment.

- [ ] (both) Configure a real Resend API key in `.env` (`RESEND_API_KEY`)
- [ ] (both) Set `NUXT_SKIP_EMAIL_CONFIRMATION="false"` in `.env`
- [ ] (human) Register a new user at `/register`
  - [ ] Verify the app shows "Account created! Please check your email to confirm your account before signing in."
  - [ ] Verify the user **cannot** log in before confirming their email
- [ ] (human) Check the email inbox for a confirmation link from Supabase
  - [ ] Verify the email is received and contains a valid confirmation link
- [ ] (human) Click the confirmation link
  - [ ] Verify the link confirms the email (Supabase handles this natively)
  - [ ] Verify the user can now log in with their credentials
- [ ] (both) Restore `NUXT_SKIP_EMAIL_CONFIRMATION="true"` in `.env` after testing

---

## 4. Demo Data Reset

- [x] (human) Login as kyrie and navigate to `/home`
- [x] (human) Click "Reset Demo Data" button (should be visible in dev environment)
  - [x] Verify the button triggers a data reset (brief loading state)
  - [x] Verify 4 activity cards appear: Work, Test, Chores, Facebook
  - [x] Verify all timer values reset to 0m 0s
  - [x] Verify Earned Breaks section shows Coffee Break and Stretch Break
  - [x] Verify Rewards section shows demo rewards across period tabs

---

## 5. Activity CRUD

### 5.1 Activity Cards Display

- [x] (human) On `/home`, verify 4 demo activity cards are visible
  - [x] Verify each card shows: name, activity type indicator, "Time" label with 0m 0s, play button
  - [x] Verify "Work" and "Test" show as Rewardable type
  - [x] Verify "Chores" shows as Non-Rewardable type
  - [x] Verify "Facebook" shows as Wasted type

### 5.2 Create Activity

- [x] (human) Click the "Add Activity" button (or "+" icon)
  - [x] Verify the create dialog opens with fields: Name, Description, Activity Type, Time Estimate section, Recurring checkbox
- [x] (human) Create a new Rewardable activity named "Study" with default settings
  - [x] Verify the new activity card appears in the list
  - [x] Verify it shows as Rewardable type

### 5.3 Three-Dot Context Menu (Activity Cards)

- [ ] (human) Verify each activity card has a three-dot (⋮) icon
- [ ] (human) Click the three-dot icon on an activity card
  - [ ] Verify a popover menu appears with "Edit" and "Delete" options
- [ ] (human) Click outside the menu
  - [ ] Verify the menu closes

### 5.4 Edit Activity

- [x] (human) Open the edit dialog for the "Study" activity via three-dot menu → Edit
  - [x] Verify fields are pre-populated with current values
- [x] (human) Change the name to "Study Math" and save
  - [x] Verify the card updates to show "Study Math"

### 5.5 Delete Activity

- [x] (human) Delete the "Study Math" activity via three-dot menu → Delete
  - [x] Verify a confirmation dialog appears
  - [x] Confirm deletion
  - [x] Verify the activity card is removed from the list

### 5.6 Unarchive Activity

- [x] (human) Navigate to `/settings`
  - [x] Verify "Archived Activities" section exists
- [x] (human) Restore the previously deleted "Study Math" activity
  - [x] Navigate back to `/home` and verify it reappears

---

## 6. Activity Timers — Start/Stop

### 6.1 Start a Timer

- [x] (human) Click the play button on "Work" activity
  - [x] Verify the timer starts incrementing (0m 1s, 0m 2s, ...)
  - [x] Verify the "Time" display updates every second
  - [x] Verify the play button changes to a pause/stop button

### 6.2 Stop a Timer

- [x] (human) Click the stop button on the running "Work" activity
  - [x] Verify the timer stops incrementing
  - [x] Verify the accumulated time is preserved (e.g., stays at 0m 15s)

### 6.3 Switching Activities

- [x] (human) Start "Work" activity, wait a few seconds
- [x] (human) Start "Test" activity without stopping "Work" first
  - [x] Verify "Work" automatically stops
  - [x] Verify "Test" starts running
  - [x] Verify "Work" preserves its accumulated time

### 6.4 Timer Display Format

- [x] (human) Let an activity run for at least 1 minute
  - [x] Verify format shows `Xm Ys` (e.g., "1m 23s")
- [ ] (human) (If feasible) Let an activity accumulate over 1 hour
  - [ ] Verify format switches to `Xh Ym` (e.g., "1h 2m")

### 6.5 "All" Timer for Recurring Activities

- [x] (human) Run "Work" (recurring) for some time, then stop
- [x] (human) Verify both "Time" (today) and "All" (total) values are displayed
- [x] (human) Verify "Facebook" (non-recurring) does NOT show "All" timer

---

## 7. AutoPause

### 7.1 AutoPause Status Line

- [x] (human) Start any activity
  - [x] Verify the AutoPause status line appears below "Today" heading
  - [x] Verify it shows: "Activity {Name} Auto Pause in {M}m {S}s"
  - [x] Verify the countdown decrements every second

### 7.2 AutoPause Trigger

- [x] (human) In Settings, set AutoPause to a short value (e.g., 1 minute) for faster testing
- [x] (human) Start an activity and wait for AutoPause to fire
  - [x] Verify the activity card gets a yellow-beige background (#FAFAD2 or similar)
  - [x] Verify the status line changes to "Auto Paused after {N} minutes of total activity"
  - [x] Verify the timer stops incrementing
  - [x] (If flash enabled) Verify the card background alternates/flashes

### 7.3 Cumulative AutoPause

- [x] (human) Set AutoPause to 2 minutes
- [x] (human) Run "Work" for ~45 seconds, stop it
- [x] (human) Run "Chores" for ~45 seconds, stop it
- [x] (human) Run "Facebook" for ~30+ seconds
  - [x] Verify AutoPause fires at the 2-minute cumulative mark (not per-activity)
  - [x] Verify the status line says "Auto Paused after 2 minutes of total activity"

### 7.4 Fresh Window After AutoPause

- [x] (human) After AutoPause fires on an activity, restart the SAME activity
  - [x] Verify a fresh AutoPause countdown begins (not continuing from cumulative total)

### 7.5 Audio Notification

- [x] (human) Enable "Audio on AutoPause" in Settings
- [x] (human) Let AutoPause fire
  - [x] Verify a notification sound plays when AutoPause triggers
- [x] (human) Disable the setting and verify no sound on next AutoPause

---

## 8. Earned Breaks

### 8.1 Section Display

- [x] (human) On `/home`, verify the "Earned Breaks" section appears between Today and Rewardable Time
  - [x] Verify section heading "Earned Breaks" with [+ Add] button
  - [x] Verify demo breaks are displayed (Coffee Break, Stretch Break)

### 8.2 Break Progress

- [x] (human) Start a Rewardable activity ("Work")
  - [x] Verify break progress bars increment in real time
  - [x] Verify progress text updates (e.g., "1m / 30m")
- [x] (human) Start a Wasted activity ("Facebook")
  - [x] Verify break progress bars do NOT increment

### 8.3 Non-Rewardable Contribution to Breaks

- [x] (human) In Settings, check the current value of "Include Non-Rewardable in Breaks"
- [x] (human) With it OFF: start "Chores" (Non-Rewardable)
  - [x] Verify break progress does NOT increment
- [x] (human) With it ON: start "Chores"
  - [x] Verify break progress DOES increment

### 8.4 Break Earned ("$" Chip)

- [x] (both) Set a break goal to a very short time (e.g., 1 minute) for testing
  - [x] (ai) Update break goal via database if needed
  - [x] (human) Run a Rewardable activity until the break goal is met
  - [x] (human) Verify "$" chip appears on the break card
  - [x] (human) Verify "Take" button becomes enabled

### 8.5 Take Break (Timed)

- [x] (human) Click "Take" on an earned break that has a duration specified
  - [x] Verify the running activity is paused
  - [x] Verify the AutoPause status line is replaced with break status: "On Break - Xm Ys remaining"
  - [x] Verify the break card shows "Active" badge with countdown
  - [x] Verify the countdown decrements every second

### 8.6 End Break

- [x] (human) Click "End Break" before the countdown expires
  - [x] Verify status changes to "Break over"
  - [x] Verify the previously running activity is NOT automatically resumed
- [x] (human) Start any activity
  - [x] Verify "Break over" status clears and AutoPause countdown resumes

### 8.7 Take Break (Open-Ended)

- [x] (both) Create or modify a break with no duration (open-ended)
  - [x] (human) Earn the break and click "Take"
  - [x] (human) Verify status shows "On Break" without a countdown timer
  - [x] (human) Click "End Break"
  - [x] (human) Verify status changes to "Break over"

### 8.8 Break Auto-End (Countdown Reaches 0)

- [x] (both) Set a break with a very short duration (e.g., 1 minute) and earn it
  - [x] (human) Take the break and wait for the countdown to reach 0
  - [x] (human) Verify the break auto-ends and status changes to "Break over"

### 8.9 Create Break

- [x] (human) Click [+ Add] in the Earned Breaks section
  - [x] Verify dialog with fields: Name, Goal Time, Break Duration (optional), Recurring checkbox
- [x] (human) Create a new break "Quick Rest" with 5-minute goal, 2-minute duration, recurring
  - [x] Verify it appears in the Earned Breaks section

### 8.10 Three-Dot Context Menu (Break Cards)

- [ ] (human) Verify each break card has a three-dot (⋮) icon in its header row
- [ ] (human) Click the three-dot icon on a break card
  - [ ] Verify a popover menu appears with "Edit" and "Delete" options
- [ ] (human) While a break is actively being taken, open its three-dot menu
  - [ ] Verify "Edit" is disabled (greyed out) during an active break

### 8.11 Edit Break

- [ ] (human) Open the three-dot menu on a break card and click "Edit"
  - [ ] Verify the Edit Break dialog appears with fields pre-populated (Name, Goal Time, Break Duration, Recurring)
- [ ] (human) Change the break name and goal time, then save
  - [ ] Verify the break card updates to show the new values

### 8.12 Delete Break

- [x] (human) Delete the "Quick Rest" break via three-dot menu
  - [x] Verify confirmation dialog appears
  - [x] Confirm and verify the break is removed

### 8.13 Recurring Break Reset

- [x] (both) Earn and take a recurring break
  - [x] (human) Verify progress resets to 0 after the break is taken
  - [x] (human) Verify the break card remains visible and re-accumulation begins

---

## 9. Rewardable Time

### 9.1 Display Format

- [x] (human) On `/home`, verify the "Rewardable Time" section appears
  - [x] Verify "Today" label on first line, then "Xh Ym / (est.) Ah Bm" on second line
  - [x] Verify "This Week" label with the same inline format
  - [x] Verify progress circles are displayed alongside each

### 9.2 Real-Time Incrementing

- [x] (human) Start a Rewardable activity
  - [x] Verify Today's Rewardable Time increments every second
  - [x] Verify This Week's Rewardable Time increments every second
  - [x] Verify progress circle percentages update

### 9.3 Non-Rewardable Contribution

- [x] (human) With "Include Non-Rewardable in Rewards" ON (Settings):
  - [x] Start "Chores" (Non-Rewardable) and verify Rewardable Time DOES increment
- [x] (human) With the setting OFF:
  - [x] Start "Chores" and verify Rewardable Time does NOT increment
- [x] (human) Start "Facebook" (Wasted)
  - [x] Verify Rewardable Time NEVER increments regardless of setting

### 9.4 Progress Circles

- [x] (human) Verify the daily progress circle shows percentage based on `average_work_day` setting
- [x] (human) Verify the weekly progress circle shows percentage based on `average_work_week` setting
- [ ] (human) (If possible) Verify overflow behavior: when progress exceeds 100%, a second (red) circle appears

---

## 10. Rewards

### 10.1 Section Display

- [x] (human) On `/home`, verify the "Rewards" section appears below Rewardable Time
  - [x] Verify section heading "Rewards" with [+ Add] button
  - [x] Verify tabbed interface with period tabs (Daily, SemiWeekly, Weekly, etc.)
  - [x] Verify only tabs with configured rewards are shown

### 10.2 Reward Progress

- [x] (human) Start a Rewardable activity
  - [x] Verify reward progress bars increment in real time
  - [x] Verify progress text updates (e.g., "5m / 60m")
- [x] (human) Start a Wasted activity
  - [x] Verify reward progress does NOT increment

### 10.3 Reward Earned

- [x] (both) Set a reward goal to a very short time for testing (e.g., 2 minutes)
  - [x] (ai) Update reward goal via database if needed
  - [x] (human) Run a Rewardable activity until the goal is met
  - [x] (human) Verify "$" chip appears on the reward card
  - [x] (human) Verify "EARNED!" label appears
  - [x] (human) Verify "Cash In" button becomes enabled

### 10.4 Cash In Reward

- [x] (human) Click "Cash In" on an earned reward
  - [x] Verify a simple confirmation dialog appears: "Cash in **{reward name}**?" with Cancel and Cash In buttons
  - [x] Verify there is NO description field in the dialog
- [x] (human) Click "Cash In" to confirm
  - [x] Verify the reward is marked as cashed in

### 10.5 Recurring Reward Cycle Behavior

- [x] (both) Set a recurring reward goal to a very short time (e.g., 2 minutes)
  - [x] (ai) Update reward goal via database if needed
  - [x] (human) Run a Rewardable activity past the goal time (e.g., let it run for 5+ minutes)
  - [x] (human) Verify progress bar resets and shows progress toward the next cycle (not stuck at 100%)
  - [x] (human) Verify "$" chip shows the unclaimed count (e.g., "$ x2" if two cycles earned)
  - [x] (human) Verify "EARNED!" label shows count (e.g., "EARNED! (2 available)")
- [x] (human) Cash in one cycle
  - [x] Verify the count decreases by one (e.g., "$ x2" becomes "$ x1")
  - [x] Verify Cash In remains enabled if more unclaimed cycles exist
- [x] (human) Cash in remaining cycles
  - [x] Verify "$" chip and "EARNED!" label disappear when no unclaimed cycles remain
  - [x] Verify progress bar shows current accumulation toward the next cycle

### 10.6 Create Reward

- [x] (human) Click [+ Add] in the Rewards section
  - [x] Verify dialog with fields: Name, Reward Type (period dropdown), Goal Time, Recurring checkbox
- [x] (human) Create a new "Daily Reading" reward with 30-minute goal, daily, recurring
  - [x] Verify it appears under the Daily tab

### 10.7 Three-Dot Context Menu (Reward Cards)

- [ ] (human) Verify each reward card has a three-dot (⋮) icon in its header row
- [ ] (human) Click the three-dot icon on a reward card
  - [ ] Verify a popover menu appears with "Edit" and "Delete" options

### 10.8 Edit Reward

- [ ] (human) Open the three-dot menu on a reward card and click "Edit"
  - [ ] Verify the Edit Reward dialog appears with fields pre-populated (Name, Reward Period, Work Goal, Recurring)
- [ ] (human) Change the reward name and work goal, then save
  - [ ] Verify the reward card updates to show the new values

### 10.9 Delete Reward

- [x] (human) Delete the "Daily Reading" reward via three-dot menu
  - [x] Verify confirmation dialog
  - [x] Confirm and verify it is removed

### 10.8 Rewards Management Page

- [x] (human) Navigate to `/rewards`
  - [x] Verify today's progress summary is displayed
  - [x] Verify active rewards are listed

---

## 11. Activity Completion (Check-Off)

### 11.1 Check Off a Recurring Activity

- [x] (human) Click the checkbox on "Work" (recurring)
  - [x] Verify the card shows a completed state (reduced opacity, strikethrough, "Done" label)
  - [x] Verify the timer button is disabled
  - [x] Verify the activity card remains visible

### 11.2 Uncheck a Recurring Activity

- [x] (human) Uncheck "Work"
  - [x] Verify the card returns to normal active state
  - [x] Verify the timer button is re-enabled

### 11.3 Check Off a Non-Recurring Activity

- [x] (human) Click the checkbox on "Facebook" (non-recurring)
  - [x] Verify the card shows a completed state
  - [x] Verify the card remains visible (same-day behavior)

### 11.4 Stopping Running Activity on Check-Off

- [x] (human) Start "Test" activity (timer running)
- [x] (human) Check off "Test" while it is running
  - [x] Verify the timer stops
  - [x] Verify the activity shows as completed

---

## 12. Activity Time Estimates

### 12.1 General Daily Estimate

- [x] (human) Edit an activity and set estimate type to "General Daily Estimate" with 2.0 hours
  - [x] Save and verify a progress circle appears on the activity card
  - [x] Verify the progress circle reflects today's time vs the 2-hour estimate

### 12.2 Specific Day Estimate

- [x] (human) Edit an activity and set estimate type to "Specific Day Estimate"
  - [x] Set today's day of the week to 1.0 hours, others to different values
  - [x] Save and verify the progress circle uses today's specific estimate

### 12.3 No Estimate

- [x] (human) Edit an activity and set estimate type to "No Estimate"
  - [x] Verify no progress circle appears on the activity card

---

## 13. Settings Page

### 13.1 AutoPause Settings

- [x] (human) Navigate to `/settings`
- [x] (human) Change "AutoPause Minutes" to a new value (e.g., 30)
  - [x] Verify the setting saves
  - [x] Return to `/home`, start an activity, and verify the countdown uses the new value
- [x] (human) Toggle "Flash on AutoPause" (animated indicator) on/off
  - [x] Verify the setting persists across page refresh

### 13.2 Rewardable Time Goals

- [x] (human) Change "Average Work Day" to 6.0 hours
  - [x] Verify it saves
  - [x] On `/home`, verify the daily Rewardable Time goal updates to "6h 0m"
- [x] (human) Change "Average Work Week" to 30.0 hours
  - [x] Verify the weekly goal updates to "30h 0m"

### 13.3 Include Non-Rewardable in Rewards

- [x] (human) Toggle "Include Non-Rewardable in Rewards"
  - [x] Verify the setting persists
  - [x] Verify behavior changes on `/home` (tested in Sections 9.3 and 10.2)

### 13.4 Theme

> **Deferred to Visual Pass phase.** The setting saves and toggles the CSS class correctly, but all pages are currently styled with hardcoded dark-mode colors (no `dark:` Tailwind variants). Light and System themes will have no visible effect until light-mode styles are added across all pages.

- [ ] (human) Switch theme to "Dark"
  - [ ] Verify the UI switches to dark mode
- [ ] (human) Switch theme to "Light"
  - [ ] Verify the UI switches to light mode
- [ ] (human) Switch theme to "System"
  - [ ] Verify it follows the OS preference

---

## 14. Connection Status and Offline Behavior

> **Reference**: PRD Section 6 (Offline & Reconnection Strategy), PRD Section 7.3 (Offline-Aware Authentication)

### 14.1 Online Status Indicator

- [ ] (human) With network connected, verify no connection warning banner is visible
- [ ] (human) Verify the header area does NOT show "Offline" or "Reconnecting" text

### 14.2 Going Offline

- [x ] (human) Disconnect from the network (disable WiFi or use browser DevTools Network tab -> Offline)
  - [x ] Verify a red "You're offline" banner appears below the header
  - [ x] Verify the banner is not flicker-y (should stay solid red, not alternate with "Reconnecting")
- [ ] (human) While offline, start an activity
  - [ ] Verify the activity appears to start (optimistic UI — timer shows running state)
  - [ ] Verify the queued action count appears in the offline banner (e.g., "1 queued")
- [x ] (human) While offline, stop the same activity
  - [ ] Verify the activity appears to stop (optimistic UI)
  - [ ] Verify the queue count updates (may show 0 if start+stop collapsed into no-op per deduplication rules)
- [ x] (human) While offline, attempt to create a new activity
  - [x ] Verify an error toast appears: "You're offline. Creating activities requires a connection." (or similar)
- [x ] (human) While offline, attempt to edit or delete an activity via three-dot menu
  - [x ] Verify an error toast appears (online-only action)
- [ ] (human) While offline, attempt to cash in a reward (if one is earned)
  - [ ] Verify an error toast appears (online-only action)

### 14.3 Reconnecting

- [x] (human) With queued actions pending, reconnect to the network (re-enable WiFi)
  - [x] Verify the offline banner disappears
  - [x] Verify a "Back online" toast appears briefly (~3 seconds)
  - [x] Verify queued actions are replayed (toast: "X queued action(s) synced")
  - [x ] (ai) Verify timer state now matches the server (full state refresh occurred)
- [x] (human) If a start was queued and successfully replayed:
  - [x] (ai) Verify the activity is now running with the correct server-calculated time
  - [x] (human) Hard-refresh the page after reconnecting
  

  - [x ] Verify the queue is empty (no stale queued actions)
    -   You can check this in your browser's DevTools:

        Open DevTools (F12)
        Go to the Application tab (or Storage in Firefox)
        In the left sidebar, expand Local Storage and click on your site's URL
        Look for the key offline-command-queue
        Its value should be [] (empty array)
        Alternatively, you can just type this in the DevTools Console:

        JSON.parse(localStorage.getItem('offline-command-queue'))
  - [x] Verify all activity states match the server:
        1. Note each activity card's displayed time and status (running/idle/paused)
        2. Hard-refresh the page (Ctrl+Shift+R)
        3. Confirm the values are the same after refresh — if they don't change, the client was already in sync with the server

### 14.4 Tab Backgrounding

- [x] (human) Start an activity, then switch to a different browser tab (or minimize the browser) for at least 30 seconds
- [x] (human) Return to the TimeReward tab
  - [x] Verify the timer value jumps to the correct current value (state refresh on tab foreground)
  - [x] Verify the AutoPause countdown (if applicable) shows the correct remaining time
- [x] (human) Background the tab for 2+ minutes (long enough for potential WebSocket disconnection)
- [x] (human) Return to the tab
  - [x] Verify the connection is re-established (no lingering "Reconnecting" state)
  - [x] Verify timer values are correct

### 14.5 Offline Login (PRD Section 7.3)

> **Prerequisite:** You must be **logged out** before starting these tests. If you're logged in, the `guest` middleware will redirect you back to `/home` instead of showing the login page. Log out first, then disable WiFi.

- [x ] (human) Navigate to `/login` while offline (disable WiFi or use DevTools Network -> Offline)
  - [x ] Verify an amber offline banner appears: "You are offline. Sign in requires an internet connection."
  - [x ] Verify the "Sign In" button is disabled (reduced opacity, cursor-not-allowed)
- [x ] (human) Reconnect to the network
  - [ x] Verify the offline banner disappears
  - [ x] Verify the "Sign In" button becomes enabled
- [x ] (human) While online, enter valid credentials and disconnect mid-request (use DevTools Network -> Offline right after clicking Sign In)
  - [ ] Verify the error message says "Unable to connect..." — NOT "Invalid username or password"
    NOTE: I don't observe this, I think because it's logging in too quickly. Instead, I get an "offline" message; and a message saying that it couldn't fetch the activities. This looks OK, to me.

### 14.6 Offline Registration (PRD Section 7.3)

> **Prerequisite:** You must be **logged out** before starting these tests (same as 14.5).
> **Important:** You cannot type `/register` in the address bar while offline — Chrome DevTools offline mode blocks all network including localhost, so any full-page navigation fails with `ERR_INTERNET_DISCONNECTED`. Use one of the two approaches below instead.

**Approach A (reactive detection):**
- [ x] (human) Navigate to `/register` while **online** (page loads normally)
- [ x] (human) Go offline (DevTools Network → Offline)
  - [ x] Verify the amber offline banner appears: "You are offline. Registration requires an internet connection."
  - [x] Verify the "Create Account" button is disabled
- [ x] (human) Reconnect and verify the banner disappears and the button re-enables

**Approach B (client-side navigation):**
- [ ] (human) While already on `/login` offline (per 14.5), click the "Create one" link
  - [ ] Verify client-side navigation to `/register` succeeds (no `ERR_INTERNET_DISCONNECTED`)
  - [ ] Verify the amber offline banner appears: "You are offline. Registration requires an internet connection."
  - [ ] Verify the "Create Account" button is disabled

### 14.7 Online-Only Actions While Offline

- [x ] (human) Go offline, then attempt each of these actions and verify an appropriate error toast:
  - [x ] Create a new earned break
  - [x ] Edit an existing earned break
  - [x ] Delete an earned break
  - [x ] Create a new reward
  - [x ] Edit an existing reward
  - [x ] Delete a reward
  - [x ] Take a break (activate an earned break)
  - [x ] Change a setting on the Settings page

### 14.8 AutoPause During Offline

- [x] (human) Set AutoPause to 2 minutes
- [x] (human) Start an activity
- [x] (human) Go offline after ~30 seconds of running
- [x] (human) Wait at least 2 minutes (past the AutoPause threshold)
- [x] (human) Reconnect to the network
  - [x] Verify the activity is shown as auto-paused (yellow background, AutoPause status line)
  - [x] Verify the timer shows the correct time (up to the AutoPause threshold, not continuing beyond it)

### 14.9 Rapid Start/Stop — Idempotency (PRD 6.9)

- [x] (human) Rapidly double-click the Start (play) button on an activity
  - [x] Verify only one timer starts (no visual glitch, no duplicate state)
  - [x] (both) Check the database for duplicate `activity_time_logs` entries — there should be exactly one open log (no `ended_at`) for this timer
- [x] (human) Rapidly double-click the Stop button on a running activity
  - [x] Verify no error toast appears (server returns success on duplicate stop)
  - [x] Verify the timer shows the correct accumulated time
- [x] (human) Start an activity, go offline, then reconnect
  - [x] If the START was queued and replayed, verify no error on the replay (even if it was already applied before the disconnect)
  - [x] (both) Verify no duplicate `activity_time_logs` entries in the database

---

## 15. Multi-Tab Behavior (PRD 6.7)

> **Reference**: PRD Section 6.7 (Multi-Tab Behavior)

### 15.1 Same-Tab Offline Queue

- [x] (human) Open `/home` in a single tab
- [x] (human) Go offline, start an activity, stop it
  - [x] Verify the queued action count shows appropriately (may be 0 if start+stop collapsed per deduplication rules)
- [x] (human) Reconnect and verify the queue processes correctly

### 15.2 Multi-Tab Offline Queue

> **Note**: While offline, tabs cannot communicate — there is no Realtime sync and no shared Vue state. Each tab's optimistic UI is independent. The only shared resource is the `localStorage` offline command queue (PRD 6.7.3). This test verifies that queued commands from different tabs are replayed correctly on reconnection.
>
> **Testing method**: Use real WiFi disconnect (not Chrome DevTools "Offline" checkbox). Chrome DevTools offline mode does not change `navigator.onLine` and causes persistent HTTP connection breakage that Chrome throttles in background tabs — producing unreliable results.
>
> **Queue dedup note**: Per PRD 6.2.2, START followed by STOP for the same timer while offline are collapsed into a no-op (both removed). The server state will be unchanged in that scenario.

- [ ] (human) Open `/home` in two tabs (Tab A and Tab B), both logged in as kyrie, with no activity running
- [ ] (human) Go offline (disable WiFi — affects both tabs)
- [ ] (human) In Tab A: start "Work"
  - [ ] Verify Tab A shows Work running (optimistic UI)
  - [ ] Verify Tab B is unaffected (still shows Work as idle — expected, since tabs don't sync offline)
- [ ] (human) In Tab A: stop "Work"
  - [ ] Verify Tab A shows Work stopped (optimistic UI)
- [ ] (human) Reconnect (re-enable WiFi)
  - [ ] Verify Tab A auto-syncs within a few seconds (foreground tab recovers first)
  - [ ] Switch to Tab B — verify it syncs within a few seconds of becoming visible
  - [ ] In DevTools Console for both tabs, verify: `JSON.parse(localStorage.getItem('offline-command-queue'))` returns `[]`

### 15.3 Multi-Tab Realtime Consistency

- [ ] (human) Open `/home` in two tabs
- [ ] (human) In Tab A: start "Work"
  - [ ] Verify Tab B shows "Work" running with timer incrementing (via Realtime, not queue)
- [ ] (human) In Tab B: start "Test" (switching activities)
  - [ ] Verify Tab A shows "Work" stopped and "Test" running

### 15.4 Connection Status Singleton

- [ ] (human) Open DevTools Console in a tab running `/home`
  - [ ] Verify there is only one `[ConnectionStatus] Channel status: SUBSCRIBED` log (not two or more)
  - [ ] Navigate to `/settings` and back to `/home`
  - [ ] Verify the connection status continues to work correctly (banner does not appear erroneously)

---

## 16. Multi-Browser Sync

> **Note**: Same-browser multi-tab tests are covered in Section 15 above. This section covers cross-browser (e.g., Chrome + Edge) synchronization.

### 16.1 Same User, Two Different Browsers

- [ ] (human) Open `/home` in Chrome and Edge (or another browser), both logged in as kyrie
- [ ] (human) In Chrome: start "Test" activity
  - [ ] Verify Edge shows "Test" running with timer incrementing (within ~1 second)
- [ ] (human) In Edge: stop "Test"
  - [ ] Verify Chrome shows "Test" stopped

### 16.2 Cross-Browser Rewardable Time

- [ ] (human) With two browsers open, start a Rewardable activity in one
  - [ ] Verify Rewardable Time values increment in BOTH browsers
  - [ ] Verify values are within 1 second of each other

### 16.3 Cross-Browser AutoPause

- [ ] (human) Let AutoPause fire in one browser
  - [ ] Verify the other browser also shows the activity as auto-paused
  - [ ] Verify both browsers show the same AutoPause status line

---

## 17. Subscription Flow

### 17.1 Subscription Middleware

- [ ] (human) If the test user has an active subscription/trial:
  - [ ] Verify `/home`, `/settings`, `/rewards` are accessible
- [ ] (both) If possible, simulate an expired trial:
  - [ ] (ai) Update user profile to set `trial_end` to a past date and `subscription_status` to 'expired'
  - [ ] (human) Navigate to `/home`
  - [ ] Verify redirect to `/subscription/expired`

### 17.2 Subscription Expired Page

- [ ] (human) On `/subscription/expired`:
  - [ ] Verify three plan cards are displayed (Monthly, 6-Month, Yearly)
  - [ ] Verify "Best Value" badge on Yearly plan
  - [ ] Verify plan features are listed

### 17.3 Stripe Checkout (if Stripe test keys configured)

- [ ] (human) Click a plan card to initiate checkout
  - [ ] Verify redirect to Stripe checkout page
  - [ ] (Use Stripe test card 4242 4242 4242 4242 to complete)
  - [ ] Verify redirect to `/subscription/success`
  - [ ] Verify success page shows, then redirects to `/home`

### 17.4 Restore Trial for Continued Testing

- [ ] (both) After subscription testing, restore the test user's access:
  - [ ] (ai) Update user profile to restore `subscription_status` to 'active' and `trial_end` to future date

---

## 18. Dashboard Section Order and Layout

- [ ] (human) On `/home`, verify the four sections appear in this exact order:
  1. **Today** — AutoPause status + activity cards
  2. **Earned Breaks** — Break progress bars
  3. **Rewardable Time** — Daily/Weekly with progress circles
  4. **Rewards** — Tabbed reward progress

### 18.1 Empty State Display

- [ ] (both) Delete all breaks and rewards to test empty states:
  - [ ] (human) Verify "Earned Breaks" section still shows with [+ Add] button and empty state message
  - [ ] (human) Verify "Rewards" section still shows with [+ Add] button and empty state message
- [ ] (human) Click "Reset Demo Data" to restore demo data after this test

---

## 19. Edge Cases

### 19.1 Page Refresh Persistence

- [ ] (human) Start an activity, note the timer value
- [ ] (human) Refresh the page (F5)
  - [ ] Verify the user remains logged in
  - [ ] Verify the activity is still shown as running
  - [ ] Verify the timer continues from where it left off (server-side state reconstruction)

### 19.2 Browser Close and Reopen

- [ ] (human) Start an activity, close the browser entirely
- [ ] (human) Reopen the browser and navigate to `/home`
  - [ ] Verify the timer shows accumulated time from when it was running
  - [ ] Verify AutoPause fires if the threshold was crossed while the browser was closed

### 19.3 Demo Data Reset Clears All State

- [ ] (human) Run some activities, earn breaks, accumulate reward progress
- [ ] (human) Click "Reset Demo Data"
  - [ ] Verify all timers reset to 0
  - [ ] Verify break progress resets
  - [ ] Verify reward progress resets
  - [ ] Verify the 4 standard demo activities are present

### 19.4 Mobile Responsiveness

- [ ] (human) Open `/home` on a mobile device or resize browser to ~375px width
  - [ ] Verify activity cards stack vertically
  - [ ] Verify all sections are visible and scrollable
  - [ ] Verify buttons are tappable (adequate touch target size)
  - [ ] Verify no horizontal overflow / scrollbar

---

## 20. Known Issues to Investigate

These items were flagged in the Migration Status document as needing verification:

- [ ] (both) Verify cross-browser sync for break activation (does taking a break in one browser show in another?)
- [ ] (both) Verify cross-browser sync for reward progress (does cashing-in sync across browsers?)
- [ ] (human) Verify AutoPause yellow-beige background color is correct (#FAFAD2 or similar)
- [ ] (human) Verify AutoPause flash effect works when `flash_on_auto_pause` is enabled
- [ ] (human) Check whether Non-Rewardable / Wasted Time stats appear below the 4 main sections (PRD Section 9.6.3)
- [ ] (human) Check whether reward tabs show period boundary display (PRD Section 11.4.6, e.g., "Today: Feb 26 3:00 AM - Feb 27 2:59 AM")
- [ ] (human) Verify three-dot context menus work consistently for activities, breaks, and rewards (see Sections 5.3, 8.10, 10.7)
- [ ] (human) Check display tolerance: does a timer near the AutoPause threshold clamp (e.g., 2m 59s -> 3m 0s)?

---

## 21. Bug Report Template

For any issues discovered during testing, document them using this format:

```
### Bug: [Short description]

**Section**: [Which test section above]
**Severity**: Critical / High / Medium / Low
**Steps to Reproduce**:
1. ...
2. ...
3. ...

**Expected**: [What should happen]
**Actual**: [What actually happens]
**Screenshot**: [If applicable]
**Console errors**: [If applicable]
```

---

*Generated: February 26, 2026 — Updated: March 17, 2026*
