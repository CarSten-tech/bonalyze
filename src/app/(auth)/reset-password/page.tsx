'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { ArrowLeft, Loader2, Mail } from 'lucide-react'
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

const resetSchema = z.object({
  email: z.string().email('Bitte gib eine gueltige E-Mail-Adresse ein'),
})

type ResetFormData = z.infer<typeof resetSchema>

export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isEmailSent, setIsEmailSent] = useState(false)

  const supabase = createClient()

  const form = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      email: '',
    },
  })

  const onSubmit = async (data: ResetFormData) => {
    setIsLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/auth/callback?redirectTo=/update-password`,
    })

    if (error) {
      toast.error('E-Mail konnte nicht gesendet werden', {
        description: error.message,
      })
      setIsLoading(false)
      return
    }

    setIsEmailSent(true)
    toast.success('E-Mail gesendet', {
      description: 'Prüfe dein Postfach für den Reset-Link.',
    })
    setIsLoading(false)
  }

  if (isEmailSent) {
    return (
      <Card>
        <CardHeader className="space-y-1">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl text-center">E-Mail gesendet</CardTitle>
          <CardDescription className="text-center">
            Pruefe dein Postfach
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Wir haben einen Link zum Zuruecksetzen deines Passworts an
            </p>
            <p className="mt-1 font-medium">{form.getValues('email')}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              gesendet. Klicke auf den Link in der E-Mail, um ein neues Passwort zu setzen.
            </p>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setIsEmailSent(false)
              form.reset()
            }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Andere E-Mail verwenden
          </Button>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-primary"
          >
            Zurueck zur Anmeldung
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Passwort vergessen?</CardTitle>
        <CardDescription className="text-center">
          Gib deine E-Mail-Adresse ein und wir senden dir einen Link zum Zuruecksetzen
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
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
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
                  Wird gesendet...
                </>
              ) : (
                'Reset-Link senden'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Link
          href="/login"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurueck zur Anmeldung
        </Link>
      </CardFooter>
    </Card>
  )
}
