# Session Notes - 2026-02-26

## Summary

This session focused on creating migration status documentation, a manual testing plan, and then debugging a critical startup failure in the NUXT app.

---

## Documents Created

1. **`docs/PRD - Nuxt Supabase Migration.Status Feb26.md`** — Comprehensive status assessment of the migration. Phases 1-4 complete, Phase 5 ~85%, Phase 6 ~60%, Phase 7 not started.
2. **`docs/GSD introduction advice.md`** — Strategic recommendation on whether to adopt get-shit-done (GSD) for completing the migration. Recommendation: debug/test first, consider GSD for future greenfield milestones. GSD is designed for Claude Code CLI, not Cursor IDE.
3. **`NUXT_TimeReward/docs/Manual Testing Plan.md`** — 20-section sequential testing checklist with (ai)/(human)/(both) prefixes covering all implemented features.

---

## Critical Bug: Supabase Auth Client Deadlock

### Symptom

The app was working ~2 days ago. Now:
- Login page displays, but login fails with "Invalid username or password"
- Console shows `AbortError: signal is aborted without reason` from `@supabase/supabase-js` during client initialization
- The Supabase auth client fails to initialize due to `navigator.locks` deadlock

### Root Cause (Partially Identified)

The `@supabase/supabase-js` auth client uses the Web Locks API (`navigator.locks`) for auth token management. This is deadlocking during initialization, preventing any auth operations from working.

