'use client'

import { useState } from 'react'
import { RefreshCw, WifiOff, X } from 'lucide-react'

import { useOffline } from '@/hooks/use-offline'
import { useSyncStatus } from '@/hooks/use-sync-status'
import { triggerSyncNow } from '@/lib/sync-queue'
import { cn } from '@/lib/utils'

function OfflineBannerContent() {
  const isOffline = useOffline()
  const syncStatus = useSyncStatus()
  const [isDismissed, setIsDismissed] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  const shouldShow = isOffline || syncStatus.pending > 0
  if (!shouldShow || isDismissed) return null

  const statusMessage = isOffline
    ? `Du bist offline. ${syncStatus.pending > 0 ? `${syncStatus.pending} Änderungen warten auf Sync.` : 'Änderungen werden lokal gespeichert.'}`
    : syncStatus.failed > 0
      ? `${syncStatus.pending} Änderungen ausstehend (${syncStatus.failed} mit wiederholten Fehlern).`
      : `${syncStatus.pending} Änderungen warten auf Synchronisierung.`

  const handleSyncNow = async () => {
    setIsSyncing(true)
    try {
      await triggerSyncNow()
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div
      className={cn(
        'fixed bottom-4 left-4 right-4 z-50',
        'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900',
        'px-4 py-3 rounded-lg shadow-lg',
        'flex items-center justify-between gap-3',
        'animate-in slide-in-from-bottom duration-300'
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <WifiOff className="h-5 w-5 shrink-0" />
        <span className="text-sm font-medium truncate">{statusMessage}</span>
      </div>
      <div className="flex items-center gap-2">
        {!isOffline && syncStatus.pending > 0 && (
          <button
            type="button"
            onClick={() => {
              void handleSyncNow()
            }}
            className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium hover:bg-white/10 dark:hover:bg-slate-900/10"
            disabled={isSyncing}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isSyncing && 'animate-spin')} />
            Jetzt syncen
          </button>
        )}
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
    </div>
  )
}

export function OfflineBanner() {
  return <OfflineBannerContent />
}
