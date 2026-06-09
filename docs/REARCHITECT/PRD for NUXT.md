# PRD for NUXT

## 1. Document purpose
This document describes the current product scope, implementation model, and known open items for the Nuxt-based TimeReward application rooted at `NUXT_TimeReward`.

It replaces migration-planning language with a current-state product requirements document.

This document intentionally does not cover the older "criteria for separation" material.

## 2. Product summary
TimeReward is a Nuxt + Supabase web application for:

- tracking activities in real time
- applying cumulative auto-pause rules
- working across reconnects and temporary offline periods
- earning progress toward rewards and breaks
- enforcing trial/subscription access

The app already exists and is not a greenfield migration target.

Its current implementation is centered on:

- Nuxt file-based pages
- client-side composables for business logic
- Supabase Auth, Realtime, Postgres tables, and Postgres RPC functions
- a small number of Nitro server routes for privileged operations

## 3. Product goals

### 3.1 Primary goals
- Let authenticated users track one active timer at a time.
- Keep timer state synchronized across reconnects and multiple browser contexts.
- Enforce cumulative auto-pause behavior across the user's daily activity.
- Support rewards and earned breaks based on tracked time.
- Preserve usability during temporary connectivity loss.
- Support subscription and trial gating for protected app areas.

### 3.2 Current non-goals
- This document does not define a future re-architecture.
- This document does not attempt to preserve older migration planning steps.
- This document does not assume an unimplemented server-route layer for all actions.

## 4. Current stack

### 4.1 Framework and libraries
Current app dependencies from `package.json`:

- Nuxt `^3.20.2`
- `@nuxtjs/supabase` `^2.0.3`
- `@pinia/nuxt` `^0.11.3`
- Pinia `^3.0.4`
- `@vueuse/nuxt` `^14.1.0`
- Stripe `^20.3.0`

The app currently runs on Nuxt 3 with `future.compatibilityVersion: 4` in `nuxt.config.ts`.

### 4.2 Nuxt structure
The app follows standard Nuxt structure concepts:

- `app/pages` for file-based routes
- `app/composables` for shared client logic
- `app/middleware` for route gating
- `server/api` for Nitro routes
- `supabase/migrations` for database schema and RPC evolution

## 5. Current route and page inventory

### 5.1 Public-facing routes
- `/` via `app/pages/index.vue`
- `/login` via `app/pages/login.vue`
- `/register` via `app/pages/register.vue`
- `/confirm` via `app/pages/confirm.vue`

### 5.2 Authenticated routes
- `/home` via `app/pages/home.vue`
- `/settings` via `app/pages/settings.vue`
- `/rewards` via `app/pages/rewards.vue`

### 5.3 Subscription-related routes
- `/subscription/expired`
- `/subscription/success`

### 5.4 Current route notes
- `index.vue` is a landing page and redirects authenticated users to `/home`.
- `home.vue` is the main application surface and currently contains most of the primary UI.
- `settings.vue` acts as the current control panel/settings page.
- `rewards.vue` exists as a dedicated rewards management page in addition to reward-related UI on `home.vue`.
- `confirm.vue` handles the Supabase auth callback flow, surfaces callback errors, and redirects the user to `/home` or `/login` as appropriate.

## 6. Functional scope

### 6.1 Activities and timers
The app must allow users to:

- create, edit, archive, and delete activities
- classify activities as `rewardable`, `non_rewardable`, or `wasted`
- start and stop timers
- complete and un-complete activities where supported by the timer model
- configure recurring vs non-recurring activity behavior
- configure time estimates for activities

Current implementation evidence:

- `app/pages/home.vue`
- `app/composables/useActivities.ts`
- `app/types/activity.ts`

### 6.2 Timer rules
The current timer model is based on:

- one running activity at a time
- timer state persisted in Supabase
- server-backed timer actions through Postgres RPC
- today totals and all-time totals maintained per timer

Current core RPCs:

- `start_activity`
- `stop_activity`
- `auto_pause_activity`

Evidence:

- `supabase/migrations/003_rpc_functions.sql`
- `supabase/migrations/025_idempotent_rpcs.sql`
- `supabase/migrations/026_autopause_timestamp_param.sql`
- `supabase/migrations/027_stop_activity_timestamp_param.sql`
- `supabase/migrations/028_start_activity_timestamp_param.sql`
- `app/composables/useActivities.ts`
- `app/composables/useOfflineQueue.ts`

