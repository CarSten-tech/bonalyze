'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, User } from 'lucide-react'
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

const profileSchema = z.object({
  displayName: z.string().min(2, 'Name muss mindestens 2 Zeichen haben').max(50, 'Name darf maximal 50 Zeichen haben'),
})

type ProfileFormData = z.infer<typeof profileSchema>

export default function OnboardingProfilePage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingProfile, setIsCheckingProfile] = useState(true)

  const supabase = createClient()

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: '',
    },
  })

  // Check if user already has a profile
  useEffect(() => {
    const checkProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        window.location.assign('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single()

      if (profile?.display_name) {
        // User already has a profile, redirect to dashboard
        window.location.assign('/dashboard')
        return
      }

      setIsCheckingProfile(false)
    }

    checkProfile()
  }, [supabase])

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      toast.error('Nicht angemeldet', {
        description: 'Bitte melde dich erneut an.',
      })
      window.location.assign('/login')
      return
    }

    // Create or update profile
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        display_name: data.displayName,
      }, {
        onConflict: 'id',
      })

    if (error) {
      toast.error('Profil konnte nicht gespeichert werden', {
        description: error.message,
      })
      setIsLoading(false)
      return
    }

    toast.success('Profil erstellt', {
      description: 'Willkommen bei Bonalyze!',
    })

    // Check if user already has a household
    const { data: membership } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    if (membership) {
      // User already has a household, redirect to dashboard
      window.location.assign('/dashboard')
    } else {
      // User needs to create/join a household
      window.location.assign('/onboarding/household')
    }
  }

  if (isCheckingProfile) {
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
          <User className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl text-center">Willkommen!</CardTitle>
        <CardDescription className="text-center">
          Richte dein Profil ein, um loszulegen
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Anzeigename</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Max Mustermann"
                      autoComplete="name"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    So wirst du in der App angezeigt
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
                  Wird gespeichert...
                </>
              ) : (
                'Weiter zum Dashboard'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
