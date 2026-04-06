# PRD for NUXT

> Historical note: This file is preserved as an archival extraction-ready derivative. It is not the canonical standalone PRD. Use `../PRD for NUXT.md` as the current source of truth.

## 1. Purpose
This document is the extraction-ready product requirements document for the Nuxt-based TimeReward application located at `NUXT_TimeReward`.

It describes the app as it exists today:

- current product scope
- current implementation model
- current routes and major features
- current test approach
- current open issues that remain visible in the codebase

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

## 3. Current stack

### 3.1 Framework and dependencies
Current core dependencies:

- Nuxt `^3.20.2`
- `@nuxtjs/supabase` `^2.0.3`
- `@pinia/nuxt` `^0.11.3`
- Pinia `^3.0.4`
- `@vueuse/nuxt` `^14.1.0`
- Stripe `^20.3.0`

The app currently runs on Nuxt 3 with `future.compatibilityVersion: 4`.

### 3.2 Implementation model
The application is built around:

- Nuxt file-based pages
- client-side composables for application logic
- Supabase Auth
- Supabase Realtime
- Supabase Postgres tables and RPC functions
- Nitro server routes for privileged or secret-bearing operations

## 4. Current route inventory

### 4.1 Public routes
- `/`
- `/login`
- `/register`

### 4.2 Authenticated app routes
- `/home`
- `/settings`
- `/rewards`

### 4.3 Subscription routes
- `/subscription/expired`
- `/subscription/success`

### 4.4 Route notes
- `/` is the landing page and redirects authenticated users to `/home`.
- `/home` is the primary application surface.
- `/settings` is the current settings/control-panel page.
- `/rewards` is a dedicated rewards page in addition to rewards UI shown on `/home`.

## 5. Core product requirements

### 5.1 Authentication
The app must support:

- login by username and password
- username-to-email resolution before Supabase password sign-in
- registration through a server-side privileged route
- graceful handling of offline/network failures during auth flows

### 5.2 Activities and timers
The app must allow users to:

- create, edit, archive, and delete activities
- classify activities as rewardable, non-rewardable, or wasted
- start and stop timers
- support recurring and non-recurring activities
- support activity time estimates

### 5.3 Timer and activity rules
The timer system must:

- support one active running timer at a time
- persist timer state in Supabase
- calculate daily and all-time timer values
- use Postgres RPC functions for start, stop, and auto-pause actions

Canonical timer RPCs:

- `start_activity`
- `stop_activity`
- `auto_pause_activity`

### 5.4 AutoPause
AutoPause must:

- use the user's configured threshold in minutes
- operate cumulatively across daily activity
- auto-pause the active timer when threshold is reached
- preserve accurate timestamps for pause events
- support offline replay when auto-pause occurs while disconnected
- support user-configurable flash and audio behavior

### 5.5 Offline and reconnect behavior
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

### 5.6 Real-time synchronization
The app must synchronize timer-related state across multiple browser contexts for the same user.

This includes:

- realtime subscription health
- timer state updates
- reconnect refresh behavior

### 5.7 Rewards
The app must allow users to:

- create, edit, and archive rewards
- accumulate reward progress from tracked time
- cash in completed rewards
- track recurring reward periods
- retain banked and cashed-in reward history

### 5.8 Earned breaks
The app must allow users to:

- create, edit, and archive breaks
- accumulate break progress from tracked time
- activate and end breaks
- support recurring and open-ended break behavior

### 5.9 User settings
The app must allow users to configure:

- auto-pause minutes
- flash on auto-pause
- audio on auto-pause
- inclusion of non-rewardable time in relevant calculations
- average work day goal
- average work week goal
- theme and other supported settings stored in user settings

### 5.10 Trial and subscription enforcement
Protected routes must require:

- an authenticated user
- an active subscription, or
- a valid unexpired trial

The app must support:

- trial duration logic
- expired-trial redirect behavior
- development trial bypass
- Stripe-backed subscription checkout/update flows

### 5.11 Demo data reset
In allowed development/testing contexts, the app must support resetting user data to a known demo state that includes:

- activities
- timers
- rewards
- breaks
- related reward banking state
- reset of auto-pause cumulative base

## 6. Current implementation boundaries

### 6.1 Client-side business logic
The main application logic currently lives in composables, including:

- `useAuth`
- `useActivities`
- `useRewards`
- `useBreaks`
- `useUserSettings`
- `useOfflineQueue`
- `useConnectionStatus`

### 6.2 Nitro server routes
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

## 7. Data model areas
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

## 8. Testing strategy

### 8.1 Active automated test layer
The active automated test layer currently evidenced in the app is Playwright.

Current Playwright coverage includes:

- multi-tab synchronization
- cross-browser synchronization
- multi-activity sequence behavior
- auto-pause-related real-time behavior

### 8.2 Current testing note
No app-level Vitest or `tests/` directory is currently evidenced under `NUXT_TimeReward`, so unit-test infrastructure should not be described as already established.

## 9. Known open items
The following items still appear open or unclear from the current codebase:

- Supabase callback is configured to `/confirm`, but no `confirm` page is currently present.
- No dedicated presence/awareness feature is currently evidenced.
- No separate reports page is currently evidenced.
- The main app UI remains highly concentrated in `home.vue`.

## 10. Documentation rules for this app
Future documentation for `NUXT_TimeReward` should label each major item as:

- implemented
- partially implemented
- open

Documentation should distinguish clearly between:

- behavioral requirements
- current implementation details
- future enhancements

Already-implemented features should not be described as future planned work.

## 11. Bottom line
`NUXT_TimeReward` is already a functioning application subtree, not a planned migration target.

This PRD should be used as the clean extraction-ready reference for the app:

- current behavior
- current architecture
- current routes and features
- current testing model
- clearly identified open issues
