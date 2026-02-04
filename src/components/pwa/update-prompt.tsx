'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw, X } from 'lucide-react'

export function UpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)

  const handleUpdate = useCallback(() => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' })
    }
    window.location.reload()
  }, [waitingWorker])

  useEffect(() => {
    // Only run in production and if service worker is supported
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      process.env.NODE_ENV === 'development'
    ) {
      return
    }

    const handleControllerChange = () => {
      window.location.reload()
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

    // Check for updates
    const checkForUpdates = async () => {
      try {
        const registration = await navigator.serviceWorker.ready

        // Check if there's a waiting worker
        if (registration.waiting) {
          setWaitingWorker(registration.waiting)
          setShowPrompt(true)
        }

        // Listen for new waiting workers
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              setWaitingWorker(newWorker)
              setShowPrompt(true)
            }
          })
        })
      } catch (error) {
        console.error('Service worker registration error:', error)
      }
    }

    checkForUpdates()

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
    }
  }, [])

  if (!showPrompt) return null

  return (
    <div className="fixed top-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <div className="bg-background border rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <RefreshCw className="h-5 w-5 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-foreground">
              Update verfuegbar
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Eine neue Version von Bonalyze ist verfuegbar.
            </p>

            <div className="flex items-center gap-2 mt-3">
              <Button
                size="sm"
                onClick={handleUpdate}
                className="h-8 text-xs gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                Jetzt aktualisieren
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowPrompt(false)}
                className="h-8 text-xs"
              >
                Spaeter
              </Button>
            </div>
          </div>

          <button
            onClick={() => setShowPrompt(false)}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
