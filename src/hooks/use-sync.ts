'use client'

import { useEffect } from 'react'
import { processQueue } from '@/lib/sync-queue'
import { useOffline } from '@/hooks/use-offline'

export function useSync() {
  const isOffline = useOffline()

  useEffect(() => {
    if (!isOffline) {
      // Try to process queue when coming online
      void processQueue()
    }
  }, [isOffline])

  useEffect(() => {
    // Also try on mount
    void processQueue()

    const interval = setInterval(() => {
      void processQueue()
    }, 60 * 1000) // Periodic retry every minute

    return () => clearInterval(interval)
  }, [])
}
