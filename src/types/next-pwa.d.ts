declare module 'next-pwa' {
  import type { NextConfig } from 'next'

  interface RuntimeCachingEntry {
    urlPattern: RegExp | string
    handler: 'CacheFirst' | 'CacheOnly' | 'NetworkFirst' | 'NetworkOnly' | 'StaleWhileRevalidate'
    options?: {
      cacheName?: string
      expiration?: {
        maxEntries?: number
        maxAgeSeconds?: number
      }
      networkTimeoutSeconds?: number
      cacheableResponse?: {
        statuses?: number[]
        headers?: Record<string, string>
      }
    }
  }

  interface PWAConfig {
    dest?: string
    register?: boolean
    skipWaiting?: boolean
    disable?: boolean
    scope?: string
    sw?: string
    runtimeCaching?: RuntimeCachingEntry[]
    publicExcludes?: string[]
    buildExcludes?: (string | RegExp)[]
    fallbacks?: {
      document?: string
      image?: string
      audio?: string
      video?: string
      font?: string
    }
  }

  function withPWA(config: PWAConfig): (nextConfig: NextConfig) => NextConfig

  export default withPWA
}
