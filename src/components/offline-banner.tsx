'use client'

import { useState } from 'react'
import { WifiOff, X } from 'lucide-react'
import { useOffline } from '@/hooks/use-offline'
import { cn } from '@/lib/utils'

function OfflineBannerContent() {
  const [isDismissed, setIsDismissed] = useState(false)
  if (isDismissed) return null

  return (
    <div className={cn(
      "fixed bottom-4 left-4 right-4 z-50",
      "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900",
      "px-4 py-3 rounded-lg shadow-lg",
      "flex items-center justify-between gap-3",
      "animate-in slide-in-from-bottom duration-300"
    )}>
      <div className="flex items-center gap-3">
        <WifiOff className="h-5 w-5" />
        <span className="text-sm font-medium">
          Du bist offline. Änderungen werden lokal gespeichert.
        </span>
      </div>
      <button
        type="button"
        onClick={() => setIsDismissed(true)}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-white/10 dark:hover:bg-slate-900/10"
        aria-label="Offline-Hinweis schließen"
        title="Schließen"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export function OfflineBanner() {
  const isOffline = useOffline()
  if (!isOffline) return null

  // Unmounting on reconnect resets the dismiss state for future offline sessions.
  return <OfflineBannerContent />
}
