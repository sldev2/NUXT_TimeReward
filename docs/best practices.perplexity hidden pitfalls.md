Here's the full pitfall report for your system. It covers 11 distinct failure classes specifically for time-tracking reward apps in a Nuxt/Supabase/PWA context, each with a concrete fix.

The three root causes that explain nearly all of them:

1. **Rewards computed from mutable state** instead of an append-only event log — making double-grants both possible and hard to audit
2. **Client timestamps used in business logic** — `setInterval` drift, cross-device clock skew, and Supabase's own warning that device clocks can be off by minutes or hours are all downstream of this mistake
3. **Non-idempotent sync writes** — Background Sync retries and Supabase Realtime duplicate events are both benign *if* the server deduplicates on a client-supplied UUID; without that, they're both silent double-grant vectors

The most surprising ones to flag explicitly to your agent/Cursor session:
- **Safari ITP** () will silently delete all IndexedDB data after 7 days of inactivity — confirmed as real production data loss, not a theoretical risk [appmaster](https://appmaster.io/blog/offline-first-background-sync-conflict-retries-ux)
- **Supabase Realtime generating 3 events per insert** when subscriptions aren't cleaned up on Nuxt component unmount () — a very easy footgun in Nuxt's component model [learn.microsoft](https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/how-to/background-syncs)
- **Multi-tab on same device** behaves like two separate devices for both IndexedDB and Realtime () — usually skipped in PRD threat modeling [github](https://github.com/supabase/realtime/issues/236)