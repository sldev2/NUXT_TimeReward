import type { H3Event } from 'h3'

const DEFAULT_DEV_APP_URL = 'http://localhost:4000'

/**
 * Base URL for auth and payment redirects.
 * Prefers the incoming request origin so confirmation/checkout links match the
 * port the user is actually on (avoids stale NUXT_PUBLIC_APP_URL e.g. :3000 vs :4000).
 */
export function resolveAppBaseUrl(event: H3Event, configuredAppUrl?: string): string {
  const origin = getRequestURL(event).origin?.replace(/\/$/, '')
  if (origin?.startsWith('http')) {
    return origin
  }

  const configured = configuredAppUrl?.replace(/\/$/, '')
  if (configured) {
    return configured
  }

  return DEFAULT_DEV_APP_URL
}
