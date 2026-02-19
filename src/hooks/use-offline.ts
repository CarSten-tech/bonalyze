'use client'

import { useState, useEffect } from 'react'

const HEALTH_ENDPOINT = '/api/health'
const FAILURE_THRESHOLD = 3
const CHECK_INTERVAL_MS = 5000
const REQUEST_TIMEOUT_MS = 3000

export function useOffline() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    let isActive = true
    let consecutiveFailures = 0

    const markFailure = () => {
      consecutiveFailures += 1
      if (consecutiveFailures >= FAILURE_THRESHOLD && isActive) {
        setIsOffline(true)
      }
    }

    const markSuccess = () => {
      consecutiveFailures = 0
      if (isActive) {
        setIsOffline(false)
      }
    }

    const checkConnectivity = async () => {
      // Browser signal is a hint, but not reliable enough alone.
      if (!navigator.onLine) {
        markFailure()
        return
      }

      const controller = new AbortController()
      const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

      try {
        const response = await fetch(`${HEALTH_ENDPOINT}?t=${Date.now()}`, {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
          headers: {
            'x-connectivity-check': '1',
          },
        })

        if (response.ok) {
          markSuccess()
        } else {
          markFailure()
        }
      } catch {
        markFailure()
      } finally {
        window.clearTimeout(timeoutId)
      }
    }

    const handleNetworkChange = () => {
      void checkConnectivity()
    }

    void checkConnectivity()
    const intervalId = window.setInterval(() => {
      void checkConnectivity()
    }, CHECK_INTERVAL_MS)

    window.addEventListener('offline', handleNetworkChange)
    window.addEventListener('online', handleNetworkChange)

    return () => {
      isActive = false
      window.clearInterval(intervalId)
      window.removeEventListener('offline', handleNetworkChange)
      window.removeEventListener('online', handleNetworkChange)
    }
  }, [])

  return isOffline
}
