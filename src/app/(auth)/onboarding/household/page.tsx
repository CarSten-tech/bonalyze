'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Home, Link as LinkIcon } from 'lucide-react'
import { toast } from 'sonner'

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
  FormDescription,
} from '@/components/ui/form'
import { Separator } from '@/components/ui/separator'

const householdSchema = z.object({
  name: z
    .string()
    .min(2, 'Name muss mindestens 2 Zeichen haben')
    .max(50, 'Name darf maximal 50 Zeichen haben'),
})

type HouseholdFormData = z.infer<typeof householdSchema>

export default function OnboardingHouseholdPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingHousehold, setIsCheckingHousehold] = useState(true)
  const [showInviteInput, setShowInviteInput] = useState(false)
  const [inviteToken, setInviteToken] = useState('')
  const [isAcceptingInvite, setIsAcceptingInvite] = useState(false)

  const supabase = createClient()

  const form = useForm<HouseholdFormData>({
    resolver: zodResolver(householdSchema),
    defaultValues: {
      name: '',
    },
  })

  // Check if user already has a household
  useEffect(() => {
    const checkHousehold = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        window.location.href = '/login'
        return
      }

      // Check if user has a profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single()

      if (!profile?.display_name) {
        // User needs to complete profile first
        window.location.href = '/onboarding/profile'
        return
      }

      // Check if user is already member of a household
      const { data: membership } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .limit(1)
        .single()

      if (membership) {
        // User already has a household, redirect to dashboard
        window.location.href = '/dashboard'
        return
      }

      setIsCheckingHousehold(false)
    }

    checkHousehold()
  }, [supabase])

  const onSubmit = async (data: HouseholdFormData) => {
    setIsLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      toast.error('Nicht angemeldet', {
        description: 'Bitte melde dich erneut an.',
      })
      window.location.href = '/login'
      return
    }

    // Create household
    const { data: household, error: householdError } = await supabase
      .from('households')
      .insert({
        name: data.name,
        created_by: user.id,
      })
      .select()
      .single()

    if (householdError) {
      toast.error('Haushalt konnte nicht erstellt werden', {
        description: householdError.message,
      })
      setIsLoading(false)
      return
    }

    // Add user as owner member
    const { error: memberError } = await supabase
      .from('household_members')
      .insert({
        household_id: household.id,
        user_id: user.id,
        role: 'owner',
      })

    if (memberError) {
      toast.error('Mitgliedschaft konnte nicht erstellt werden', {
        description: memberError.message,
      })
      // Try to clean up the household
      await supabase.from('households').delete().eq('id', household.id)
      setIsLoading(false)
      return
    }

    toast.success('Haushalt erstellt', {
      description: `"${data.name}" wurde erfolgreich erstellt.`,
    })

    // Redirect to dashboard
    window.location.href = '/dashboard'
  }

  const handleAcceptInvite = async () => {
    if (!inviteToken.trim()) {
      toast.error('Bitte gib einen Einladungs-Link ein')
      return
    }

    // Extract token from URL or use as-is
    let token = inviteToken.trim()
    if (token.includes('/invite/')) {
      const parts = token.split('/invite/')
      token = parts[parts.length - 1].split('?')[0]
    }

    setIsAcceptingInvite(true)

    // Navigate to invite page with token
    window.location.href = `/invite/${token}`
  }

  if (isCheckingHousehold) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Home className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl text-center">Haushalt erstellen</CardTitle>
        <CardDescription className="text-center">
          Erstelle deinen Haushalt, um Ausgaben mit anderen zu teilen
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Haushalt-Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="z.B. Familie Mueller, WG Hauptstrasse"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Der Name hilft dir, mehrere Haushalte zu unterscheiden
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wird erstellt...
                </>
              ) : (
                'Haushalt erstellen'
              )}
            </Button>
          </form>
        </Form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              oder
            </span>
          </div>
        </div>

        {!showInviteInput ? (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowInviteInput(true)}
          >
            <LinkIcon className="mr-2 h-4 w-4" />
            Einladung annehmen
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Einladungs-Link</label>
              <Input
                placeholder="Fuege deinen Einladungs-Link hier ein"
                value={inviteToken}
                onChange={(e) => setInviteToken(e.target.value)}
                disabled={isAcceptingInvite}
              />
              <p className="text-xs text-muted-foreground">
                Du hast einen Einladungs-Link von jemandem erhalten? Fuege ihn hier ein.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowInviteInput(false)
                  setInviteToken('')
                }}
                disabled={isAcceptingInvite}
              >
                Abbrechen
              </Button>
              <Button
                className="flex-1"
                onClick={handleAcceptInvite}
                disabled={isAcceptingInvite || !inviteToken.trim()}
              >
                {isAcceptingInvite ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Wird geprueft...
                  </>
                ) : (
                  'Beitreten'
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
