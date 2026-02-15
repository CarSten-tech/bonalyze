'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import { Bell, Link2 } from 'lucide-react'

export default function ProfileSettingsPage() {
  const { isSubscribed, subscribeToPush, unsubscribeFromPush, loading } = usePushNotifications()
  const [linkCode, setLinkCode] = useState<string | null>(null)
  const [linkCodeExpiresAt, setLinkCodeExpiresAt] = useState<string | null>(null)
  const [isGeneratingCode, setIsGeneratingCode] = useState(false)
  const [isLinked, setIsLinked] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)

  const handleToggle = (checked: boolean) => {
    if (checked) {
      subscribeToPush()
    } else {
      unsubscribeFromPush()
    }
  }

  useEffect(() => {
    const loadAlexaStatus = async () => {
      try {
        const response = await fetch('/api/alexa/link-code', { method: 'GET' })
        if (!response.ok) return

        const data = await response.json() as { isLinked?: boolean }
        setIsLinked(Boolean(data.isLinked))
      } catch {
        // Silent fail to keep settings usable without Alexa.
      }
    }

    loadAlexaStatus()
  }, [])

  const handleGenerateCode = async () => {
    setIsGeneratingCode(true)
    setLinkError(null)

    try {
      const response = await fetch('/api/alexa/link-code', { method: 'POST' })
      const data = await response.json() as { code?: string; expiresAt?: string; error?: string }

      if (!response.ok || !data.code || !data.expiresAt) {
        setLinkError(data.error || 'Link-Code konnte nicht erstellt werden.')
        return
      }

      setLinkCode(data.code)
      setLinkCodeExpiresAt(data.expiresAt)
    } catch {
      setLinkError('Link-Code konnte nicht erstellt werden.')
    } finally {
      setIsGeneratingCode(false)
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Alexa Verknuepfung
          </CardTitle>
          <CardDescription>
            Verbinde deinen Alexa Skill sicher mit deiner Bonalyze Einkaufsliste.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4 space-y-2">
            <p className="text-sm">
              Status: <span className={isLinked ? 'text-green-600 font-medium' : 'text-muted-foreground'}>{isLinked ? 'Verbunden' : 'Nicht verbunden'}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Erzeuge einen 6-stelligen Code und sage danach in Alexa: Verknuepfen mit Code {linkCode || '123456'}.
            </p>
            <Button onClick={handleGenerateCode} disabled={isGeneratingCode}>
              {isGeneratingCode ? 'Code wird erstellt...' : 'Neuen Link-Code erstellen'}
            </Button>
            {linkCode && (
              <div className="rounded-md bg-muted p-3">
                <p className="text-sm text-muted-foreground">Aktueller Code</p>
                <p className="text-2xl font-bold tracking-widest">{linkCode}</p>
                {linkCodeExpiresAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Gueltig bis {new Date(linkCodeExpiresAt).toLocaleString('de-DE')}
                  </p>
                )}
              </div>
            )}
            {linkError && (
              <p className="text-sm text-red-600">{linkError}</p>
            )}
          </div>

          <div className="rounded-lg border p-4 text-sm text-muted-foreground space-y-1">
            <p>Beispiele:</p>
            <p>Alexa, fuege Milch, Eier und Brot zur Einkaufsliste hinzu.</p>
            <p>Alexa, setze 2 Liter Milch und 12 Eier.</p>
            <p>Alexa, entferne Brot und Butter.</p>
            <p>Alexa, was steht auf meiner Einkaufsliste?</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
