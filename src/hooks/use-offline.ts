'use client'

import { useState, useEffect } from 'react'

export function useOffline() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    // Initial check
    setIsOffline(!navigator.onLine)

    function onOffline() {
      setIsOffline(true)
    }

    function onOnline() {
      setIsOffline(false)
    }

    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)

    return () => {
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
    }
  }, [])

  return isOffline
}
