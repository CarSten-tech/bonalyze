'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, User, Bell, Link2 } from 'lucide-react'

import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { usePushNotifications } from '@/hooks/use-push-notifications'

const profileSchema = z.object({
  firstName: z.string().min(2, 'Name muss mindestens 2 Zeichen lang sein'),
  email: z.string().email('Ungueltige E-Mail-Adresse'),
})

type ProfileFormData = z.infer<typeof profileSchema>

export default function ProfileSettingsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // Alexa State
  const [linkCode, setLinkCode] = useState<string | null>(null)
  const [isGeneratingCode, setIsGeneratingCode] = useState(false)
  const [isLinked, setIsLinked] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)

  // Push Notifications State
  const { isSubscribed, subscribeToPush, unsubscribeFromPush, loading: pushLoading } = usePushNotifications()

  const supabase = createClient()

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      email: '',
    },
  })

  // Load Profile Data
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        setUserId(user.id)

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('first_name, email, display_name')
          .eq('id', user.id)
          .single()

        if (error) throw error

        form.reset({
          firstName: profile?.first_name || profile?.display_name || '',
          email: profile?.email || user.email || '',
        })
      } catch (error) {
        console.error('Error loading profile:', error)
        toast.error('Profil konnte nicht geladen werden')
      } finally {
        setIsLoading(false)
      }
    }

    const loadAlexaStatus = async () => {
      try {
        const response = await fetch('/api/alexa/link-code', { method: 'GET' })
        if (!response.ok) return
        const data = await response.json() as { isLinked?: boolean }
        setIsLinked(Boolean(data.isLinked))
      } catch {
        // Silent fail
      }
    }

    loadProfile()
    loadAlexaStatus()
  }, [supabase, form])

  const onSubmit = async (data: ProfileFormData) => {
    if (!userId) return
    setIsSaving(true)

    try {
      // 1. Update Profile (Name)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: data.firstName,
          display_name: data.firstName, // Sync display_name with first_name
          email: data.email,
        })
        .eq('id', userId)

      if (profileError) throw profileError

      // 2. Update Auth Email (if changed)
      const { data: { user } } = await supabase.auth.getUser()
      if (user && user.email !== data.email) {
        const { error: authError } = await supabase.auth.updateUser({
          email: data.email,
        })
        if (authError) throw authError
        toast.success('Bestätige deine neue E-Mail-Adresse im Postfach.')
      }

      toast.success('Profil aktualisiert')
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Fehler beim Speichern', {
        description: (error as Error).message
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Alexa Handler
  const handleGenerateCode = async () => {
    setIsGeneratingCode(true)
    setLinkError(null)
    try {
      const response = await fetch('/api/alexa/link-code', { method: 'POST' })
      const data = await response.json()
      if (!response.ok || !data.code) {
        setLinkError(data.error || 'Fehler beim Erstellen')
        return
      }
      setLinkCode(data.code)
    } catch {
      setLinkError('Fehler beim Erstellen')
    } finally {
      setIsGeneratingCode(false)
    }
  }

  const handlePushToggle = (checked: boolean) => {
    if (checked) subscribeToPush()
    else unsubscribeFromPush()
  }

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Profil-Einstellungen</h1>
        <p className="text-muted-foreground">
          Verwalte deine persönlichen Daten und Einstellungen
        </p>
      </div>

      {/* Persönliche Daten */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Persönliche Daten
          </CardTitle>
          <CardDescription>
            Dein Name wird für Einkaufslisten-Benachrichtigungen verwendet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vorname (Anzeigename)</FormLabel>
                    <FormControl>
                      <Input placeholder="Dein Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-Mail-Adresse</FormLabel>
                    <FormControl>
                      <Input placeholder="name@beispiel.de" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Speichern
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Push Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Push-Benachrichtigungen
          </CardTitle>
          <CardDescription>
            Bleibe auf dem Laufenden über wichtige Updates.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              onCheckedChange={handlePushToggle}
              disabled={pushLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Alexa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Alexa Verknuepfung
          </CardTitle>
          <CardDescription>
            Verbinde deinen Alexa Skill mit Bonalyze.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4 space-y-2">
            <p className="text-sm">
              Status: <span className={isLinked ? 'text-green-600 font-medium' : 'text-muted-foreground'}>{isLinked ? 'Verbunden' : 'Nicht verbunden'}</span>
            </p>
            <Button onClick={handleGenerateCode} disabled={isGeneratingCode} variant="outline" size="sm">
              {isGeneratingCode ? '...' : 'Neuen Link-Code erstellen'}
            </Button>
            {linkCode && (
              <div className="rounded-md bg-muted p-3 mt-2">
                <p className="text-2xl font-bold tracking-widest text-center">{linkCode}</p>
                <p className="text-xs text-center text-muted-foreground mt-1">
                  Sage: &quot;Alexa, verknuepfen mit Code {linkCode}&quot;
                </p>
              </div>
            )}
            {linkError && <p className="text-sm text-red-600">{linkError}</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
