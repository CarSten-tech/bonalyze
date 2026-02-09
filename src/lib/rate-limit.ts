/**
 * Simple in-memory rate limiter for server actions.
 * For true enterprise scale, use Redis (e.g. Upstash).
 */

const rates = new Map<string, { count: number; resetTime: number }>()

export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const current = rates.get(key)

  if (!current || now > current.resetTime) {
    rates.set(key, { count: 1, resetTime: now + windowMs })
    return false
  }

  current.count++
  if (current.count > limit) {
    return true
  }

  return false
}
