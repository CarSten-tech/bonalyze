'use client'

import { useEffect, useState } from 'react'
import {
  getQueueStatus,
  subscribeQueueStatus,
  type SyncQueueStatus,
} from '@/lib/sync-queue'

const EMPTY_STATUS: SyncQueueStatus = {
  pending: 0,
  retrying: 0,
  failed: 0,
  nextRetryAt: null,
}

export function useSyncStatus() {
  const [status, setStatus] = useState<SyncQueueStatus>(EMPTY_STATUS)

  useEffect(() => {
    let active = true

    const refresh = async () => {
      const next = await getQueueStatus()
      if (active) setStatus(next)
    }

    void refresh()
    const interval = window.setInterval(() => {
      void refresh()
    }, 5000)

    const unsubscribe = subscribeQueueStatus((next) => {
      if (active) setStatus(next)
    })

    return () => {
      active = false
      unsubscribe()
      window.clearInterval(interval)
    }
  }, [])

  return status
}

