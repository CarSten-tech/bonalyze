import { NextResponse } from 'next/server'
import { isRateLimited } from '@/lib/rate-limit'
import { createAlexaLinkCodeForUser, getAlexaLinkStatus } from '@/lib/alexa/shopping-service'
import { logger } from '@/lib/logger'
import { createApiErrorResponse, requireAuthenticatedUser } from '@/lib/api-guards'

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_REQUESTS = 5

export const runtime = 'nodejs'

export async function GET() {
  try {
    const auth = await requireAuthenticatedUser('alexa/link-code[GET]')
    if (!auth.ok) return auth.response

    const status = await getAlexaLinkStatus(auth.context.userId)
    return NextResponse.json(status)
  } catch (error) {
    logger.error('[alexa/link-code][GET] error', error)
    return createApiErrorResponse('ALEXA_LINK_STATUS_FAILED', 'Status konnte nicht geladen werden', 500)
  }
}

export async function POST() {
  try {
    const auth = await requireAuthenticatedUser('alexa/link-code[POST]')
    if (!auth.ok) return auth.response
    const userId = auth.context.userId

    if (await isRateLimited(`alexa-link-code:${userId}`, RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW_MS)) {
      return createApiErrorResponse('RATE_LIMITED', 'Zu viele Anfragen. Bitte kurz warten.', 429)
    }

    const result = await createAlexaLinkCodeForUser(userId)

    return NextResponse.json({
      code: result.code,
      expiresAt: result.expiresAt,
      householdId: result.householdId,
      shoppingListId: result.shoppingListId,
    })
  } catch (error) {
    logger.error('[alexa/link-code][POST] error', error)
    const message = error instanceof Error ? error.message : 'Link-Code konnte nicht erstellt werden'
    return createApiErrorResponse('ALEXA_LINK_CODE_CREATE_FAILED', message, 500)
  }
}
