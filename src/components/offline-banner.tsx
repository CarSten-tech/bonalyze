'use client'

import { WifiOff } from 'lucide-react'
import { useOffline } from '@/hooks/use-offline'
import { cn } from '@/lib/utils'

export function OfflineBanner() {
  const isOffline = useOffline()

  if (!isOffline) return null

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
    </div>
  )
}
