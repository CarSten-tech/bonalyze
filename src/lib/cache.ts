/**
 * Simple in-memory cache with TTL support for server-side caching.
 * Enterprise-grade cache with automatic cleanup and type safety.
 */

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

class ServerCache {
  private cache = new Map<string, CacheEntry<unknown>>()
  private cleanupInterval: ReturnType<typeof setInterval> | null = null
  private readonly DEFAULT_TTL_MS = 5 * 60 * 1000 // 5 minutes

  constructor() {
    // Start cleanup interval in non-edge environments
    if (typeof setInterval !== 'undefined') {
      this.startCleanup()
    }
  }

  /**
   * Get a cached value by key.
   * Returns undefined if not found or expired.
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined
    
    if (!entry) return undefined
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return undefined
    }
    
    return entry.value
  }

  /**
   * Set a cached value with optional TTL.
   */
  set<T>(key: string, value: T, ttlMs: number = this.DEFAULT_TTL_MS): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    })
  }

  /**
   * Check if a key exists and is not expired.
   */
  has(key: string): boolean {
    return this.get(key) !== undefined
  }

  /**
   * Delete a specific key.
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Clear all cached entries.
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics.
   */
  stats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    }
  }

  private startCleanup(): void {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expiresAt) {
          this.cache.delete(key)
        }
      }
    }, 60 * 1000)

    // Don't prevent process exit
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref()
    }
  }
}

// Singleton instance for server-side caching
export const serverCache = new ServerCache()

// Helper for creating cache keys
export function createCacheKey(...parts: (string | number)[]): string {
  return parts.map(String).join(':')
}
