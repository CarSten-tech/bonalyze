'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Loader2, Mail } from 'lucide-react'
import { toast } from 'sonner'

import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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

const loginSchema = z.object({
  email: z.string().email('Bitte gib eine gueltige E-Mail-Adresse ein'),
  password: z.string().min(1, 'Passwort ist erforderlich'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isMagicLinkLoading, setIsMagicLinkLoading] = useState(false)
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/dashboard'

  const supabase = createClient()

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      toast.error('Anmeldung fehlgeschlagen', {
        description: error.message === 'Invalid login credentials'
          ? 'E-Mail oder Passwort ist falsch'
          : error.message,
      })
      setIsLoading(false)
      return
    }

    if (authData.session) {
      toast.success('Erfolgreich angemeldet')
      // Hard redirect to ensure cookies are properly set
      window.location.assign(redirectTo)
    } else {
      toast.error('Anmeldung fehlgeschlagen', {
        description: 'Bitte versuche es erneut.',
      })
      setIsLoading(false)
    }
  }

  const handleMagicLink = async () => {
    const email = form.getValues('email')

    if (!email) {
      form.setError('email', {
        type: 'manual',
        message: 'Bitte gib deine E-Mail-Adresse ein',
      })
      return
    }

    const emailValidation = z.string().email().safeParse(email)
    if (!emailValidation.success) {
      form.setError('email', {
        type: 'manual',
        message: 'Bitte gib eine gueltige E-Mail-Adresse ein',
      })
      return
    }

    setIsMagicLinkLoading(true)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=${redirectTo}`,
      },
    })

    if (error) {
      toast.error('Magic Link konnte nicht gesendet werden', {
        description: error.message,
      })
      setIsMagicLinkLoading(false)
      return
    }

    toast.success('Magic Link gesendet', {
      description: 'Pruefe dein E-Mail-Postfach',
    })

    // Redirect to verify page
    window.location.assign(`/verify?email=${encodeURIComponent(email)}`)
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Anmelden</CardTitle>
        <CardDescription className="text-center">
          Melde dich mit deinem Konto an
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-Mail</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="name@beispiel.de"
                      autoComplete="email"
                      disabled={isLoading || isMagicLinkLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Passwort</FormLabel>
                    <Link
                      href="/reset-password"
                      className="text-sm text-muted-foreground hover:text-primary"
                    >
                      Passwort vergessen?
                    </Link>
                  </div>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Dein Passwort"
                        autoComplete="current-password"
                        disabled={isLoading || isMagicLinkLoading}
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading || isMagicLinkLoading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="sr-only">
                          {showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                        </span>
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || isMagicLinkLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wird angemeldet...
                </>
              ) : (
                'Anmelden'
              )}
            </Button>
          </form>
        </Form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Oder weiter mit
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={handleMagicLink}
          disabled={isLoading || isMagicLinkLoading}
        >
          {isMagicLinkLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Magic Link wird gesendet...
            </>
          ) : (
            <>
              <Mail className="mr-2 h-4 w-4" />
              Magic Link per E-Mail
            </>
          )}
        </Button>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          Noch kein Konto?{' '}
          <Link href="/signup" className="text-primary hover:underline">
            Registrieren
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
