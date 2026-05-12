# Session Notes - 2026-02-27

## Summary

This session began the Manual Testing Plan walkthrough, made several fixes/improvements discovered during testing, implemented an email confirmation bypass for development, and refactored registration to use a server-side admin API endpoint. Continued with Manual Testing Plan through Section 5.1.

---

## Manual Testing Plan Progress

Sections completed:
- **Section 1: Prerequisites** — All done (database connectivity, Playwright MCP, dev server)
- **Section 2: Landing Page** — All passed
- **Section 3.1: Login** — Passed after fixing display name bug
- **Section 3.2: Registration** — All passed after refactoring to admin API; new user "bluto" created successfully, guest middleware verified
- **Section 3.3: Logout** — All passed (redirects to /login, auth middleware blocks /home)
- **Section 3.4: Email Verification** — Deferred to end of Manual Testing Plan (requires Resend API key)
- **Section 4: Demo Data Reset** — All passed
- **Section 5.1: Activity Cards Display** — Passed except: no visual indicator for non-recurring activities on card (see Known Issue #1 below)

Sections not yet started:
- Section 5.2 (Create Activity) through Section 20

**Note**: Activity start button appeared broken after demo data reset — resolved by page reload. Stale client-side UUIDs after reset. See 2026-02-28 session notes.

---

## Bugs Fixed

### 1. Display Name Not Showing After Login (showed "User" instead)

**Root cause:** `useSupabaseUser()` returns null on the client even when authenticated (session not yet restored from cookie). The `watch` in `useAuth()` never fired with a valid user ID.

**Fix:** Updated `fetchProfile()` to fall back to `supabase.auth.getSession()` when `useSupabaseUser()` is null. Also added a client-side eager fetch on composable initialization. Changed `profile` from `ref()` to `useState()` for shared state across components.

**Files changed:** `app/composables/useAuth.ts`

### 2. Registration Creating Profile Failed (403 Forbidden)

**Root cause:** After `signUp()`, the client tried to INSERT into `user_profiles` directly, but RLS policy (`auth.uid() = id`) blocked it because the session wasn't fully established. Also, the username uniqueness check used `.single()` on an anonymous query, causing 406 errors.

**Fix:** 
- Created database trigger `on_auth_user_created` on `auth.users` that auto-creates `user_profiles` and `user_settings` rows using SECURITY DEFINER (bypasses RLS)
- Username check now uses `get_email_by_username` RPC (already SECURITY DEFINER) instead of direct query
- Simplified `signUp()` to only call `supabase.auth.signUp()` — trigger handles the rest

**Database changes:** New trigger function `handle_new_user()` and trigger `on_auth_user_created`

**Files changed:** `app/composables/useAuth.ts`

### 3. New User Email Not Confirmed (can't log in after registration)

**Root cause:** Supabase project has email confirmation enabled. Normal `signUp()` creates an unconfirmed user who can't log in. The client-side `signUp()` also fails intermittently with "email address invalid" due to GoTrue's email validation and Supabase free-tier rate limits on confirmation emails.

**Initial workaround:** Manually confirmed bluto's email via SQL.

**Intermediate fix:** Added `NUXT_SKIP_EMAIL_CONFIRMATION` env var with a separate `POST /api/auth/confirm-email` endpoint that auto-confirms after client-side `signUp()`.

**Final fix (current):** Replaced the two-step client `signUp()` + server `confirm-email` flow with a single `POST /api/auth/register` server-side admin endpoint that uses `supabase.auth.admin.createUser()`. This creates the user pre-confirmed (dev) or unconfirmed (prod) in one step, bypassing GoTrue email validation entirely. After successful creation, the client explicitly signs in with `signInWithPassword()` to establish a proper session. The old `confirm-email.post.ts` endpoint is now unused (superseded by `register.post.ts`).

**Files added:** `server/api/auth/register.post.ts` (new admin registration endpoint)
**Files superseded:** `server/api/auth/confirm-email.post.ts` (still exists, no longer called)
**Files changed:** `nuxt.config.ts`, `.env.example`, `app/composables/useAuth.ts`

### 4. Authenticated Users Could Access Login/Register Pages

**Root cause:** No route guard prevented already-logged-in users from visiting `/login` or `/register`.

**Fix:** Created `guest` middleware (`app/middleware/guest.ts`) that redirects authenticated users to `/home`. Applied to both `login.vue` and `register.vue` via `definePageMeta({ middleware: 'guest' })`.

**Files added:** `app/middleware/guest.ts`
**Files changed:** `app/pages/login.vue`, `app/pages/register.vue`

### 5. Registration Left Previous User Logged In

**Root cause:** When a user was already logged in and navigated to `/register`, the new `signUp()` didn't clear the existing session. The new user was created but the old session persisted.

**Fix:** Added `await supabase.auth.signOut()` and `profile.value = null` before registration. After admin API creates the user, an explicit `signInWithPassword()` establishes the new user's session, followed by `navigateTo('/home', { external: true })` for a full page reload.

**Files changed:** `app/composables/useAuth.ts`

---

## Schema Change: display_name → first_name + last_name

Replaced `display_name` (single text field) with `first_name` and `last_name` on `user_profiles`.

### Database
- Dropped `display_name` column
- Added `first_name TEXT NOT NULL DEFAULT ''` and `last_name TEXT NOT NULL DEFAULT ''`
- Migrated existing data (kyrie: "Kyrie Irving" → first_name: "Kyrie", last_name: "Irving")
- Updated `handle_new_user()` trigger to use new columns
- Ran `NOTIFY pgrst, 'reload schema'` to refresh PostgREST cache

### Code Changes (8 files)
- `app/types/user.ts` — `UserProfile` and `RegisterData` interfaces
- `app/types/database.types.ts` — Database type definitions
- `app/composables/useAuth.ts` — Profile mapping, signUp, and signIn
- `app/pages/register.vue` — Two side-by-side fields (First Name + Last Name) replace Display Name
- `app/pages/home.vue` — Header shows `firstName lastName`
- `app/pages/subscription/expired.vue` — Same
- `scripts/seed-demo-data.ts` — All test users updated
- `Playwright/test-utils/selectors.ts` — Test user constants

### Documentation Updated
- `docs/PRD - Nuxt Supabase Migration.md` — Schema, auth examples, test user
- `NUXT_TimeReward/docs/Manual Testing Plan.md` — Section 3.2 updated

---

## Database State

### Users
| Username | First Name | Last Name | Email | Status | Email Confirmed |
|----------|-----------|-----------|-------|--------|-----------------|
| kyrie | Kyrie | Irving | kyrie@timereward.local | active | Yes |
| bluto | Bluto | Barnes | (disposable email) | trial | Yes (manually) |

### Stale Data
- ~~One orphaned auth.users record from Feb 26~~ — **CLEANED UP**: Deleted 4 stale test registrations (tom, madonna, groucho, mensa). Only kyrie and bluto remain.

---

## Known Issues (Not Yet Fixed)

### 1. No visual indicator for non-recurring activities on activity cards
The PRD does not specify a visual indicator on activity cards for recurring vs non-recurring. The `auto_repeat` property is only visible in the edit dialog. Breaks and Rewards cards DO have a recurring indicator (🔄 icon) per PRD Sections 10.5.2 and 11.4.3, but no equivalent is specified for activity cards. Decision needed: add a spec for this or accept current behavior.

### 2. Activity start buttons don't work after demo data reset (without page reload)
Clicking the play button after "Reset Demo Data" did nothing. Page reload fixed it. Likely cause: client-side state held stale activity/timer UUIDs from before the reset. Non-blocking — workaround is to reload after reset. See 2026-02-28 session notes.

---

## Decisions Made

1. **Display name replaced with first_name + last_name** — better for a productivity app; registration now has two required fields
2. **Visual pass deferred** — agreed to do MudBlazor-style visual pass AFTER manual testing plan, BEFORE remaining migration work
3. **No Taskmaster** — using AI's own planning approach, not Taskmaster

---

## Open Items / TODO

1. ~~**Email confirmation for development**~~ — **RESOLVED** (see Bug #3 above)
2. ~~**Clean up stale auth users**~~ — **DONE**: Deleted 4 stale test registrations (tom, madonna, groucho, mensa) from auth.users. Only kyrie and bluto remain.
3. ~~**Delete `server/api/auth/confirm-email.post.ts`**~~ — **DONE**: File deleted, superseded by `register.post.ts`
4. **Continue Manual Testing Plan** — resume at Section 5.2 (Create Activity), then Sections 6-20
6. **Sequencing agreed**: Manual Testing Plan → fix bugs → visual pass (MudBlazor approximation) → remaining migration work (Phases 5-7)

---

## Key Files Changed This Session

- `app/composables/useAuth.ts` — Major changes (useState, getSession fallback, trigger-based signup, admin API registration, explicit signIn after register)
- `app/types/user.ts` — firstName/lastName
- `app/types/database.types.ts` — firstName/lastName
- `app/pages/register.vue` — New form fields, guest middleware
- `app/pages/login.vue` — Guest middleware added
- `app/pages/home.vue` — Name display
- `app/pages/subscription/expired.vue` — Name display
- `scripts/seed-demo-data.ts` — Test user data
- `Playwright/test-utils/selectors.ts` — Test user constants
- `nuxt.config.ts` — Added `skipEmailConfirmation` to runtimeConfig
- `.env.example` — Added `NUXT_SKIP_EMAIL_CONFIRMATION`
- `server/api/auth/register.post.ts` — **NEW** server-side admin registration endpoint
- `server/api/auth/confirm-email.post.ts` — **SUPERSEDED** by register.post.ts (can be deleted)
- `app/middleware/guest.ts` — **NEW** redirects authenticated users away from auth pages
- `docs/PRD - Nuxt Supabase Migration.md` — Schema updates, Section 22.2.2 updated
- `NUXT_TimeReward/docs/Manual Testing Plan.md` — Sections 1-3.2 checked off, added Section 3.4

**Git:** 3 commits on `develop` (2 ahead of origin, not pushed):
- `8680d35` — first_name/last_name, email confirmation bypass, auth bugs
- `11cc7f6` — server-side admin registration, guest middleware, auth hardening
- `9741217` — delete superseded confirm-email endpoint, clean up stale test users

---

## Important Context for Next Session

- Both MCP servers (mcp-time-reward-test, playwright) should be working
- Dev server runs on `http://localhost:3000` via `cd NUXT_TimeReward && npm run dev`
- Test user: kyrie / @Password1
- Second test user: bluto / (password set during this session's registration test)
- The `on_auth_user_created` trigger now handles profile+settings creation on signup
- `useAuth()` uses `useState('auth-profile')` for shared profile state and falls back to `getSession()` for reliable user ID
- Registration now uses `POST /api/auth/register` (admin API) instead of client-side `signUp()` — bypasses GoTrue email validation issues
- `NUXT_SKIP_EMAIL_CONFIRMATION="true"` in `.env` — controls whether admin API creates users pre-confirmed (dev) or unconfirmed (prod)
- Guest middleware on `/login` and `/register` redirects authenticated users to `/home`
- `confirm-email.post.ts` has been deleted (superseded by `register.post.ts`)
- **Uncommitted changes**: Manual Testing Plan updates (Sections 3.3-5.1 checked off), session notes updates
- **Never delete package-lock.json** — use `npm ci` (lesson from Feb 26 session)
- **Supabase project was paused** — resumed from dashboard, working now
- Activity start button issue after demo data reset — resolved by page reload (stale client UUIDs)
- **NEXT ACTION**: Continue Manual Testing Plan from Section 5.2 (Create Activity)
