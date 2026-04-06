# PRD for NUXT

> Historical note: This file is preserved as an archival handoff-ready derivative. It is not the canonical standalone PRD. Use `../PRD for NUXT.md` as the current source of truth.

## 1. Purpose
This document is the handoff-ready product requirements document for the Nuxt-based TimeReward application located at `NUXT_TimeReward`.

It is intended to help another developer quickly understand:

- what the app does
- what is already implemented
- how the code is organized
- where the main logic lives
- what remains visibly open in the current codebase

## 2. Product summary
TimeReward is a Nuxt + Supabase application for tracking time, enforcing cumulative auto-pause behavior, earning rewards and breaks, and handling temporary offline periods with reconnect-aware synchronization.

The app currently includes:

- activity tracking and timer control
- cumulative auto-pause
- offline queue and reconnect recovery
- real-time sync support
- rewards
- earned breaks
- user settings
- trial and subscription gating
- demo data reset for development/testing contexts

## 3. Getting oriented

### 3.1 Most important folders
- `NUXT_TimeReward/app/pages`
  - route surfaces such as landing, login, register, home, settings, rewards, and subscription pages
- `NUXT_TimeReward/app/composables`
  - main business logic for auth, activities, rewards, breaks, settings, connection state, and offline queue
- `NUXT_TimeReward/app/components`
  - shared UI components; currently much smaller than the page layer
- `NUXT_TimeReward/app/middleware`
  - route gating such as auth/subscription behavior
- `NUXT_TimeReward/server/api`
  - Nitro routes used for privileged or secret-bearing operations
- `NUXT_TimeReward/supabase/migrations`
  - schema evolution and RPC definitions
- `NUXT_TimeReward/Playwright`
  - end-to-end testing assets
- `NUXT_TimeReward/docs`
  - app-specific notes, decisions, and operational/testing documentation

### 3.2 Most important files to read first
- `NUXT_TimeReward/nuxt.config.ts`
  - runtime config, route rules, module registration, auth redirect settings
- `NUXT_TimeReward/app/pages/home.vue`
  - primary app surface and current concentration point for most feature UI
- `NUXT_TimeReward/app/composables/useActivities.ts`
  - activity/timer logic and AutoPause behavior
- `NUXT_TimeReward/app/composables/useOfflineQueue.ts`
  - offline command queue and replay logic
- `NUXT_TimeReward/app/composables/useConnectionStatus.ts`
  - reconnect detection and state refresh behavior
- `NUXT_TimeReward/app/composables/useAuth.ts`
  - auth flow, offline-aware login, and profile fetch behavior
- `NUXT_TimeReward/app/composables/useRewards.ts`
  - reward progress, banking, cash-in behavior
- `NUXT_TimeReward/app/composables/useBreaks.ts`
  - earned-break creation, progress, activation, and reset logic
- `NUXT_TimeReward/app/composables/useUserSettings.ts`
  - user preferences including AutoPause and rewardable-time goals
- `NUXT_TimeReward/server/api/auth/register.post.ts`
  - privileged registration path
- `NUXT_TimeReward/server/api/admin/load-demo-data.post.ts`
  - development/testing demo reset path
- `NUXT_TimeReward/server/api/stripe/checkout.post.ts`
  - subscription checkout flow

### 3.3 Practical orientation note
The current implementation is more page-centric than component-centric. A developer should expect a significant amount of operational UI logic in `home.vue` rather than in many small feature components.

## 4. Current stack

### 4.1 Framework and dependencies
Current core dependencies:

- Nuxt `^3.20.2`
- `@nuxtjs/supabase` `^2.0.3`
- `@pinia/nuxt` `^0.11.3`
- Pinia `^3.0.4`
- `@vueuse/nuxt` `^14.1.0`
- Stripe `^20.3.0`

The app currently runs on Nuxt 3 with `future.compatibilityVersion: 4`.

### 4.2 Implementation model
The application is built around:

- Nuxt file-based pages
- client-side composables for application logic
- Supabase Auth
- Supabase Realtime
- Supabase Postgres tables and RPC functions
- Nitro server routes for privileged or secret-bearing operations

## 5. Current route inventory

### 5.1 Public routes
- `/`
- `/login`
- `/register`

### 5.2 Authenticated app routes
- `/home`
- `/settings`
- `/rewards`

### 5.3 Subscription routes
- `/subscription/expired`
- `/subscription/success`

### 5.4 Route notes
- `/` is the landing page and redirects authenticated users to `/home`.
- `/home` is the primary application surface.
- `/settings` is the current settings/control-panel page.
- `/rewards` is a dedicated rewards page in addition to rewards UI shown on `/home`.

## 6. Core product requirements

### 6.1 Authentication
The app must support:

- login by username and password
- username-to-email resolution before Supabase password sign-in
- registration through a server-side privileged route
- graceful handling of offline/network failures during auth flows

### 6.2 Activities and timers
The app must allow users to:

- create, edit, archive, and delete activities
- classify activities as rewardable, non-rewardable, or wasted
- start and stop timers
- support recurring and non-recurring activities
- support activity time estimates

### 6.3 Timer and activity rules
The timer system must:

