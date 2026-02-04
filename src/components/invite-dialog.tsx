'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Copy, Check, Mail } from 'lucide-react'
import { toast } from 'sonner'

import { createClient } from '@/lib/supabase'
import { useHousehold } from '@/contexts/household-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'

const inviteSchema = z.object({
  email: z.string().email('Bitte gib eine gueltige Email-Adresse ein'),
})

type InviteFormData = z.infer<typeof inviteSchema>

interface InviteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onInviteSent: () => void
}

export function InviteDialog({ open, onOpenChange, onInviteSent }: InviteDialogProps) {
  const { currentHousehold } = useHousehold()
  const [isLoading, setIsLoading] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const supabase = createClient()

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
    },
  })

  const handleClose = () => {
    form.reset()
    setInviteLink(null)
    setCopied(false)
    onOpenChange(false)
  }

  const onSubmit = async (data: InviteFormData) => {
    if (!currentHousehold) return

    setIsLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      toast.error('Nicht angemeldet')
      setIsLoading(false)
      return
    }

    // Check if email is already a member
    const { data: existingMember } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    // Check for existing invite
    const { data: existingInvite } = await supabase
      .from('household_invites')
      .select('id')
      .eq('household_id', currentHousehold.id)
      .eq('email', data.email.toLowerCase())
      .is('accepted_at', null)
      .single()

    if (existingInvite) {
      // Update existing invite
      const { error } = await supabase
        .from('household_invites')
        .update({
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', existingInvite.id)
        .select('token')
        .single()

      if (error) {
        toast.error('Einladung konnte nicht aktualisiert werden', {
          description: error.message,
        })
        setIsLoading(false)
        return
      }

      // Get token from existing invite
      const { data: invite } = await supabase
        .from('household_invites')
        .select('token')
        .eq('id', existingInvite.id)
        .single()

      if (invite) {
        const link = `${window.location.origin}/invite/${invite.token}`
        setInviteLink(link)
        toast.success('Einladung wurde erneuert')
      }
    } else {
      // Create new invite
      const { data: invite, error } = await supabase
        .from('household_invites')
        .insert({
          household_id: currentHousehold.id,
          email: data.email.toLowerCase(),
          invited_by: user.id,
        })
        .select('token')
        .single()

      if (error) {
        if (error.message.includes('duplicate')) {
          toast.error('Diese Email wurde bereits eingeladen')
        } else {
          toast.error('Einladung konnte nicht erstellt werden', {
            description: error.message,
          })
        }
        setIsLoading(false)
        return
      }

      const link = `${window.location.origin}/invite/${invite.token}`
      setInviteLink(link)
      toast.success('Einladung erstellt')
    }

    onInviteSent()
    setIsLoading(false)
  }

  const handleCopy = async () => {
    if (!inviteLink) return

    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      toast.success('Link kopiert')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Link konnte nicht kopiert werden')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mitglied einladen</DialogTitle>
          <DialogDescription>
            Lade jemanden zu &quot;{currentHousehold?.name}&quot; ein
          </DialogDescription>
        </DialogHeader>

        {!inviteLink ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email-Adresse</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="beispiel@email.de"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Die Person erhaelt einen Einladungs-Link
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>
                  Abbrechen
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Wird erstellt...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Einladung erstellen
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Einladungs-Link</label>
              <div className="flex gap-2">
                <Input
                  value={inviteLink}
                  readOnly
                  className="flex-1 text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Teile diesen Link mit der eingeladenen Person. Der Link ist 7 Tage gueltig.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Fertig</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
