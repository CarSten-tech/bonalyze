import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { sendOperationalAlert } from '@/lib/alerting'
import { getRouteLogMeta, resolveCorrelationId, withCorrelationId } from '@/lib/request-tracing'

function sanitizeRedirectTo(value: string | null): string {
  if (!value) return '/dashboard'

  const candidate = value.trim()
  if (!candidate.startsWith('/')) return '/dashboard'
  if (candidate.startsWith('//')) return '/dashboard'
  if (candidate.startsWith('/\\')) return '/dashboard'

  return candidate
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const correlationId = resolveCorrelationId(request.headers)
  const route = 'auth/callback'
  const logMeta = getRouteLogMeta(route, correlationId)
  const code = searchParams.get('code')
  const redirectTo = sanitizeRedirectTo(searchParams.get('redirectTo'))

  const redirectWithCorrelation = (url: string) =>
    withCorrelationId(NextResponse.redirect(url), correlationId)

  try {
    if (code) {
      const cookieStore = await cookies()

      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll()
            },
            setAll(cookiesToSet) {
              try {
                cookiesToSet.forEach(({ name, value, options }) =>
                  cookieStore.set(name, value, options)
                )
              } catch {
                // The `setAll` method was called from a Server Component.
                // This can be ignored if you have middleware refreshing
                // user sessions.
              }
            },
          },
        }
      )

      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (!error) {
        // Check if user has a profile (for new signups, they might not)
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', user.id)
            .single()

          // If no profile or no display name, redirect to onboarding
          if (!profile?.display_name) {
            return redirectWithCorrelation(`${origin}/onboarding/profile`)
          }
        }

        return redirectWithCorrelation(`${origin}${redirectTo}`)
      }

      logger.error('[auth/callback] exchangeCodeForSession failed', error, logMeta)
      await sendOperationalAlert({
        route,
        severity: 'critical',
        message: 'Auth callback session exchange failed',
        correlationId,
      })
    }
  } catch (error) {
    logger.error('[auth/callback] unexpected error', error, logMeta)
    await sendOperationalAlert({
      route,
      severity: 'critical',
      message: 'Auth callback unexpected failure',
      correlationId,
    })
  }

  // Return the user to an error page with instructions
  return redirectWithCorrelation(`${origin}/login?error=auth_callback_failed`)
}
