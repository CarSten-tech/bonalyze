'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Mail, MailCheck } from 'lucide-react'
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

export function VerifyContent() {
  const [isResending, setIsResending] = useState(false)
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''

  const supabase = createClient()

  const handleResend = async () => {
    if (!email) {
      toast.error('E-Mail-Adresse fehlt', {
        description: 'Bitte gehe zurück zur Anmeldeseite.',
      })
      return
    }

    setIsResending(true)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=/dashboard`,
      },
    })

    if (error) {
      toast.error('E-Mail konnte nicht gesendet werden', {
        description: error.message,
      })
      setIsResending(false)
      return
    }

    toast.success('E-Mail erneut gesendet', {
      description: 'Pruefe dein Postfach.',
    })
    setIsResending(false)
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <MailCheck className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl text-center">Pruefe dein Postfach</CardTitle>
        <CardDescription className="text-center">
          Wir haben dir einen Link gesendet
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-muted p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Wir haben einen Bestatigungslink an
          </p>
          <p className="mt-1 font-medium">{email || 'deine E-Mail-Adresse'}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            gesendet. Klicke auf den Link in der E-Mail, um fortzufahren.
          </p>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>Keine E-Mail erhalten?</p>
          <p className="mt-1">
            Pruefe deinen Spam-Ordner oder fordere eine neue E-Mail an.
          </p>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={handleResend}
          disabled={isResending || !email}
        >
          {isResending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Wird gesendet...
            </>
          ) : (
            <>
              <Mail className="mr-2 h-4 w-4" />
              E-Mail erneut senden
            </>
          )}
        </Button>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          Andere E-Mail verwenden?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Zurueck zur Anmeldung
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
