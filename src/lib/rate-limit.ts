import { logger } from '@/lib/logger'

type RateLimitProvider = 'upstash' | 'memory'

interface RateLimitStore {
  provider: RateLimitProvider
  increment(key: string, windowMs: number): Promise<number>
}

class InMemoryRateLimitStore implements RateLimitStore {
  provider: RateLimitProvider = 'memory'
  private rates = new Map<string, { count: number; resetTime: number }>()

  async increment(key: string, windowMs: number): Promise<number> {
    const now = Date.now()
    const current = this.rates.get(key)

    if (!current || now > current.resetTime) {
      this.rates.set(key, { count: 1, resetTime: now + windowMs })
      return 1
    }

    current.count += 1
    return current.count
  }
}

class UpstashRateLimitStore implements RateLimitStore {
  provider: RateLimitProvider = 'upstash'

  constructor(
    private readonly url: string,
    private readonly token: string
  ) {}

  async increment(key: string, windowMs: number): Promise<number> {
    const response = await fetch(`${this.url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', key],
        ['PEXPIRE', key, String(windowMs), 'NX'],
      ]),
    })

    if (!response.ok) {
      throw new Error(`Upstash rate limit request failed (${response.status})`)
    }

    const payload = (await response.json()) as Array<{ result?: unknown; error?: string }>
    const first = payload[0]
    if (!first || first.error) {
      throw new Error(first?.error || 'Unexpected Upstash response')
    }

    const count = Number(first.result)
    if (!Number.isFinite(count) || count < 0) {
      throw new Error('Invalid counter value from Upstash')
    }

    return count
  }
}

const memoryStore = new InMemoryRateLimitStore()
const prefix = process.env.RATE_LIMIT_KEY_PREFIX?.trim() || 'bonalyze:rl'

let store: RateLimitStore | null = null
let warnedAboutFallback = false

function resolveStore(): RateLimitStore {
  if (store) return store

  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL?.trim()
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim()

  if (upstashUrl && upstashToken) {
    store = new UpstashRateLimitStore(upstashUrl, upstashToken)
  } else {
    store = memoryStore
  }

  return store
}

function withPrefix(key: string): string {
  return `${prefix}:${key}`
}

/**
 * Distributed-first rate limiter.
 * Uses Upstash Redis when configured and falls back to in-memory if unavailable.
 */
export async function isRateLimited(key: string, limit: number, windowMs: number): Promise<boolean> {
  if (limit <= 0) return true
  if (windowMs <= 0) return false

  const namespacedKey = withPrefix(key)
  const primaryStore = resolveStore()

  try {
    const count = await primaryStore.increment(namespacedKey, windowMs)
    return count > limit
  } catch (error) {
    if (primaryStore.provider === 'upstash') {
      if (!warnedAboutFallback) {
        warnedAboutFallback = true
        logger.warn('[rate-limit] Upstash unavailable, falling back to memory', {
          error: error instanceof Error ? error.message : String(error),
        })
      }
      const count = await memoryStore.increment(namespacedKey, windowMs)
      return count > limit
    }
    throw error
  }
}
