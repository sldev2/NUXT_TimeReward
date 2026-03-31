/**
 * Drop-in replacement for useSupabaseClient() that returns a client
 * which auto-recovers from the hung-HTTP-layer state.
 *
 * Returns a Proxy that always delegates to the wrapper's current client.
 * When the wrapper resets the client (after a health-check failure),
 * existing references automatically use the new instance.
 *
 * Usage (synchronous, same as useSupabaseClient):
 *   const supabase = useHealthySupabaseClient()
 *
 * The health check + reset is triggered by useConnectionStatus on
 * reconnection (offline->online), NOT on every call or tab switch.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { WrappedSupabaseClient } from '~/plugins/supabase-wrapper.client'

export function useHealthySupabaseClient(): SupabaseClient {
  if (import.meta.server) {
    return useSupabaseClient()
  }

  const nuxtApp = useNuxtApp()
  const wrapper = (nuxtApp as any).$supabaseHealthy as WrappedSupabaseClient | undefined

  if (!wrapper) {
    return useSupabaseClient()
  }

  return new Proxy({} as SupabaseClient, {
    get(_target, prop, receiver) {
      const client = wrapper.getClient()
      const value = (client as any)[prop]
      if (typeof value === 'function') {
        return value.bind(client)
      }
      return value
    }
  })
}