- support one active running timer at a time
- persist timer state in Supabase
- calculate daily and all-time timer values
- use Postgres RPC functions for start, stop, and auto-pause actions

Canonical timer RPCs:

- `start_activity`
- `stop_activity`
- `auto_pause_activity`

### 6.4 AutoPause
AutoPause must:

- use the user's configured threshold in minutes
- operate cumulatively across daily activity
- auto-pause the active timer when threshold is reached
- preserve accurate timestamps for pause events
- support offline replay when auto-pause occurs while disconnected
- support user-configurable flash and audio behavior

### 6.5 Offline and reconnect behavior
The app must:

- track connection state as online, offline, or reconnecting/connecting
- queue timer-affecting commands while offline
- deduplicate queued actions where appropriate
- replay queued actions on reconnect
- refresh application state after reconnect and queue replay

Queued offline actions currently include:

- start activity
- stop activity
- auto-pause activity

### 6.6 Real-time synchronization
The app must synchronize timer-related state across multiple browser contexts for the same user.

This includes:

- realtime subscription health
- timer state updates
- reconnect refresh behavior

### 6.7 Rewards
The app must allow users to:

- create, edit, and archive rewards
- accumulate reward progress from tracked time
- cash in completed rewards
- track recurring reward periods
- retain banked and cashed-in reward history

### 6.8 Earned breaks
The app must allow users to:

- create, edit, and archive breaks
- accumulate break progress from tracked time
- activate and end breaks
- support recurring and open-ended break behavior

### 6.9 User settings
The app must allow users to configure:

- auto-pause minutes
- flash on auto-pause
- audio on auto-pause
- inclusion of non-rewardable time in relevant calculations
- average work day goal
- average work week goal
- theme and other supported settings stored in user settings

### 6.10 Trial and subscription enforcement
Protected routes must require:

- an authenticated user
- an active subscription, or
- a valid unexpired trial

The app must support:

- trial duration logic
- expired-trial redirect behavior
- development trial bypass
- Stripe-backed subscription checkout/update flows

### 6.11 Demo data reset
In allowed development/testing contexts, the app must support resetting user data to a known demo state that includes:

- activities
- timers
- rewards
- breaks
- related reward banking state
- reset of auto-pause cumulative base

## 7. Current implementation boundaries

### 7.1 Client-side business logic
The main application logic currently lives in composables, including:

- `useAuth`
- `useActivities`
- `useRewards`
- `useBreaks`
- `useUserSettings`
- `useOfflineQueue`
- `useConnectionStatus`

### 7.2 Nitro server routes
The current server route surface is intentionally selective and includes:

- registration
- demo data loading
- Stripe checkout
- Stripe plans
- Stripe subscription update
- Stripe webhook handling

This application should be understood as:

- client/composable driven for day-to-day app behavior
- Supabase-backed for persistence, RPC, and realtime
- Nitro-backed only where server privilege or secrets are required

## 8. Data model areas
The current app depends on these key data areas:

- user profiles
- user settings
- activities
- activity timers
- rewards
- banked rewards
- cashed-in rewards
- user breaks

Notable implemented schema/RPC areas already present in the app include:

- rewards banking tables
- audio-on-auto-pause setting
- username-to-email lookup RPC
- average work day and week goals
- idempotent timer RPC behavior
- timestamp-aware replay support for offline start/stop/auto-pause

## 9. Testing strategy

### 9.1 Active automated test layer
The active automated test layer currently evidenced in the app is Playwright.

Current Playwright coverage includes:

- multi-tab synchronization
- cross-browser synchronization
- multi-activity sequence behavior
- auto-pause-related real-time behavior

### 9.2 Current testing note
No app-level Vitest or `tests/` directory is currently evidenced under `NUXT_TimeReward`, so unit-test infrastructure should not be described as already established.

## 10. Known open items
The following items still appear open or unclear from the current codebase:

- Supabase callback is configured to `/confirm`, but no `confirm` page is currently present.
- No dedicated presence/awareness feature is currently evidenced.
- No separate reports page is currently evidenced.
- The main app UI remains highly concentrated in `home.vue`.

## 11. Handoff notes

### 11.1 What a new developer should assume
- The codebase already contains substantial working functionality.
- The fastest way to understand behavior is to read the main composables and `home.vue`.
- Supabase RPC and migration history are important to understanding timer behavior.
- The existing Playwright folder is the best current starting point for understanding real-time and AutoPause expectations.

### 11.2 What a new developer should not assume
- Do not assume every app action has a matching Nitro endpoint.
- Do not assume the older migration-planning documents reflect current implementation state.
- Do not assume unit-test infrastructure already exists in the Nuxt app.

## 12. Documentation rules for this app
Future documentation for `NUXT_TimeReward` should label each major item as:

- implemented
- partially implemented
- open

Documentation should distinguish clearly between:

- behavioral requirements
- current implementation details
- future enhancements

Already-implemented features should not be described as future planned work.

## 13. Bottom line
`NUXT_TimeReward` is already a functioning application subtree, not a planned migration target.

This PRD should be used as the clean handoff-ready reference for the app:

- current behavior
- current architecture
- current routes and features
- current testing model
- clearly identified open issues
- a short orientation path for the next developer