### 6.3 AutoPause
The current AutoPause behavior is cumulative across daily activity and not just per single uninterrupted session.

The app must:

- read the configured auto-pause threshold from user settings
- count cumulative activity toward the threshold
- auto-pause the active timer when threshold is reached
- preserve accurate pause timestamps
- support optimistic UI updates on auto-pause
- replay auto-pause actions after offline periods when needed

Current implementation details:

- AutoPause minutes come from `user_settings`
- a cumulative base is used to create a fresh window after each auto-pause cycle
- audio and flash settings are user-configurable

Evidence:

- `app/composables/useActivities.ts`
- `app/composables/useUserSettings.ts`
- `app/pages/settings.vue`
- `supabase/migrations/009_audio_on_auto_pause.sql`

### 6.4 Offline and reconnect behavior
The app must remain usable during transient connectivity failures.

Current behavior:

- connection state is tracked as `online`, `offline`, or `connecting`
- a local offline queue stores timer-affecting commands
- queued commands are replayed when connectivity returns
- reconnect refreshes app state after queue processing
- stale or duplicate queued commands are limited

Queued command types:

- `START_ACTIVITY`
- `STOP_ACTIVITY`
- `AUTO_PAUSE_ACTIVITY`

Evidence:

- `app/composables/useConnectionStatus.ts`
- `app/composables/useOfflineQueue.ts`

### 6.5 Real-time sync
The app is intended to synchronize timer state across multiple tabs and browser sessions for the same user.

Current implementation evidence includes:

- Realtime connection status subscription
- activity-timer change subscription logic
- Playwright coverage targeting multi-tab and cross-browser sync

Evidence:

- `app/composables/useConnectionStatus.ts`
- `app/composables/useActivities.ts`
- `Playwright/multi-tab-sync.spec.ts`
- `Playwright/cross-browser-sync.spec.ts`

### 6.6 Authentication
The app uses Supabase Auth, but the implemented login flow is username-first from the user's point of view.

Current auth behavior:

- login uses username + password in the UI
- username is resolved to email via RPC
- password sign-in is then performed with Supabase Auth
- registration uses the normal Supabase signup flow when email confirmation is required, and a server-side admin-create flow only when development auto-confirmation is enabled
- the app handles offline/network failures explicitly in auth flows
- login and registration surfaces show offline warning states and disable submission when connectivity is not available
- successful sign-in and auto-confirmed registration redirect into `/home`, while confirmation-required registration shows a check-email message until the user completes the `/confirm` flow
- `confirm.vue` is part of the auth flow and handles Supabase callback completion, callback error display, and redirect back into the app

Current implementation evidence:

- `app/pages/login.vue`
- `app/pages/register.vue`
- `app/pages/confirm.vue`
- `app/composables/useAuth.ts`
- `server/api/auth/register.post.ts`
- `supabase/migrations/011_get_email_by_username.sql`

### 6.7 Trial and subscription gating
Protected routes must require an authenticated user with either:

- an active subscription, or
- an unexpired trial

Current implementation details:

- subscription middleware checks `subscription_status` and `trial_end`
- trial duration is environment-sensitive by default: 1 day in development and 30 days in staging/production unless overridden by env
- development trial bypass is supported
- expired or canceled users are redirected to subscription-expired UI
- subscription-expired UI loads available plans and starts Stripe Checkout
- subscription-success UI performs a subscription-status sync before returning the user to `/home`
- Stripe webhooks and manual status-refresh logic both update `user_profiles.subscription_status` to keep access state aligned with Stripe

Evidence:

- `app/middleware/subscription.ts`
- `app/config/trial.ts`
- `server/api/stripe/checkout.post.ts`
- `server/api/stripe/plans.get.ts`
- `server/api/stripe/update-subscription.post.ts`
- `server/api/stripe/webhook.post.ts`
- `server/api/stripe/*.ts`
- `app/pages/subscription/expired.vue`
- `app/pages/subscription/success.vue`

### 6.8 Rewards
The app includes a working rewards subsystem.

Users must be able to:

- create rewards
- edit rewards
- archive rewards
- accumulate progress from rewardable time
- cash in completed rewards
- track recurring reward periods
- view banked and cashed-in reward history

