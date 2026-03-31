There is not a documented, “official” fix for this exact multi‑tab + real WiFi drop + Supabase JS v2 + `isSingleton: true` hang, but it does line up with known issues around the client’s shared state becoming corrupted in multi‑tab or backgrounded tabs, where subsequent Supabase calls never resolve and no network request is fired. [github](https://github.com/orgs/supabase/discussions/35069)

## What’s likely going on

Supabase’s JS client internally shares state between auth, Realtime, and HTTP calls (PostgREST/functions) in a single monolithic client instance. When a tab is backgrounded or the network drops, this shared state can deadlock: the WebSocket may reconnect, but the promise queue / auth lock used for HTTP calls never unwinds, so `from().select()`, `auth.refreshSession()`, etc. all return promises that never settle and never even start a real HTTP request. [github](https://github.com/supabase/supabase/issues/36046)

Because you’re using `createBrowserClient` with `isSingleton: true`, all tabs in that browser context share the same GoTrue/auth and internal queues. In a multi‑tab + network‑interrupt scenario, one tab can end up owning a lock or internal state in a way that leaves the other tab permanently stuck until a full reload reconstructs the client. [github](https://github.com/supabase/supabase-js/issues/1394)

## Practical workarounds you can try today

None of these is perfect, but in practice they’re the only reliable ways people have found to avoid or escape the “hung client” state without a browser reload. [github](https://github.com/nuxt-modules/supabase/issues/220)

1. Avoid a cross‑tab singleton client  
   - Disable the shared singleton and give each tab its own Supabase client instance: set `isSingleton: false` when calling `createBrowserClient` (or equivalent in your Nuxt module setup). [github](https://github.com/supabase/supabase-js/issues/1394)
   - This prevents one tab’s background/network behavior from corrupting the shared internal state for the other tab. You’ll still share auth state via `localStorage`/`broadcastChannel`, but each tab has an independent HTTP / Realtime stack. [github](https://github.com/supabase/supabase-js/issues/1394)

2. Force a “client reboot” in the broken tab instead of full page reload  
   If a tab enters the “all HTTP calls hang” state, you can:  
   - Detect it with a short timeout wrapper around a trivial query, for example `select('id').limit(1)` with a 5–10s timeout via `Promise.race`.  
   - On timeout, **destroy and recreate the Supabase client in that tab** instead of reusing the old instance. Concretely:  
     - Keep the URL/key in config, and when the “health check” times out, drop the old reference and call `createBrowserClient(...)` again in that tab.  
     - Because `isSingleton: true` ties all tabs together, this reset is safer if you first switch to `isSingleton: false` so one tab can replace its own client without interfering with others. [github](https://github.com/supabase/supabase/issues/36046)
   This is effectively doing in‑tab what a page reload would have done, but under your control.

3. Add a dedicated “health check + recovery” loop  
   Based on Supabase’s own guidance for “API call not returning” and hanging calls, a pattern they recommend is to treat these as corruption and recreate the client. A simple loop: [supabase](https://supabase.com/docs/guides/troubleshooting/why-is-my-supabase-api-call-not-returning-PGzXw0)
   - Every N seconds, in each tab that is visible, run a lightweight Supabase call wrapped in a timeout.  
   - If it times out, mark the client as unhealthy, tear it down (clear your client singleton/service) and re‑instantiate a fresh client instance.  
   - Optionally re‑authenticate by re‑using the stored session token if available, or by calling `auth.getSession()` on the new instance once it’s up.

4. Avoid long‑running / background‑dependent patterns that are known to trigger deadlocks  
   Supabase has acknowledged that backgrounding / tab suspension and recoveries can corrupt the client’s internal state, especially around Realtime and functions. To minimize risk: [github](https://github.com/supabase/realtime-js/issues/121)
   - Do not rely on continuous Realtime + auto token refresh in background tabs; consider pausing Realtime when the tab is hidden and resubscribing on focus using `visibilitychange` events. [github](https://github.com/supabase/realtime-js/issues/121)
   - Avoid calling `auth.refreshSession()` aggressively from multiple tabs; some users have observed multi‑tab auth refresh deadlocks, where `getSession` or refresh never resolves if multiple tabs race. [github](https://github.com/orgs/supabase/discussions/35069)
   - Prefer a single “leader” tab (e.g. using `BroadcastChannel`) that owns periodic refreshes and communicates the session to other tabs, or disable `multiTab` behavior if you don’t need cross‑tab auth sync. [stackoverflow](https://stackoverflow.com/questions/73040287/supabase-onauthstatechange-triggers-when-switching-tabs-in-react)

5. Check for Nuxt‑specific edge cases and keep modules updated  
   There are Nuxt‑Supabase reports where `useSupabaseClient()` calls simply stop returning and no network request is made after tab switches or over time; the only recovery was a page reload. [github](https://github.com/nuxt-modules/supabase/issues/273)
   - Make sure you’re on the latest `@nuxtjs/supabase` and `@supabase/supabase-js` versions; several hanging / multiple‑GoTrue‑instance issues have been fixed over time. [github](https://github.com/nuxt-modules/supabase/issues/220)
   - Validate that you’re not creating extra hidden clients (e.g. in plugins or composables run on every render) that might interact badly with `isSingleton: true` and multi‑tab auth locks. [github](https://github.com/nuxt-modules/supabase/issues/220)

## Concrete suggestion for your setup

Given your exact scenario (Nuxt, `createBrowserClient` via `@supabase/ssr`, `isSingleton: true`, multi‑tab, real WiFi drop):

1. Change your client factory to **`isSingleton: false`** so each tab has its own independent Supabase client. [github](https://github.com/supabase/supabase-js/issues/1394)
2. Add a small “health check” helper around your client that:  
   - Wraps a trivial query in a timeout.  
   - On timeout, replaces the current client instance with a brand‑new `createBrowserClient(...)` in that tab.  
3. Optionally, pause Realtime subscriptions when the tab is hidden and re‑initialize them on focus, so reconnect happens when the tab is foreground and less likely to hit background throttling edge cases. [github](https://github.com/supabase/realtime-js/issues/121)

This should let Tab B repair itself programmatically instead of requiring a full hard reload, while avoiding the cross‑tab shared state that appears to be getting corrupted for you.

Would you be open to sharing how you currently instantiate and expose the Supabase client in your Nuxt app (plugin/composable code), so I can sketch a concrete `isSingleton: false` + health‑check/recreate pattern that fits cleanly into that structure?