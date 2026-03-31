/**
 * Resettable Supabase client wrapper.
 *
 * The @nuxtjs/supabase module creates a singleton client shared across tabs
 * via createBrowserClient({ isSingleton: true }). After WiFi disconnect/reconnect,
 * this shared client's HTTP layer can become permanently hung in background tabs.
 *
 * This plugin wraps the module's client in a facade that can detect the hung state
 * (via a health check) and replace the client with a fresh createClient() instance,
 * seeded with the existing auth session from localStorage.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export interface WrappedSupabaseClient {
  getClient: () => SupabaseClient
  healthCheck: (timeoutMs?: number) => Promise<boolean>
  resetFromSession: () => Promise<void>
}

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()

  const base = (nuxtApp as any).$supabase?.client as SupabaseClient | undefined
  if (!base) return

  let current: SupabaseClient = base

  async function seedClientFromLocalStorage(client: SupabaseClient): Promise<void> {
    try {
      const storageKeys = Object.keys(window.localStorage)
      const authKey = storageKeys.find((k) => /sb-.+-auth-token$/.test(k))
      if (!authKey) return

      const raw = window.localStorage.getItem(authKey)
      if (!raw) return

      let jsonStr = raw
      if (jsonStr.startsWith('base64-')) {
        jsonStr = atob(jsonStr.slice(7))
      }

      const parsed = JSON.parse(jsonStr)
      const accessToken = parsed?.access_token
      const refreshToken = parsed?.refresh_token
      if (!accessToken || !refreshToken) return

      await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
    } catch {
      // Seed failure is non-fatal; the user may need to re-authenticate
    }
  }

  async function makeClientFromSession(): Promise<void> {
    const url = (config.public as any).supabase.url as string
    const key = (config.public as any).supabase.key as string

    const fresh = createClient(url, key, {
      global: { fetch: window.fetch.bind(window) },
      auth: { persistSession: true, autoRefreshToken: true }
    })

    await seedClientFromLocalStorage(fresh)
    current = fresh
    console.log('[SupabaseWrapper] Client reset — fresh instance created (session seeded)')
  }

  async function healthCheck(timeoutMs = 8000): Promise<boolean> {
    try {
      const result = await Promise.race([
        current.from('user_profiles').select('id').limit(1),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('health-check-timeout')), timeoutMs)
        )
      ])
      return true
    } catch {
      return false
    }
  }

  const wrapped: WrappedSupabaseClient = {
    getClient: () => current,
    healthCheck,
    resetFromSession: makeClientFromSession,
  }

  nuxtApp.provide('supabaseHealthy', wrapped)
})
