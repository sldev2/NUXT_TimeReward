import { getRequestURL } from 'h3'
import type { H3Event } from 'h3'
import { isUnderConstruction, underConstructionHtml } from '../utils/underConstruction'

const ALLOWED_PATH_PREFIXES = [
  '/api/stripe/webhook',
  '/api/site-status',
]

export default defineEventHandler((event: H3Event) => {
  const config = useRuntimeConfig()
  if (!isUnderConstruction(config.underConstruction)) {
    return
  }

  const path = getRequestURL(event).pathname

  if (ALLOWED_PATH_PREFIXES.some(prefix => path === prefix || path.startsWith(`${prefix}/`))) {
    return
  }

  if (path.startsWith('/_nuxt/') || path.startsWith('/__nuxt')) {
    return
  }

  setResponseHeader(event, 'Content-Type', 'text/html; charset=utf-8')
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return underConstructionHtml()
})