- **Known upstream bug**: [supabase/supabase-js#2013](https://github.com/supabase/supabase-js/issues/2013) — opened Jan 10, 2026, still open
- The deadlock occurs in both SSR (Node.js) and browser environments
- Affects `signInWithPassword()`, `setSession()`, and other auth operations

### Contributing Factor

The user recently moved the Supabase project to a new organization. While the keys haven't changed (confirmed via dashboard), the org move may have affected auth configuration.

### Database Status

Database is fine — verified via mcp-time-reward-test:
- All 9 tables present with correct schema
- User "kyrie" exists in `auth.users` (last sign-in Feb 24)
- `user_profiles` has kyrie's record with `subscription_status: 'active'`
- All demo data present (4 activities, 5 rewards, 5 breaks, etc.)
- The `list_tables` tool showed 0 rows but that was stale `pg_stat` counts; actual queries return correct data

### What Was Tried

| Attempt | Result |
|---------|--------|
| Clear `.nuxt` cache and restart | Same AbortError |
| `ssr: false` in nuxt.config.ts | Login page loads, but auth still fails (lock timeout in browser) |
| Clean reinstall (delete node_modules, package-lock.json, npm install) | Pulled newer `@supabase/supabase-js@^2.95.3` with worse deadlock (NavigatorLockAcquireTimeoutError) |
| Pin `nuxt@3.20.2` + `ignore@5.3.2` override | SSR path.relative() error on virtual Vite modules |
| Pin `nuxt@3.20.2` + remove `ignore` override + `ssr: false` | Same path.relative() error, 404 on essential Vite modules |
| Unpin nuxt (`^3.20.2` → 3.21.1) + `ssr: false` + override `@supabase/supabase-js@2.91.1` | Login page loads but auth still fails — AbortError from even 2.91.1 |

### Current State of package.json

```json
{
  "dependencies": {
    "@nuxtjs/supabase": "2.0.3",
    "@nuxtjs/tailwindcss": "^6.14.0",
    "@pinia/nuxt": "^0.11.3",
    "@vueuse/nuxt": "^14.1.0",
    "nuxt": "^3.20.2",
    "pinia": "^3.0.4",
    "stripe": "^20.3.0",
    "vue": "latest"
  },
  "overrides": {
    "@supabase/supabase-js": "2.91.1"
  }
}
```

### Current State of nuxt.config.ts

- `ssr: false` is set (required to avoid SSR lock errors)

### What to Try Next

1. **Downgrade `@supabase/supabase-js` further** — try versions before the `navigator.locks` feature was introduced (possibly pre-2.39.x or pre-2.45.x). Need to find which version first introduced the lock mechanism.

2. **Create a Nuxt plugin to override the lock behavior** — intercept the Supabase client creation and provide a no-op lock function:
   ```typescript
   // plugins/supabase-fix.client.ts
   // Override the lock function to bypass navigator.locks deadlock
   ```

3. **Regenerate Supabase API keys** — the user mentioned this as an option. The org move might have invalidated something even though the keys look the same in the dashboard.

4. **Check `@supabase/ssr` package** — the `@nuxtjs/supabase` module uses `@supabase/ssr` internally. There might be a version of `@supabase/ssr` that handles the lock differently.

5. **Try `@nuxtjs/supabase@1.x`** — the v1 branch may use an older Supabase client that doesn't have the lock mechanism at all.

6. **Check if the Supabase project's auth settings changed** — in the Supabase dashboard, verify:
   - Site URL is set to `http://localhost:3000`
   - Redirect URLs include `http://localhost:3000/**`
   - JWT expiry settings are reasonable
   - No rate limiting is blocking the auth requests

### Key Files Changed This Session

- `nuxt.config.ts` — Added `ssr: false`
- `package.json` — Pinned `@nuxtjs/supabase@2.0.3`, added `@supabase/supabase-js@2.91.1` override, removed `ignore` override

### Important Context for Next Session

- The `navigator.locks` deadlock is the blocking issue. Everything else (database, schema, app code) is fine.
- The app was previously working with the OLD `package-lock.json` which locked all transitive dependencies. That lockfile is now deleted.
- The user moved the Supabase project to a new organization recently — this may be relevant.
- MCP servers are working: `mcp-time-reward-test` (database) and `playwright` (browser testing)

---

## Resolution (Later on 2026-02-26)

### What Fixed It

**Rolled back to the committed `package-lock.json` and reinstalled with `npm ci`.**

The root cause was that deleting `package-lock.json` and running `npm install` allowed npm to resolve newer transitive dependencies that introduced the `navigator.locks` deadlock. The committed lockfile at HEAD (`575be26`) had the exact working dependency tree.

Steps taken:
1. `git restore` on `package.json`, `package-lock.json`, and `nuxt.config.ts` (restoring the committed versions)
2. Deleted `node_modules/` and `.nuxt/` for a clean slate
3. Ran `npm ci` (installs exact versions from the lockfile, unlike `npm install`)
4. Cleaned up failed fix artifacts: `app.html`, empty `plugins/` directory

### Working Dependency Versions (Restored)

| Package | Version |
|---------|---------|
| `nuxt` | 3.21.0 |
| `vue` | 3.5.27 |
| `@nuxtjs/supabase` | 2.0.3 |
| `@supabase/supabase-js` | 2.91.1 |
| `@supabase/ssr` | 0.8.0 |
| `@supabase/auth-js` | 2.91.1 |

### Lesson Learned

**Never delete `package-lock.json` and run `npm install`.** Always use `npm ci` to install from the lockfile. If the lockfile is lost, restore it from git. The lockfile is the source of truth for reproducible builds.

The `@supabase/supabase-js` ecosystem has a known bug ([supabase/supabase-js#2013](https://github.com/supabase/supabase-js/issues/2013)) where newer versions deadlock via `navigator.locks`. Until this is fixed upstream, the dependency versions must be frozen via the lockfile.

### Changes NOT Kept

- `ssr: false` in `nuxt.config.ts` — not needed with the correct dependency versions
- `overrides: { "@supabase/supabase-js": "2.91.1" }` — not needed; the lockfile pins the version
- Pinned `@nuxtjs/supabase` (removed caret) — not needed; the lockfile controls resolution

---

## Next Step

**Work through `NUXT_TimeReward/docs/Manual Testing Plan.md`** — the app is now running and login works. The manual testing plan is a 20-section sequential checklist covering all implemented features (auth, activities, timers, AutoPause, breaks, rewards, settings, multi-browser sync, subscription, edge cases). Each item is prefixed with `(ai)`, `(human)`, or `(both)` to indicate who performs it.
