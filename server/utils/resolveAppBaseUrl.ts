import type { H3Event } from 'h3'

const DEFAULT_DEV_APP_URL = 'http://localhost:4000'

const ALLOWED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  'test.myfocusrewards.com',
  'myfocusrewards.com',
  'www.myfocusrewards.com',
])

function normalizeOrigin(value?: string | null): string | null {
  if (!value) return null
  try {
    const url = new URL(value.replace(/\/$/, ''))
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return `${url.protocol}//${url.host}`
  } catch {
    return null
  }
}

function isAllowedHost(hostname: string): boolean {
  return ALLOWED_HOSTS.has(hostname.toLowerCase())
}

function originFromHost(host: string, protocol = 'https'): string | null {
  const normalizedHost = host.split(',')[0]?.trim()
  if (!normalizedHost) return null

  try {
    const url = new URL(`${protocol}://${normalizedHost}`)
    if (!isAllowedHost(url.hostname)) return null
    return `${url.protocol}//${url.host}`
  } catch {
    return null
  }
}

function isLocalhostOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin)
    return hostname === 'localhost' || hostname === '127.0.0.1'
  } catch {
    return false
  }
}

/**
 * Base URL for auth and payment redirects.
 *
 * Resolution order:
 * 1. Client-provided origin (register/checkout from browser) when allowlisted
 * 2. Proxy headers (`x-forwarded-host` / `x-forwarded-proto`) on Vercel etc.
 * 3. Request URL with forwarded headers enabled
 * 4. `NUXT_PUBLIC_APP_URL` — especially when server-side origin is localhost on a deployed env
 * 5. Local dev default (`http://localhost:4000`)
 */
export function resolveAppBaseUrl(
  event: H3Event,
  configuredAppUrl?: string,
  clientOrigin?: string,
): string {
  const configured = normalizeOrigin(configuredAppUrl)

  const client = normalizeOrigin(clientOrigin)
  if (client && isAllowedHost(new URL(client).hostname)) {
    return client
  }

  const forwardedHost = getRequestHeader(event, 'x-forwarded-host')
  const forwardedProto = getRequestHeader(event, 'x-forwarded-proto')?.split(',')[0]?.trim() || 'https'
  const forwardedOrigin = forwardedHost ? originFromHost(forwardedHost, forwardedProto) : null
  if (forwardedOrigin) {
    return forwardedOrigin
  }

  const requestOrigin = normalizeOrigin(
    getRequestURL(event, { xForwardedHost: true, xForwardedProto: true }).origin,
  )

  if (requestOrigin && !isLocalhostOrigin(requestOrigin)) {
    return requestOrigin
  }

  if (configured && (!requestOrigin || !isLocalhostOrigin(configured))) {
    return configured
  }

  if (requestOrigin) {
    return requestOrigin
  }

  return configured ?? DEFAULT_DEV_APP_URL
}
