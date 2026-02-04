'use client'

import { Button } from '@/components/ui/button'
import { WifiOff, RefreshCw } from 'lucide-react'

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="mx-auto w-20 h-20 rounded-full bg-muted flex items-center justify-center">
          <WifiOff className="h-10 w-10 text-muted-foreground" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">
            Du bist offline
          </h1>
          <p className="text-muted-foreground">
            Bitte ueberpreufe deine Internetverbindung und versuche es erneut.
          </p>
        </div>

        <Button onClick={handleRetry} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Erneut versuchen
        </Button>

        <div className="text-sm text-muted-foreground pt-4">
          <p>Einige Funktionen sind offline verfuegbar:</p>
          <ul className="mt-2 space-y-1">
            <li>Gespeicherte Kassenbons ansehen</li>
            <li>Statistiken der letzten Sitzung</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
