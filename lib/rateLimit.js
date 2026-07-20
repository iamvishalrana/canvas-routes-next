import { Redis } from '@upstash/redis'

// Cloudflare now proxies all production traffic (added 2026-07-20), so a
// client can send its own `x-forwarded-for` header and have Cloudflare merely
// append the real IP after it — code that blindly takes the first entry can
// be handed a spoofed address, silently defeating rate limits. `cf-connecting-ip`
// is set by Cloudflare itself from the actual TCP connection and can't be
// forged by the client, so it's checked first. Falls back to the old
// x-forwarded-for/x-real-ip logic for local dev and any request that reaches
// Vercel directly (Cloudflare bypassed or proxying later turned off).
export function getClientIp(request) {
  return request.headers.get('cf-connecting-ip')?.trim()
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || 'unknown'
}

const localCache = new Map()
const WINDOW_SEC = 60
const WINDOW_MS = WINDOW_SEC * 1000
const MAX_REQUESTS = 50

function getRedis() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null
  return new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
}

// Returns true if lock acquired, false if already locked. Auto-expires after ttlSec.
export async function acquireLock(key, ttlSec = 10) {
  const redis = getRedis()
  if (!redis) return true // no Redis — optimistically allow (single-instance safe)
  try {
    const result = await redis.set(`lock:${key}`, '1', { nx: true, ex: ttlSec })
    return result === 'OK'
  } catch {
    return true // Redis unavailable — optimistically allow
  }
}

export async function releaseLock(key) {
  const redis = getRedis()
  if (!redis) return
  try { await redis.del(`lock:${key}`) } catch {}
}

export async function checkRateLimit(ip, maxRequests = MAX_REQUESTS, windowSec = WINDOW_SEC) {
  const windowMs = windowSec * 1000
  const key = `rl:${ip}`
  const redis = getRedis()

  if (redis) {
    try {
      const count = await redis.incr(key)
      if (count === 1) await redis.expire(key, windowSec)
      return count > maxRequests
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
    localCache.set(ip, { count: 1, resetAt: now + windowMs })
    return false
  }
  if (entry.count >= maxRequests) return true
  entry.count++
  return false
}
