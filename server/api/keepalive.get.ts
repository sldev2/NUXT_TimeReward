/**
 * GET /api/keepalive
 *
 * Public health ping for Vercel KV / Upstash Redis (e.g. UptimeRobot on free tier).
 * No authentication required. Uses KV_REST_API_URL and KV_REST_API_TOKEN.
 */
import { getUpstashRedis, isUpstashRedisConfigured } from '../utils/upstashRedis'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const url = config.kvRestApiUrl as string
  const token = config.kvRestApiToken as string

  if (!isUpstashRedisConfigured(url, token)) {
    throw createError({
      statusCode: 503,
      message: 'Redis is not configured (set KV_REST_API_URL and KV_REST_API_TOKEN)'
    })
  }

  try {
    const redis = getUpstashRedis(url, token)
    const pong = await redis.ping()

    return {
      ok: true,
      redis: pong
    }
  } catch (e) {
    console.error('[keepalive] Redis ping failed:', e)
    throw createError({
      statusCode: 503,
      message: 'Redis ping failed'
    })
  }
})
