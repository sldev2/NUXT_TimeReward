/**
 * Disables Supabase's navigator.locks usage for multi-tab compatibility.
 *
 * The Supabase GoTrueClient uses navigator.locks.request() to coordinate
 * auth token refresh across same-origin tabs. When two tabs are open,
 * lock contention causes persistent AbortErrors that cascade into
 * failed fetches, infinite retry loops, and broken state.
 *
 * This plugin monkey-patches navigator.locks.request to act as a no-op lock
 * (immediately invokes the callback without acquiring a real lock). The
 * trade-off is minimal: without locks, two tabs may independently refresh
 * the auth token simultaneously, but Supabase handles concurrent refreshes
 * gracefully (both get valid tokens).
 */

export default defineNuxtPlugin(() => {
  if (typeof navigator === 'undefined' || !navigator.locks) return

  const originalRequest = navigator.locks.request.bind(navigator.locks)

  navigator.locks.request = async function patchedLockRequest(
    nameOrOptions: string | LockOptions,
    optionsOrCallback?: LockOptions | LockGrantedCallback,
    maybeCallback?: LockGrantedCallback
  ): Promise<any> {
    // Parse the overloaded signature
    let callback: LockGrantedCallback
    if (typeof optionsOrCallback === 'function') {
      callback = optionsOrCallback
    } else if (typeof maybeCallback === 'function') {
      callback = maybeCallback
    } else {
      // Query mode (navigator.locks.request(name, { mode: 'query' })) — pass through
      return originalRequest(nameOrOptions as string, optionsOrCallback as any, maybeCallback as any)
    }

    // Skip the lock and invoke the callback directly
    return await callback({ name: typeof nameOrOptions === 'string' ? nameOrOptions : '', mode: 'exclusive', released: Promise.resolve(undefined) } as Lock)
  } as typeof navigator.locks.request
})
