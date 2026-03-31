/**
 * Nitro server middleware: stale Supabase auth cookie guard.
 *
 * Runs before the @nuxtjs/supabase module's SSR auth handler. If the
 * session cookie contains an expired access token, the cookies are stripped
 * from the request so the Supabase module treats it as unauthenticated
 * rather than attempting a token refresh that can crash with
 * "signal is aborted without reason" (AbortError).
 *
 * The client-side Supabase SDK can still attempt its own token refresh
 * after hydration — if it succeeds the user stays logged in; if not,
 * the auth middleware redirects to /login.
 */

import { getRequestURL, getRequestHeader } from 'h3'
import type { H3Event } from 'h3'

export default defineEventHandler((event: H3Event) => {
  const path = getRequestURL(event).pathname
  if (path.startsWith('/api/') ||
      path.startsWith('/_nuxt/') ||
      path.startsWith('/__nuxt')) {
    return
  }

  const cookieHeader = getRequestHeader(event, 'cookie')
  if (!cookieHeader?.includes('auth-token')) return

  try {
    const sessionJson = extractSupabaseSession(cookieHeader)
    if (!sessionJson) return

    const session = JSON.parse(sessionJson)
    const expiresAt = session.expires_at
    if (!expiresAt) return

    const now = Math.floor(Date.now() / 1000)
    if (expiresAt >= now) return

    stripAuthCookies(event, cookieHeader)
    const hoursAgo = Math.round((now - expiresAt) / 3600)
    console.log(`[auth-guard] Stripped expired auth cookies (expired ${hoursAgo}h ago)`)
  } catch {
    // Can't parse the session — leave cookies alone. Stripping here would
    // break fresh logins (e.g. new cookie formats). The Supabase module
    // or client-side recovery plugin will handle invalid sessions.
  }
})

/** Reassemble the session JSON from one or more sb-*-auth-token cookies. */
function extractSupabaseSession(cookieHeader: string): string | null {
  const cookies: Record<string, string> = {}
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    cookies[part.slice(0, eq).trim()] = part.slice(eq + 1).trim()
  }

  let raw: string | null = null

  // Single cookie: sb-{ref}-auth-token
  const singleKey = Object.keys(cookies).find(k => /^sb-.+-auth-token$/.test(k))
  if (singleKey && cookies[singleKey]) {
    raw = decodeURIComponent(cookies[singleKey])
  }

  // Chunked cookies: sb-{ref}-auth-token.0, .1, .2 …
  if (!raw) {
    const chunkKey = Object.keys(cookies).find(k => /^sb-.+-auth-token\.0$/.test(k))
    if (chunkKey) {
      const base = chunkKey.replace(/\.0$/, '')
      let assembled = ''
      for (let i = 0; ; i++) {
        const chunk = cookies[`${base}.${i}`]
        if (chunk === undefined) break
        assembled += chunk
      }
      if (assembled) raw = decodeURIComponent(assembled)
    }
  }

  if (!raw) return null

  // Newer Supabase versions use base64-encoded cookies (prefixed with "base64-")
  if (raw.startsWith('base64-')) {
    raw = Buffer.from(raw.slice(7), 'base64').toString('utf-8')
  }

  return raw
}

/** Remove all sb-*-auth-token* cookies from the raw request header. */
function stripAuthCookies(event: H3Event, cookieHeader: string) {
  const cleaned = cookieHeader
    .split(';')
    .filter(c => !/sb-.+-auth-token/.test(c.trim()))
    .join(';')
    .trim()

  event.node.req.headers.cookie = cleaned || ''
}
