import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { isRateLimited } from '@/lib/rate-limit'
import { createAlexaLinkCodeForUser, getAlexaLinkStatus } from '@/lib/alexa/shopping-service'

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_REQUESTS = 5

export const runtime = 'nodejs'

export async function GET() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })
    }

    const status = await getAlexaLinkStatus(user.id)
    return NextResponse.json(status)
  } catch (error) {
    console.error('[alexa/link-code][GET] error', error)
    return NextResponse.json({ error: 'Status konnte nicht geladen werden' }, { status: 500 })
  }
}

export async function POST() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })
    }

    if (isRateLimited(`alexa-link-code:${user.id}`, RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW_MS)) {
      return NextResponse.json(
        { error: 'Zu viele Anfragen. Bitte kurz warten.' },
        { status: 429 }
      )
    }

    const result = await createAlexaLinkCodeForUser(user.id)

    return NextResponse.json({
      code: result.code,
      expiresAt: result.expiresAt,
      householdId: result.householdId,
      shoppingListId: result.shoppingListId,
    })
  } catch (error) {
    console.error('[alexa/link-code][POST] error', error)
    return NextResponse.json({ error: 'Link-Code konnte nicht erstellt werden' }, { status: 500 })
  }
}
