import { Redis } from '@upstash/redis'

let client: Redis | null = null

export function isUpstashRedisConfigured(url: string | undefined, token: string | undefined): boolean {
  return Boolean(url?.trim() && token?.trim())
}

export function getUpstashRedis(url: string, token: string): Redis {
  if (!client) {
    client = new Redis({ url, token })
  }
  return client
}
