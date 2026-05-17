import { Redis } from '@upstash/redis'

const localCache = new Map()
const WINDOW_SEC = 60
const WINDOW_MS = WINDOW_SEC * 1000
const MAX_REQUESTS = 50

function getRedis() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null
  return new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
}

export async function checkRateLimit(ip) {
  const key = `rl:${ip}`
  const redis = getRedis()

  if (redis) {
    try {
      const count = await redis.incr(key)
      if (count === 1) await redis.expire(key, WINDOW_SEC)
      return count > MAX_REQUESTS
    } catch (err) {
      console.error('Redis rate limit unavailable, using in-memory fallback:', err.message)
    }
  }

  // In-memory fallback (per serverless instance — not globally shared)
  const now = Date.now()
  if (localCache.size > 500) {
    for (const [k, v] of localCache) {
      if (now > v.resetAt) localCache.delete(k)
    }
  }
  const entry = localCache.get(ip)
  if (!entry || now > entry.resetAt) {
    localCache.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  if (entry.count >= MAX_REQUESTS) return true
  entry.count++
  return false
}
