import { logger } from '@/lib/logger'

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

type CacheProvider = 'upstash' | 'memory'

interface CacheStore {
  provider: CacheProvider
  getRaw(key: string): Promise<string | null>
  setRaw(key: string, value: string, ttlMs: number): Promise<void>
}

class InMemoryCacheStore implements CacheStore {
  provider: CacheProvider = 'memory'
  private cache = new Map<string, CacheEntry<unknown>>()
  private cleanupInterval: ReturnType<typeof setInterval> | null = null

  constructor() {
    if (typeof setInterval !== 'undefined') {
      this.startCleanup()
    }
  }

  async getRaw(key: string): Promise<string | null> {
    const entry = this.cache.get(key) as CacheEntry<string> | undefined
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }
    return entry.value
  }

  async setRaw(key: string, value: string, ttlMs: number): Promise<void> {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    })
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expiresAt) {
          this.cache.delete(key)
        }
      }
    }, 60 * 1000)

    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref()
    }
  }
}

class UpstashCacheStore implements CacheStore {
  provider: CacheProvider = 'upstash'

  constructor(
    private readonly url: string,
    private readonly token: string
  ) {}

  async getRaw(key: string): Promise<string | null> {
    const response = await fetch(`${this.url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['GET', key],
      ]),
    })
    if (!response.ok) {
      throw new Error(`Upstash cache GET failed (${response.status})`)
    }

    const payload = (await response.json()) as Array<{ result?: unknown; error?: string }>
    const first = payload[0]
    if (!first) {
      throw new Error('Empty Upstash GET response')
    }
    if (first.error) {
      throw new Error(first.error)
    }
    if (first.result === null || first.result === undefined) {
      return null
    }

    return String(first.result)
  }

  async setRaw(key: string, value: string, ttlMs: number): Promise<void> {
    const response = await fetch(`${this.url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['SET', key, value, 'PX', String(ttlMs)],
      ]),
    })

    if (!response.ok) {
      throw new Error(`Upstash cache SET failed (${response.status})`)
    }

    const payload = (await response.json()) as Array<{ result?: unknown; error?: string }>
    const first = payload[0]
    if (!first) {
      throw new Error('Empty Upstash SET response')
    }
    if (first.error) {
      throw new Error(first.error)
    }
  }
}

class ServerCache {
  private readonly DEFAULT_TTL_MS = 5 * 60 * 1000
  private readonly keyPrefix = process.env.CACHE_KEY_PREFIX?.trim() || 'bonalyze:cache'
  private readonly memoryStore = new InMemoryCacheStore()
  private store: CacheStore | null = null
  private warnedAboutFallback = false

  private resolveStore(): CacheStore {
    if (this.store) return this.store

    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL?.trim()
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim()

    if (upstashUrl && upstashToken) {
      this.store = new UpstashCacheStore(upstashUrl, upstashToken)
    } else {
      this.store = this.memoryStore
    }

    return this.store
  }

  private withPrefix(key: string): string {
    return `${this.keyPrefix}:${key}`
  }

  async get<T>(key: string): Promise<T | undefined> {
    const namespacedKey = this.withPrefix(key)
    const primaryStore = this.resolveStore()

    try {
      const raw = await primaryStore.getRaw(namespacedKey)
      if (!raw) return undefined
      return JSON.parse(raw) as T
    } catch (error) {
      if (primaryStore.provider === 'upstash') {
        if (!this.warnedAboutFallback) {
          this.warnedAboutFallback = true
          logger.warn('[cache] Upstash unavailable, falling back to memory', {
            error: error instanceof Error ? error.message : String(error),
          })
        }
        const raw = await this.memoryStore.getRaw(namespacedKey)
        return raw ? (JSON.parse(raw) as T) : undefined
      }
      return undefined
    }
  }

  async set<T>(key: string, value: T, ttlMs: number = this.DEFAULT_TTL_MS): Promise<void> {
    const namespacedKey = this.withPrefix(key)
    const serialized = JSON.stringify(value)
    const primaryStore = this.resolveStore()

    try {
      await primaryStore.setRaw(namespacedKey, serialized, ttlMs)
    } catch (error) {
      if (primaryStore.provider === 'upstash') {
        if (!this.warnedAboutFallback) {
          this.warnedAboutFallback = true
          logger.warn('[cache] Upstash unavailable, falling back to memory', {
            error: error instanceof Error ? error.message : String(error),
          })
        }
        await this.memoryStore.setRaw(namespacedKey, serialized, ttlMs)
        return
      }
      throw error
    }
  }
}

export const serverCache = new ServerCache()

export function createCacheKey(...parts: (string | number)[]): string {
  return parts.map(String).join(':')
}