Current reward behavior includes:

- reward types of `daily`, `semi_weekly`, `weekly`, `monthly`, `quarterly`, and `yearly`
- reward-type-specific work-goal units, ranges, step sizes, and defaults
- storage of user-facing work-goal values alongside normalized `goal_minutes`
- work-time conversion rules for monthly, quarterly, and yearly rewards rather than flat calendar-minute conversions
- recurring reward periods with period-boundary logic used when calculating earned, banked, and claimed progress
- separate tracking of banked rewards and cashed-in rewards, including direct cash-ins versus cash-ins linked to previously banked rewards

Required reward semantics inherited from the legacy Blazor product include:

- expiring rewards via an `ExpiresAfter` concept that controls how long a banked reward remains claimable after the period ends
- timed rewards via a reward-duration field that defines what the user earns when the reward is achieved
- an `IsTimed` control that determines whether reward-duration behavior is active
- an `IsProrated` control that determines whether partial progress earns a proportional amount of reward time

These inherited reward semantics should be treated as required product scope for the standalone app even where the current extracted implementation is still incomplete.

Current implementation evidence:

- `app/utils/rewardTypeConfig.ts`
- `app/composables/useRewards.ts`
- `app/pages/rewards.vue`
- `app/pages/home.vue`
- `supabase/migrations/010_rewards.sql`
- `supabase/migrations/023_reward_work_goal.sql`
- `supabase/migrations/024_reward_8h_workday.sql`
- `docs/historical/migration/PRD - Nuxt Supabase Migration.Rewards Deltas March11.md`

### 6.9 Earned breaks
The app includes an earned-breaks subsystem.

Users must be able to:

- create breaks
- edit breaks
- archive breaks
- accumulate progress toward breaks
- activate/take a break
- end a break
- use recurring and open-ended break configurations

Current break behavior includes:

- break duration may be omitted, which creates an open-ended break with no countdown
- a newly created break starts measuring from its creation-time baseline rather than inheriting earlier same-day progress
- taking a break pauses the current activity and replaces the AutoPause status line with break status
- timed breaks auto-end when their countdown reaches zero
- ending a break does not automatically resume the previously running activity
- recurring breaks reset fully on the daily rollover, while non-recurring breaks keep their broader state but still reset their baseline for future progress calculation

Current implementation evidence:

- `app/composables/useBreaks.ts`
- `app/pages/home.vue`
- `docs/Manual Testing Plan.md`
- `supabase/migrations/016_optional_break_duration.sql`
- `supabase/migrations/021_break_baseline_seconds.sql`
- `supabase/migrations/022_reset_break_baseline.sql`
- `server/api/admin/load-demo-data.post.ts`

### 6.10 User settings and control panel
The current control-panel surface is the settings page.

Users must be able to configure:

- auto-pause duration
- flash-on-auto-pause
- audio-on-auto-pause
- rewardable-time goal settings
- average work day
- average work week
- inclusion of non-rewardable time in relevant calculations

Evidence:

- `app/pages/settings.vue`
- `app/composables/useUserSettings.ts`
- `supabase/migrations/014_average_work_goals.sql`

### 6.11 Demo data reset
In development and allowed test/demo contexts, the app must support a reset/load-demo-data flow that:

- clears user activities, timers, rewards, banked rewards, cashed-in rewards, and breaks
- resets auto-pause cumulative base
- inserts a known set of demo activities, rewards, and breaks

Evidence:

- `server/api/admin/load-demo-data.post.ts`
- `app/pages/home.vue`

## 7. Current UX model

### 7.1 Landing and auth
- The landing page is `index.vue`.
- Authenticated users are redirected from `/` to `/home`.
- Login and registration are standalone auth pages.

### 7.2 Main application screen
`home.vue` is currently the primary dashboard and operational screen.

It currently hosts:

- activity timer controls
- activity create/edit UI
- connection status UI
- reward summary and reward actions
- break summary and break actions
- demo reset action when enabled

### 7.3 Settings experience
`settings.vue` is the current settings/control panel implementation rather than a multi-tab admin shell.

### 7.4 Rewards experience
`rewards.vue` provides a dedicated reward management page in addition to reward-related UI surfaced on the home page.

## 8. Architecture and implementation model

### 8.1 Canonical app boundary
The canonical implementation model is:

