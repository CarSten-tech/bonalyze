'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import { Bell } from 'lucide-react'

export default function ProfileSettingsPage() {
  const { isSubscribed, subscribeToPush, unsubscribeFromPush, loading, debugInfo } = usePushNotifications()

  const handleToggle = (checked: boolean) => {
    if (checked) {
      subscribeToPush()
    } else {
      unsubscribeFromPush()
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Profil-Einstellungen</h1>
        <p className="text-muted-foreground">
          Verwalte deine persönlichen Einstellungen
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Push-Benachrichtigungen
          </CardTitle>
          <CardDescription>
            Bleibe auf dem Laufenden über wichtige Updates und Ereignisse.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between space-x-4 rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="push-notifications" className="text-base">
                Benachrichtigungen aktivieren
              </Label>
              <div className="text-sm text-muted-foreground">
                Erlaube Push-Nachrichten auf diesem Gerät.
              </div>
            </div>
            <Switch
              id="push-notifications"
              checked={isSubscribed}
              onCheckedChange={handleToggle}
              disabled={loading}
            />
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border bg-muted/50 p-4 text-xs font-mono text-muted-foreground">
        <p className="font-bold mb-2">Debug Info:</p>
        <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
        <p className="mt-2">Loading: {loading ? 'YES' : 'NO'}</p>
        <p>Subscribed: {isSubscribed ? 'YES' : 'NO'}</p>
      </div>
    </div>
  )
}
