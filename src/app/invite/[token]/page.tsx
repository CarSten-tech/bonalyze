'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Home, UserPlus, XCircle, AlertTriangle, Clock, LogIn } from 'lucide-react'
import { toast } from 'sonner'

import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface InviteData {
  id: string
  email: string
  expires_at: string
  accepted_at: string | null
  household: {
    id: string
    name: string
  }
  inviter: {
    display_name: string
  } | null
}

type InviteStatus = 'loading' | 'valid' | 'expired' | 'used' | 'not_found' | 'not_logged_in' | 'already_member'

export default function InvitePage() {
  const params = useParams()
  const token = params.token as string

  const [status, setStatus] = useState<InviteStatus>('loading')
  const [invite, setInvite] = useState<InviteData | null>(null)
  const [isAccepting, setIsAccepting] = useState(false)
  const [isDeclining, setIsDeclining] = useState(false)
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    const loadInvite = async () => {
      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        // Store token in sessionStorage for after login
        sessionStorage.setItem('pending_invite_token', token)
        setStatus('not_logged_in')
        return
      }

      setCurrentUserEmail(user.email || null)

      // Fetch invite
      const { data: inviteData, error } = await supabase
        .from('household_invites')
        .select(`
          id,
          email,
          expires_at,
          accepted_at,
          households (
            id,
            name
          ),
          profiles!household_invites_invited_by_fkey (
            display_name
          )
        `)
        .eq('token', token)
        .single()

      if (error || !inviteData) {
        setStatus('not_found')
        return
      }

      // Transform data
      const transformedInvite: InviteData = {
        id: inviteData.id,
        email: inviteData.email,
        expires_at: inviteData.expires_at,
        accepted_at: inviteData.accepted_at,
        household: Array.isArray(inviteData.households)
          ? inviteData.households[0]
          : inviteData.households,
        inviter: Array.isArray(inviteData.profiles)
          ? inviteData.profiles[0]
          : inviteData.profiles,
      }

      setInvite(transformedInvite)

      // Check if already accepted
      if (transformedInvite.accepted_at) {
        setStatus('used')
        return
      }

      // Check if expired
      if (new Date(transformedInvite.expires_at) < new Date()) {
        setStatus('expired')
        return
      }

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('household_members')
        .select('id')
        .eq('household_id', transformedInvite.household.id)
        .eq('user_id', user.id)
        .single()

      if (existingMember) {
        setStatus('already_member')
        return
      }

      setStatus('valid')
    }

    loadInvite()
  }, [supabase, token])

  const handleAccept = async () => {
    if (!invite) return

    setIsAccepting(true)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      toast.error('Nicht angemeldet')
      setIsAccepting(false)
      return
    }

    // Check if user has a profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()

    if (!profile?.display_name) {
      // Store token and redirect to profile setup
      sessionStorage.setItem('pending_invite_token', token)
      toast.info('Bitte vervollstaendige zuerst dein Profil')
      window.location.href = '/onboarding/profile'
      return
    }

    // Add user to household
    const { error: memberError } = await supabase
      .from('household_members')
      .insert({
        household_id: invite.household.id,
        user_id: user.id,
        role: 'member',
      })

    if (memberError) {
      toast.error('Beitritt fehlgeschlagen', {
        description: memberError.message,
      })
      setIsAccepting(false)
      return
    }

    // Mark invite as accepted
    await supabase
      .from('household_invites')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invite.id)

    // Clear pending token
    sessionStorage.removeItem('pending_invite_token')

    toast.success(`Willkommen bei "${invite.household.name}"!`)
    window.location.href = '/dashboard'
  }

  const handleDecline = async () => {
    setIsDeclining(true)

    // Clear pending token
    sessionStorage.removeItem('pending_invite_token')

    toast.info('Einladung abgelehnt')
    window.location.href = '/dashboard'
  }

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Not logged in
  if (status === 'not_logged_in') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <LogIn className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>Anmeldung erforderlich</CardTitle>
            <CardDescription>
              Bitte melde dich an oder erstelle einen Account, um die Einladung anzunehmen
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-2">
            <Button className="w-full" asChild>
              <Link href="/login">Anmelden</Link>
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/signup">Account erstellen</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Not found
  if (status === 'not_found') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle>Einladung nicht gefunden</CardTitle>
            <CardDescription>
              Dieser Einladungs-Link ist ungueltig oder wurde bereits geloescht
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button className="w-full" asChild>
              <Link href="/dashboard">Zum Dashboard</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Expired
  if (status === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
              <Clock className="h-8 w-8 text-amber-500" />
            </div>
            <CardTitle>Einladung abgelaufen</CardTitle>
            <CardDescription>
              Diese Einladung{invite ? ` zu "${invite.household.name}"` : ''} ist abgelaufen.
              Bitte den Haushalt-Admin um eine neue Einladung.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button className="w-full" asChild>
              <Link href="/dashboard">Zum Dashboard</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Already used
  if (status === 'used') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
            </div>
            <CardTitle>Einladung bereits verwendet</CardTitle>
            <CardDescription>
              Diese Einladung wurde bereits angenommen
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button className="w-full" asChild>
              <Link href="/dashboard">Zum Dashboard</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Already member
  if (status === 'already_member') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
              <Home className="h-8 w-8 text-green-500" />
            </div>
            <CardTitle>Bereits Mitglied</CardTitle>
            <CardDescription>
              Du bist bereits Mitglied{invite ? ` von "${invite.household.name}"` : ''}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button className="w-full" asChild>
              <Link href="/dashboard">Zum Dashboard</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Valid invite
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Home className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Einladung</CardTitle>
          <CardDescription>
            Du wurdest zu einem Haushalt eingeladen
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div>
            <p className="text-2xl font-bold">{invite?.household.name}</p>
            {invite?.inviter && (
              <p className="text-muted-foreground">
                Eingeladen von {invite.inviter.display_name}
              </p>
            )}
          </div>
          {currentUserEmail && currentUserEmail.toLowerCase() !== invite?.email.toLowerCase() && (
            <div className="bg-amber-500/10 text-amber-700 text-sm p-3 rounded-md">
              <AlertTriangle className="h-4 w-4 inline mr-2" />
              Die Einladung wurde an {invite?.email} gesendet, du bist aber als {currentUserEmail} angemeldet.
            </div>
          )}
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleDecline}
            disabled={isAccepting || isDeclining}
          >
            {isDeclining ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="mr-2 h-4 w-4" />
            )}
            Ablehnen
          </Button>
          <Button
            className="flex-1"
            onClick={handleAccept}
            disabled={isAccepting || isDeclining}
          >
            {isAccepting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="mr-2 h-4 w-4" />
            )}
            Beitreten
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
