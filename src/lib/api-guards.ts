import { NextRequest, NextResponse } from 'next/server'
import { z, type ZodType } from 'zod'
import { createServerClient } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'

type ServerClient = Awaited<ReturnType<typeof createServerClient>>

interface AuthenticatedContext {
  supabase: ServerClient
  userId: string
}

interface AuthenticatedResultSuccess {
  ok: true
  context: AuthenticatedContext
}

interface AuthenticatedResultFailure {
  ok: false
  response: NextResponse
}

type AuthenticatedResult = AuthenticatedResultSuccess | AuthenticatedResultFailure

interface JsonBodySuccess<T> {
  ok: true
  data: T
}

interface JsonBodyFailure {
  ok: false
  response: NextResponse
}

type JsonBodyResult<T> = JsonBodySuccess<T> | JsonBodyFailure

export interface StandardApiErrorBody {
  success: false
  error: string
  message: string
  details?: unknown
}

export function createApiErrorResponse(
  code: string,
  message: string,
  status: number,
  details?: unknown
): NextResponse<StandardApiErrorBody> {
  return NextResponse.json(
    {
      success: false,
      error: code,
      message,
      ...(details ? { details } : {}),
    },
    { status }
  )
}

export function mbToBytes(sizeMb: number): number {
  return Math.floor(sizeMb * 1024 * 1024)
}

function getByteLength(input: string): number {
  return new TextEncoder().encode(input).length
}

export function enforceContentLength(
  request: NextRequest,
  maxBytes: number,
  message = 'Payload zu gross.'
): NextResponse | null {
  const contentLengthHeader = request.headers.get('content-length')
  if (!contentLengthHeader) return null

  const contentLength = Number.parseInt(contentLengthHeader, 10)
  if (!Number.isFinite(contentLength) || contentLength < 0) {
    return createApiErrorResponse('INVALID_CONTENT_LENGTH', 'Ungueltiger Content-Length Header.', 400)
  }

  if (contentLength > maxBytes) {
    return createApiErrorResponse('PAYLOAD_TOO_LARGE', message, 413)
  }

  return null
}

export async function requireAuthenticatedUser(routeTag: string): Promise<AuthenticatedResult> {
  const supabase = await createServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    logger.warn(`[${routeTag}] unauthorized`, { authError: authError?.message || null })
    return {
      ok: false,
      response: createApiErrorResponse('UNAUTHORIZED', 'Nicht eingeloggt', 401),
    }
  }

  return {
    ok: true,
    context: {
      supabase,
      userId: user.id,
    },
  }
}

export async function requireHouseholdMembership(
  supabase: ServerClient,
  userId: string,
  householdId: string,
  routeTag: string
): Promise<NextResponse | null> {
  const { data: membership, error } = await supabase
    .from('household_members')
    .select('id')
    .eq('household_id', householdId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!membership || error) {
    logger.warn(`[${routeTag}] household access denied`, {
      householdId,
      userId,
      error: error?.message || null,
    })
    return createApiErrorResponse('FORBIDDEN', 'Kein Zugriff auf diesen Haushalt', 403)
  }

  return null
}

export async function parseJsonBodyWithLimit<T>(
  request: NextRequest,
  schema: ZodType<T>,
  maxBytes: number
): Promise<JsonBodyResult<T>> {
  const tooLarge = enforceContentLength(request, maxBytes)
  if (tooLarge) {
    return { ok: false, response: tooLarge }
  }

  let rawBody: string
  try {
    rawBody = await request.text()
  } catch {
    return {
      ok: false,
      response: createApiErrorResponse('INVALID_REQUEST_BODY', 'Request-Body konnte nicht gelesen werden.', 400),
    }
  }

  if (getByteLength(rawBody) > maxBytes) {
    return {
      ok: false,
      response: createApiErrorResponse('PAYLOAD_TOO_LARGE', 'Payload zu gross.', 413),
    }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(rawBody)
  } catch {
    return {
      ok: false,
      response: createApiErrorResponse('INVALID_JSON', 'Ungueltiges JSON.', 400),
    }
  }

  const validated = schema.safeParse(parsed)
  if (!validated.success) {
    const issue = validated.error.issues[0]
    return {
      ok: false,
      response: createApiErrorResponse(
        'INVALID_REQUEST',
        issue?.message || 'Ungueltige Eingabedaten.',
        400,
        issue ? { path: issue.path } : undefined
      ),
    }
  }

  return {
    ok: true,
    data: validated.data,
  }
}

export const uuidParamSchema = z.string().uuid('Ungueltige UUID.')
