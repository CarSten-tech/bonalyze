'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Loader2,
  Edit2,
  Check,
  X,
  UserMinus,
  Shield,
  ShieldOff,
  Send,
  Trash2,
  Clock,
  Mail,
  LogOut,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'

import { createClient } from '@/lib/supabase'
import { useHousehold } from '@/contexts/household-context'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { InviteDialog } from '@/components/invite-dialog'

interface Member {
  id: string
  user_id: string
  role: string | null
  joined_at: string
  profile: {
    display_name: string
    avatar_url: string | null
  } | null
}

interface Invite {
  id: string
  email: string
  created_at: string
  expires_at: string
}

const nameSchema = z.object({
  name: z.string().min(2, 'Name muss mindestens 2 Zeichen haben').max(50),
})

type NameFormData = z.infer<typeof nameSchema>

export default function HouseholdSettingsPage() {
  const router = useRouter()
  const { currentHousehold, refreshHouseholds } = useHousehold()
  const [members, setMembers] = useState<Member[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(true)
  const [isLoadingInvites, setIsLoadingInvites] = useState(true)
  const [isEditingName, setIsEditingName] = useState(false)
  const [isSavingName, setIsSavingName] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const supabase = useMemo(() => createClient(), [])

  const nameForm = useForm<NameFormData>({
    resolver: zodResolver(nameSchema),
    defaultValues: {
      name: currentHousehold?.name || '',
    },
  })

  // Get current user ID
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
    }
    getUser()
  }, [supabase])

  // Update form when household changes
  useEffect(() => {
    if (currentHousehold) {
      nameForm.reset({ name: currentHousehold.name })
    }
  }, [currentHousehold, nameForm])

  // Load members
  const loadMembers = useCallback(async () => {
    if (!currentHousehold) return

    setIsLoadingMembers(true)
    const { data, error } = await supabase
      .from('household_members')
      .select(`
        id,
        user_id,
        role,
        joined_at,
        profiles (
          display_name,
          avatar_url
        )
      `)
      .eq('household_id', currentHousehold.id)
      .order('joined_at', { ascending: true })

    if (error) {
      console.error('Error loading members:', error)
    } else {
      setMembers(
        (data || []).map((m) => ({
          ...m,
          profile: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles,
        }))
      )
    }
    setIsLoadingMembers(false)
  }, [supabase, currentHousehold])

  // Load invites
  const loadInvites = useCallback(async () => {
    if (!currentHousehold) {
      setIsLoadingInvites(false)
      return
    }

    setIsLoadingInvites(true)
    const { data, error } = await supabase
      .from('household_invites')
      .select('id, email, created_at, expires_at')
      .eq('household_id', currentHousehold.id)
      .is('accepted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading invites:', error)
    } else {
      setInvites(data || [])
    }
    setIsLoadingInvites(false)
  }, [supabase, currentHousehold])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadMembers()
      void loadInvites()
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadMembers, loadInvites])

  const handleSaveName = async (data: NameFormData) => {
    if (!currentHousehold) return

    setIsSavingName(true)
    const { error } = await supabase
      .from('households')
      .update({ name: data.name })
      .eq('id', currentHousehold.id)

    if (error) {
      toast.error('Name konnte nicht gespeichert werden', {
        description: error.message,
      })
    } else {
      toast.success('Name gespeichert')
      await refreshHouseholds()
      setIsEditingName(false)
    }
    setIsSavingName(false)
  }

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    setActionLoading(memberId)

    const { error } = await supabase
      .from('household_members')
      .delete()
      .eq('id', memberId)

    if (error) {
      toast.error('Mitglied konnte nicht entfernt werden', {
        description: error.message,
      })
    } else {
      toast.success(`${memberName} wurde entfernt`)
      await loadMembers()
    }
    setActionLoading(null)
  }

  const handleChangeRole = async (memberId: string, newRole: string, memberName: string) => {
    setActionLoading(memberId)

    const { error } = await supabase
      .from('household_members')
      .update({ role: newRole })
      .eq('id', memberId)

    if (error) {
      toast.error('Rolle konnte nicht geaendert werden', {
        description: error.message,
      })
    } else {
      toast.success(`${memberName} ist jetzt ${newRole === 'admin' ? 'Admin' : 'Mitglied'}`)
      await loadMembers()
    }
    setActionLoading(null)
  }

  const handleResendInvite = async (inviteId: string, email: string) => {
    setActionLoading(inviteId)
    const newExpiry = new Date()
    newExpiry.setDate(newExpiry.getDate() + 7)

    // Update expires_at to extend the invite
    const { error } = await supabase
      .from('household_invites')
      .update({
        expires_at: newExpiry.toISOString(),
      })
      .eq('id', inviteId)

    if (error) {
      toast.error('Einladung konnte nicht erneut gesendet werden', {
        description: error.message,
      })
    } else {
      toast.success(`Einladung an ${email} wurde verlaengert`)
      await loadInvites()
    }
    setActionLoading(null)
  }

  const handleDeleteInvite = async (inviteId: string) => {
    setActionLoading(inviteId)

    const { error } = await supabase
      .from('household_invites')
      .delete()
      .eq('id', inviteId)

    if (error) {
      toast.error('Einladung konnte nicht gelöscht werden', {
        description: error.message,
      })
    } else {
      toast.success('Einladung gelöscht')
      await loadInvites()
    }
    setActionLoading(null)
  }

  const handleLeaveHousehold = async () => {
    if (!currentHousehold || !currentUserId) return

    // Check if user is last admin
    const adminCount = members.filter((m) => m.role === 'admin').length
    const isCurrentUserAdmin = members.find((m) => m.user_id === currentUserId)?.role === 'admin'

    if (isCurrentUserAdmin && adminCount === 1 && members.length > 1) {
      toast.error('Du bist der einzige Admin', {
        description: 'Bitte ernenne erst jemand anderen zum Admin, bevor du den Haushalt verlaesst.',
      })
      return
    }

    setActionLoading('leave')

    // Find current user's membership
    const membership = members.find((m) => m.user_id === currentUserId)
    if (!membership) {
      toast.error('Mitgliedschaft nicht gefunden')
      setActionLoading(null)
      return
    }

    const { error } = await supabase
      .from('household_members')
      .delete()
      .eq('id', membership.id)

    if (error) {
      toast.error('Haushalt konnte nicht verlassen werden', {
        description: error.message,
      })
      setActionLoading(null)
      return
    }

    // If last member, delete household
    if (members.length === 1) {
      await supabase.from('households').delete().eq('id', currentHousehold.id)
    }

    toast.success('Haushalt verlassen')
    router.replace('/onboarding/household')
  }

  if (!currentHousehold) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const adminCount = members.filter((m) => m.role === 'admin').length

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Haushalt-Einstellungen</h1>
        <p className="text-muted-foreground">
          Verwalte deinen Haushalt und seine Mitglieder
        </p>
      </div>

      {/* Household Name */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Haushalt-Name</CardTitle>
          <CardDescription>
            Der Name deines Haushalts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isEditingName ? (
            <form onSubmit={nameForm.handleSubmit(handleSaveName)} className="flex gap-2">
              <Input
                {...nameForm.register('name')}
                disabled={isSavingName}
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={isSavingName}>
                {isSavingName ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  setIsEditingName(false)
                  nameForm.reset({ name: currentHousehold.name })
                }}
                disabled={isSavingName}
              >
                <X className="h-4 w-4" />
              </Button>
            </form>
          ) : (
            <div className="flex items-center justify-between">
              <span className="font-medium">{currentHousehold.name}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingName(true)}
              >
                <Edit2 className="mr-2 h-4 w-4" />
                Bearbeiten
              </Button>
            </div>
          )}
          {nameForm.formState.errors.name && (
            <p className="text-sm text-destructive mt-2">
              {nameForm.formState.errors.name.message}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Members */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Mitglieder</CardTitle>
          <CardDescription>
            {members.length} {members.length === 1 ? 'Mitglied' : 'Mitglieder'} in diesem Haushalt
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingMembers ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            members.map((member) => {
              const isCurrentUser = member.user_id === currentUserId
              const memberName = member.profile?.display_name || 'Unbekannt'
              const initials = memberName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
              const isOnlyAdmin = member.role === 'admin' && adminCount === 1

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between py-2"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{memberName}</span>
                        {isCurrentUser && (
                          <Badge variant="outline" className="text-xs">Du</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                          {member.role === 'admin' ? 'Admin' : 'Mitglied'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Beigetreten {formatDistanceToNow(new Date(member.joined_at), {
                            addSuffix: true,
                            locale: de,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  {!isCurrentUser && (
                    <div className="flex items-center gap-1">
                      {member.role === 'admin' ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleChangeRole(member.id, 'member', memberName)}
                          disabled={actionLoading === member.id || isOnlyAdmin}
                          title={isOnlyAdmin ? 'Letzter Admin kann nicht degradiert werden' : 'Zum Mitglied degradieren'}
                        >
                          {actionLoading === member.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ShieldOff className="h-4 w-4" />
                          )}
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleChangeRole(member.id, 'admin', memberName)}
                          disabled={actionLoading === member.id}
                          title="Zum Admin machen"
                        >
                          {actionLoading === member.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Shield className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={actionLoading === member.id}
                            title="Mitglied entfernen"
                          >
                            <UserMinus className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Mitglied entfernen?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Moechtest du {memberName} wirklich aus dem Haushalt entfernen?
                              Diese Aktion kann nicht rueckgaengig gemacht werden.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemoveMember(member.id, memberName)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Entfernen
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* Pending Invites */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Ausstehende Einladungen</CardTitle>
              <CardDescription>
                {invites.length} offene {invites.length === 1 ? 'Einladung' : 'Einladungen'}
              </CardDescription>
            </div>
            <Button onClick={() => setShowInviteDialog(true)}>
              <Mail className="mr-2 h-4 w-4" />
              Einladen
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingInvites ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : invites.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Keine ausstehenden Einladungen
            </p>
          ) : (
            <div className="space-y-3">
              {invites.map((invite) => {
                const isExpired = new Date(invite.expires_at) < new Date()

                return (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between py-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <span className="font-medium">{invite.email}</span>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            Eingeladen {formatDistanceToNow(new Date(invite.created_at), {
                              addSuffix: true,
                              locale: de,
                            })}
                          </span>
                          {isExpired && (
                            <Badge variant="destructive" className="text-xs">
                              Abgelaufen
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleResendInvite(invite.id, invite.email)}
                        disabled={actionLoading === invite.id}
                        title="Einladung erneut senden"
                      >
                        {actionLoading === invite.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={actionLoading === invite.id}
                            title="Einladung loeschen"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Einladung loeschen?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Moechtest du die Einladung an {invite.email} wirklich loeschen?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteInvite(invite.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Loeschen
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Leave Household */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-lg text-destructive">Gefahrenzone</CardTitle>
          <CardDescription>
            Irreversible Aktionen für diesen Haushalt
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={actionLoading === 'leave'}>
                {actionLoading === 'leave' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="mr-2 h-4 w-4" />
                )}
                Haushalt verlassen
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Haushalt verlassen?</AlertDialogTitle>
                <AlertDialogDescription>
                  {members.length === 1
                    ? 'Du bist das letzte Mitglied. Der Haushalt wird gelöscht, wenn du ihn verlässt.'
                    : 'Moechtest du diesen Haushalt wirklich verlassen? Du kannst nur ueber eine neue Einladung wieder beitreten.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleLeaveHousehold}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Verlassen
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <InviteDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        onInviteSent={loadInvites}
      />
    </div>
  )
}
