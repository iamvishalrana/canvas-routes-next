import { kv } from '@vercel/kv'

const localCache = new Map()
const WINDOW_SEC = 60
const WINDOW_MS = WINDOW_SEC * 1000
const MAX_REQUESTS = 3

export async function checkRateLimit(ip) {
  const key = `rl:${ip}`

  if (process.env.KV_REST_API_URL) {
    try {
      const count = await kv.incr(key)
      if (count === 1) await kv.expire(key, WINDOW_SEC)
      return count > MAX_REQUESTS
    } catch (err) {
      console.error('KV rate limit unavailable, using in-memory fallback:', err.message)
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
