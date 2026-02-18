import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import type { SettlementWithDetails } from '@/types/settlement'
import { logger } from '@/lib/logger'
import { sendOperationalAlert } from '@/lib/alerting'
import {
  createApiErrorResponse,
  mbToBytes,
  parseJsonBodyWithLimit,
  requireAuthenticatedUser,
  requireHouseholdMembership,
} from '@/lib/api-guards'
import { getRouteLogMeta, resolveCorrelationId, withCorrelationId } from '@/lib/request-tracing'
import { assertUserHouseholdPermission } from '@/lib/household-roles'
import { writeAuditLog } from '@/lib/audit-log'

const MAX_SETTLEMENT_POST_BODY_BYTES = mbToBytes(0.2)
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const settlementsGetSchema = z.object({
  householdId: z.string().uuid(),
  filter: z.enum(['all', 'open', 'settled']).default('all'),
})
const settlementsPostSchema = z.object({
  householdId: z.string().uuid(),
  periodStart: isoDateSchema,
  periodEnd: isoDateSchema,
  totalAmountCents: z.number().int().min(0),
  transfers: z
    .array(
      z.object({
        fromUserId: z.string().uuid(),
        toUserId: z.string().uuid(),
        amount: z.number().int().min(1),
      })
    )
    .optional()
    .default([]),
})

/**
 * GET /api/settlements
 *
 * Fetch settlement history for a household
 *
 * Query params:
 * - householdId: string (required)
 * - filter: 'all' | 'open' | 'settled' (default: 'all')
 */
export async function GET(request: NextRequest) {
  const correlationId = resolveCorrelationId(request.headers)
  const route = 'api/settlements[GET]'
  const logMeta = getRouteLogMeta(route, correlationId)
  const respond = (body: unknown, init?: ResponseInit) =>
    withCorrelationId(NextResponse.json(body, init), correlationId)

  try {
    const auth = await requireAuthenticatedUser('settlements[GET]')
    if (!auth.ok) return withCorrelationId(auth.response, correlationId)
    const {
      context: { supabase, userId },
    } = auth

    // Parse query params
    const { searchParams } = new URL(request.url)
    const parsedQuery = settlementsGetSchema.safeParse({
      householdId: searchParams.get('householdId'),
      filter: searchParams.get('filter') || 'all',
    })
    if (!parsedQuery.success) {
      return withCorrelationId(
        createApiErrorResponse(
          'INVALID_QUERY',
          parsedQuery.error.issues[0]?.message || 'Ungueltige Anfrageparameter',
          400
        ),
        correlationId
      )
    }
    const { householdId, filter } = parsedQuery.data

    const membershipResponse = await requireHouseholdMembership(
      supabase,
      userId,
      householdId,
      'settlements[GET]'
    )
    if (membershipResponse) return withCorrelationId(membershipResponse, correlationId)

    // Build query
    let query = supabase
      .from('settlements')
      .select(`
        id,
        household_id,
        period_start,
        period_end,
        total_amount_cents,
        settled_at,
        created_at,
        settlement_transfers (
          id,
          from_user_id,
          to_user_id,
          amount_cents
        )
      `)
      .eq('household_id', householdId)
      .order('period_start', { ascending: false })

    // Apply filter
    if (filter === 'open') {
      query = query.is('settled_at', null)
    } else if (filter === 'settled') {
      query = query.not('settled_at', 'is', null)
    }

    const { data: settlementsData, error: settlementsError } = await query

    if (settlementsError) {
      logger.error('[settlements] Error fetching settlements', settlementsError, logMeta)
      await sendOperationalAlert({
        route,
        severity: 'critical',
        message: 'Failed to fetch settlements',
        correlationId,
      })
      return withCorrelationId(
        createApiErrorResponse('SETTLEMENTS_FETCH_FAILED', 'Fehler beim Laden der Abrechnungen', 500),
        correlationId
      )
    }

    // Transform to SettlementWithDetails
    const settlements: SettlementWithDetails[] = (settlementsData || []).map((s) => {
      const periodStart = parseISO(s.period_start)
      const periodLabel = format(periodStart, 'MMMM yyyy', { locale: de })
      const isSettled = s.settled_at !== null

      // Create transfer summary
      const transferCount = s.settlement_transfers?.length || 0
      const transferSummary = transferCount === 0
        ? 'Keine Transfers'
        : transferCount === 1
          ? '1 Transfer'
          : `${transferCount} Transfers`

      return {
        id: s.id,
        householdId: s.household_id,
        periodStart: s.period_start,
        periodEnd: s.period_end,
        totalAmountCents: s.total_amount_cents,
        settledAt: s.settled_at,
        createdAt: s.created_at,
        periodLabel,
        transferSummary,
        isSettled,
      }
    })

    return respond({
      settlements,
      tableExists: true,
    })
  } catch (error) {
    logger.error('[settlements] Settlement GET error', error, logMeta)
    await sendOperationalAlert({
      route,
      severity: 'critical',
      message: 'Unhandled settlements GET failure',
      correlationId,
    })
    return withCorrelationId(
      createApiErrorResponse('SERVER_ERROR', 'Ein Fehler ist aufgetreten', 500),
      correlationId
    )
  }
}

