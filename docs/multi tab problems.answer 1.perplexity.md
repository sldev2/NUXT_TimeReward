# How the Supabase client is instantiated in our Nuxt app

## Client creation

The client is created by the `@nuxtjs/supabase` module's built-in plugin at `node_modules/@nuxtjs/supabase/dist/runtime/plugins/supabase.client.js`. The key code:

```javascript
// From the module's plugin (we don't control this directly)
const { url, key, cookieOptions, cookiePrefix, useSsrCookies, clientOptions } = useRuntimeConfig().public.supabase;

client = createBrowserClient(url, key, {
  ...clientOptions,           // <-- passed from nuxt.config.ts supabase.clientOptions
  cookieOptions: { ...cookieOptions, name: cookiePrefix },
  isSingleton: true,          // <-- hardcoded by the module
  global: {
    fetch: fetchWithRetry,
    ...clientOptions.global
  }
});

provide("supabase", { client });
```

Our `nuxt.config.ts` passes empty `clientOptions`:

```typescript
supabase: {
  redirectOptions: {
    login: '/login',
    callback: '/confirm',
    include: undefined,
    exclude: ['/', '/register'],
    cookieRedirect: false,
  }
},
```

The client is then consumed everywhere via `useSupabaseClient()` (auto-imported composable from the module).

**The critical point**: `isSingleton: true` is **hardcoded inside the module's plugin**, not in our config. We can't change it via `clientOptions`. To set `isSingleton: false`, we'd need to either override the plugin or create our own client.

## Versions

- **Nuxt**: `^3.20.2` (runtime shows 3.21.0 in the dev server banner)
- **@nuxtjs/supabase**: `^2.0.3`

The Supabase JS and SSR versions are transitive dependencies from `@nuxtjs/supabase`. The module hardcodes `isSingleton: true` in its plugin, so the recommended fix of setting `isSingleton: false` would require either overriding the module's plugin or creating our own Supabase client plugin to replace it.
