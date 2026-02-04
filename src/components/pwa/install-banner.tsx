'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X, Download, Share } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

const STORAGE_KEY = 'pwa-install-dismissed'
const DISMISS_DURATION_DAYS = 30

function isIOSSafari(): boolean {
  if (typeof window === 'undefined') return false

  const ua = window.navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua)
  const isWebkit = /WebKit/.test(ua)
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS/.test(ua)

  return isIOS && isWebkit && isSafari
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator && (window.navigator as unknown as { standalone: boolean }).standalone)
  )
}

export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [showIOSInstructions, setShowIOSInstructions] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)

  useEffect(() => {
    // Don't show if already installed
    if (isStandalone()) return

    // Check if user has dismissed recently
    const dismissed = localStorage.getItem(STORAGE_KEY)
    if (dismissed) {
      const dismissedDate = new Date(dismissed)
      const now = new Date()
      const daysSinceDismissed = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceDismissed < DISMISS_DURATION_DAYS) return
    }

    // Handle iOS Safari separately
    if (isIOSSafari()) {
      // Show iOS instructions after a delay
      const timer = setTimeout(() => {
        setShowIOSInstructions(true)
        setShowBanner(true)
      }, 3000)
      return () => clearTimeout(timer)
    }

    // Handle standard beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowBanner(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Check if app was installed
    const handleAppInstalled = () => {
      setShowBanner(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    setIsInstalling(true)

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        setShowBanner(false)
      }
    } catch (error) {
      console.error('Install prompt error:', error)
    } finally {
      setIsInstalling(false)
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    setShowBanner(false)
    localStorage.setItem(STORAGE_KEY, new Date().toISOString())
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <div className="bg-background border rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            {showIOSInstructions ? (
              <Share className="h-6 w-6 text-primary" />
            ) : (
              <Download className="h-6 w-6 text-primary" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-foreground">
              Bonalyze installieren
            </h3>

            {showIOSInstructions ? (
              <p className="text-xs text-muted-foreground mt-1">
                Tippe auf{' '}
                <Share className="inline h-3 w-3" /> und dann auf
                &quot;Zum Home-Bildschirm&quot;
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                Fuer schnellen Zugriff direkt vom Homescreen
              </p>
            )}

            {!showIOSInstructions && (
              <div className="flex items-center gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={handleInstall}
                  disabled={isInstalling}
                  className="h-8 text-xs"
                >
                  {isInstalling ? 'Wird installiert...' : 'Installieren'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismiss}
                  className="h-8 text-xs"
                >
                  Spaeter
                </Button>
              </div>
            )}

            {showIOSInstructions && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="h-8 text-xs mt-2"
              >
                Verstanden
              </Button>
            )}
          </div>

          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