/**
 * POST /api/settlements
 *
 * Create a new settlement (mark period as settled)
 *
 * Body:
 * - householdId: string
 * - periodStart: string (ISO date)
 * - periodEnd: string (ISO date)
 * - totalAmountCents: number
 * - transfers: Transfer[]
 */
export async function POST(request: NextRequest) {
  const correlationId = resolveCorrelationId(request.headers)
  const route = 'api/settlements[POST]'
  const logMeta = getRouteLogMeta(route, correlationId)
  const respond = (body: unknown, init?: ResponseInit) =>
    withCorrelationId(NextResponse.json(body, init), correlationId)

  try {
    const auth = await requireAuthenticatedUser('settlements[POST]')
    if (!auth.ok) return withCorrelationId(auth.response, correlationId)
    const {
      context: { supabase, userId },
    } = auth

    const parsedBody = await parseJsonBodyWithLimit(
      request,
      settlementsPostSchema,
      MAX_SETTLEMENT_POST_BODY_BYTES
    )
    if (!parsedBody.ok) return withCorrelationId(parsedBody.response, correlationId)

    const {
      householdId,
      periodStart,
      periodEnd,
      totalAmountCents,
      transfers,
    } = parsedBody.data

    const membershipResponse = await requireHouseholdMembership(
      supabase,
      userId,
      householdId,
      'settlements[POST]'
    )
    if (membershipResponse) return withCorrelationId(membershipResponse, correlationId)

    const permission = await assertUserHouseholdPermission(userId, householdId, 'settlements.manage')
    if (!permission.allowed) {
      return withCorrelationId(
        createApiErrorResponse('FORBIDDEN', 'Keine Berechtigung zum Erstellen von Abrechnungen.', 403),
        correlationId
      )
    }

    // Check if a settlement already exists for this period
    const { data: existing } = await supabase
      .from('settlements')
      .select('id')
      .eq('household_id', householdId)
      .eq('period_start', periodStart)
      .eq('period_end', periodEnd)
      .single()

    if (existing) {
      return withCorrelationId(
        createApiErrorResponse('SETTLEMENT_ALREADY_EXISTS', 'Diese Periode wurde bereits abgerechnet', 409),
        correlationId
      )
    }

    // Create settlement
    const { data: settlement, error: settlementError } = await supabase
      .from('settlements')
      .insert({
        household_id: householdId,
        period_start: periodStart,
        period_end: periodEnd,
        total_amount_cents: totalAmountCents,
        settled_at: new Date().toISOString(),
        settled_by: userId,
      })
      .select()
      .single()

    if (settlementError || !settlement) {
      logger.error('[settlements] Error creating settlement', settlementError, logMeta)
      await sendOperationalAlert({
        route,
        severity: 'critical',
        message: 'Failed to create settlement',
        correlationId,
      })
      return withCorrelationId(
        createApiErrorResponse('SETTLEMENT_CREATE_FAILED', 'Fehler beim Erstellen der Abrechnung', 500),
        correlationId
      )
    }

    // Create settlement transfers if any
    if (transfers && transfers.length > 0) {
      const transfersToInsert = transfers.map((t) => ({
        settlement_id: settlement.id,
        from_user_id: t.fromUserId,
        to_user_id: t.toUserId,
        amount_cents: t.amount,
      }))

      const { error: transfersError } = await supabase
        .from('settlement_transfers')
        .insert(transfersToInsert)

      if (transfersError) {
        logger.error('[settlements] Error creating transfers', transfersError, logMeta)
        // Settlement was created, so we don't fail completely
        // But log the error
      }
    }

    await writeAuditLog({
      householdId,
      actorUserId: userId,
      action: 'create',
      entityType: 'settlement',
      entityId: settlement.id,
      details: {
        periodStart,
        periodEnd,
        totalAmountCents,
        transferCount: transfers?.length || 0,
      },
    })

    return respond({
      success: true,
      settlement: {
        id: settlement.id,
        householdId: settlement.household_id,
        periodStart: settlement.period_start,
        periodEnd: settlement.period_end,
        totalAmountCents: settlement.total_amount_cents,
        settledAt: settlement.settled_at,
        createdAt: settlement.created_at,
      },
    })
  } catch (error) {
    logger.error('[settlements] Settlement POST error', error, logMeta)
    await sendOperationalAlert({
      route,
      severity: 'critical',
      message: 'Unhandled settlements POST failure',
      correlationId,
    })
    return withCorrelationId(
      createApiErrorResponse('SERVER_ERROR', 'Ein Fehler ist aufgetreten', 500),
      correlationId
    )
  }
}
