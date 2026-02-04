'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
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

const signupSchema = z.object({
  email: z.string().email('Bitte gib eine gueltige E-Mail-Adresse ein'),
  password: z.string().min(8, 'Passwort muss mindestens 8 Zeichen haben'),
  confirmPassword: z.string().min(1, 'Bitte bestatige dein Passwort'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwoerter stimmen nicht ueberein',
  path: ['confirmPassword'],
})

type SignupFormData = z.infer<typeof signupSchema>

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isMagicLinkLoading, setIsMagicLinkLoading] = useState(false)

  const supabase = createClient()

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true)

    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=/onboarding/profile`,
      },
    })

    if (error) {
      toast.error('Registrierung fehlgeschlagen', {
        description: error.message,
      })
      setIsLoading(false)
      return
    }

    // Check if email confirmation is required
    if (authData.user && !authData.session) {
      toast.success('Registrierung erfolgreich', {
        description: 'Bitte bestatige deine E-Mail-Adresse',
      })
      window.location.href = `/verify?email=${encodeURIComponent(data.email)}`
    } else if (authData.session) {
      // If email confirmation is disabled, redirect to onboarding
      toast.success('Willkommen bei Bonalyze!')
      window.location.href = '/onboarding/profile'
    } else {
      toast.error('Registrierung fehlgeschlagen', {
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
        emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=/onboarding/profile`,
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

    window.location.href = `/verify?email=${encodeURIComponent(email)}`
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Registrieren</CardTitle>
        <CardDescription className="text-center">
          Erstelle ein neues Konto
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
                  <FormLabel>Passwort</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Mindestens 8 Zeichen"
                        autoComplete="new-password"
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
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Passwort bestaetigen</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Passwort wiederholen"
                        autoComplete="new-password"
                        disabled={isLoading || isMagicLinkLoading}
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        disabled={isLoading || isMagicLinkLoading}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="sr-only">
                          {showConfirmPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
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
                  Wird registriert...
                </>
              ) : (
                'Registrieren'
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
          Bereits ein Konto?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Anmelden
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