- Nuxt pages for route surfaces
- client composables for business logic
- Supabase tables + RPC functions for stateful operations
- Nitro server routes only where privileged access or secrets are required

This is the correct current model and should replace older assumptions that every major operation has a matching Nuxt server endpoint.

### 8.2 Client composables
The main composables currently driving the app include:

- `useAuth`
- `useActivities`
- `useRewards`
- `useBreaks`
- `useUserSettings`
- `useOfflineQueue`
- `useConnectionStatus`

### 8.3 Nitro server routes
Current server routes are intentionally selective:

- `server/api/auth/register.post.ts`
- `server/api/admin/load-demo-data.post.ts`
- `server/api/stripe/checkout.post.ts`
- `server/api/stripe/plans.get.ts`
- `server/api/stripe/update-subscription.post.ts`
- `server/api/stripe/webhook.post.ts`

### 8.4 Supabase responsibilities
Supabase currently provides:

- authentication and sessions
- database tables
- row-level data access
- Postgres RPC functions for timer operations
- realtime subscriptions for sync workflows

## 9. Data and schema model

### 9.1 Key logical data areas
The current app relies on these core data areas:

- user profiles
- user settings
- activities
- activity timers
- rewards
- banked rewards
- cashed-in rewards
- user breaks

### 9.2 Notable implemented schema evolutions
The PRD should treat these as part of current implementation, not future gaps:

- rewards banking schema
- audio-on-auto-pause
- username-to-email lookup RPC
- average work day / week goals
- idempotent RPC improvements
- timestamp-aware offline replay improvements

Evidence:

- `supabase/migrations/009_audio_on_auto_pause.sql`
- `supabase/migrations/010_rewards.sql`
- `supabase/migrations/011_get_email_by_username.sql`
- `supabase/migrations/014_average_work_goals.sql`
- `supabase/migrations/025_idempotent_rpcs.sql`
- `supabase/migrations/026_autopause_timestamp_param.sql`
- `supabase/migrations/027_stop_activity_timestamp_param.sql`
- `supabase/migrations/028_start_activity_timestamp_param.sql`

## 10. Testing strategy

### 10.1 Current automated testing layer
The current documented automated test layer for the Nuxt app is Playwright.

Evidence:

- `Playwright/playwright.config.ts`
- `Playwright/index.md`
- `Playwright/multi-tab-sync.spec.ts`
- `Playwright/cross-browser-sync.spec.ts`
- `Playwright/multi-activity-sequence.spec.ts`

### 10.2 Current testing emphasis
The existing Playwright coverage emphasizes:

- multi-tab synchronization
- cross-browser synchronization
- auto-pause behavior
- activity switching sequences

### 10.3 Current gap in test stack
No app-level `vitest.config.*` or `tests/` directory is currently evidenced under `NUXT_TimeReward`, so unit-test infrastructure should not be described as already established.

## 11. Known gaps and open questions

### 11.1 Presence and awareness
No dedicated presence/awareness implementation was evidenced in the current Nuxt app.

### 11.2 Reports-style surface
No separate reports page was found in the current app.

### 11.3 Control-panel decomposition
The current settings/control surface exists, but it is implemented as a concrete `settings.vue` page rather than a broader tabbed control-panel system described in older planning material.

### 11.4 Component decomposition
The current UI is more page-centric than component-centric. In particular, `home.vue` remains a large, feature-dense page.

## 12. Documentation status rules for this app
Any future documentation for this app should clearly label each item as one of:

- implemented
- partially implemented
- open

Documentation should not describe already-built features as future planned work.

It should also distinguish clearly between:

- behavioral requirements
- current implementation details
- future enhancements

## 13. Extraction readiness summary
`NUXT_TimeReward` is already a functioning app subtree with:

- its own Nuxt app structure
- current feature implementation across auth, timers, rewards, breaks, settings, and subscriptions
- current Supabase migrations
- current Playwright test assets
- app-specific documentation under `docs/`

The most accurate way to describe the app at extraction time is:

- a current product/application snapshot

not:

- a planned migration target waiting to be created

## 14. Bottom line
This Nuxt PRD should be treated as the current-state reference for `NUXT_TimeReward`.

Its core framing is:

- current behavior specification
- current implementation snapshot
- clearly labeled remaining gaps

That framing matches the codebase substantially better than the older migration-planning document.
