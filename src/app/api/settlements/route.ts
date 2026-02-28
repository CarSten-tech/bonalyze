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
        paidAmount: z.number().int().min(0).optional(),
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
        remaining_amount_cents,
        status,
        settled_at,
        created_at,
        settlement_transfers (
          id,
          from_user_id,
          to_user_id,
          amount_cents,
          paid_amount_cents
        )
      `)
      .eq('household_id', householdId)
      .order('period_start', { ascending: false })

    // Apply filter
    if (filter === 'open') {
      query = query.in('status', ['open', 'partial'])
    } else if (filter === 'settled') {
      query = query.eq('status', 'settled')
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
      const status = (s.status || (s.settled_at ? 'settled' : 'open')) as
        | 'open'
        | 'partial'
        | 'settled'
      const isSettled = status === 'settled'

      // Create transfer summary
      const transferCount = s.settlement_transfers?.length || 0
      const transferSummaryBase = transferCount === 0
        ? 'Keine Transfers'
        : transferCount === 1
          ? '1 Transfer'
          : `${transferCount} Transfers`
      const remainingFromTransfers = (s.settlement_transfers || []).reduce(
        (sum, transfer) => sum + Math.max(0, transfer.amount_cents - (transfer.paid_amount_cents || 0)),
        0
      )
      const remainingAmountCents = Math.max(
        0,
        typeof s.remaining_amount_cents === 'number'
          ? s.remaining_amount_cents
          : remainingFromTransfers
      )
      const transferSummary =
        remainingAmountCents > 0
          ? `${transferSummaryBase} · Rest ${new Intl.NumberFormat('de-DE', {
              style: 'currency',
              currency: 'EUR',
            }).format(remainingAmountCents / 100)}`
          : transferSummaryBase

      return {
        id: s.id,
        householdId: s.household_id,
        periodStart: s.period_start,
        periodEnd: s.period_end,
        totalAmountCents: s.total_amount_cents,
        remainingAmountCents,
        status,
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

    // Check if a settlement already exists for this period.
    // If yes, we update it (supports partial -> settled workflows).
    const { data: existing } = await supabase
      .from('settlements')
      .select('id')
      .eq('household_id', householdId)
      .eq('period_start', periodStart)
      .eq('period_end', periodEnd)
      .maybeSingle()

    const normalizedTransfers = (transfers || []).map((transfer) => {
      const paidAmount = Math.min(transfer.amount, Math.max(0, transfer.paidAmount ?? transfer.amount))
      return {
        ...transfer,
        paidAmount,
      }
    })

    const totalTransferAmount = normalizedTransfers.reduce((sum, transfer) => sum + transfer.amount, 0)
    const totalPaidAmount = normalizedTransfers.reduce((sum, transfer) => sum + transfer.paidAmount, 0)
    const remainingAmountCents = Math.max(0, totalTransferAmount - totalPaidAmount)
    const hasAnyPaid = totalPaidAmount > 0
    const status: 'open' | 'partial' | 'settled' =
      totalTransferAmount === 0 || remainingAmountCents === 0
        ? 'settled'
        : hasAnyPaid
          ? 'partial'
          : 'open'
    const settledAt = status === 'settled' ? new Date().toISOString() : null

    const settlementPayload = {
      household_id: householdId,
      period_start: periodStart,
      period_end: periodEnd,
      total_amount_cents: totalAmountCents,
      remaining_amount_cents: remainingAmountCents,
      status,
      settled_at: settledAt,
      settled_by: status === 'settled' ? userId : null,
    }

    const settlementMutation = existing
      ? supabase
          .from('settlements')
          .update(settlementPayload)
          .eq('id', existing.id)
      : supabase.from('settlements').insert(settlementPayload)

    const { data: settlement, error: settlementError } = await settlementMutation.select().single()

    if (settlementError || !settlement) {
      logger.error('[settlements] Error upserting settlement', settlementError, logMeta)
      await sendOperationalAlert({
        route,
        severity: 'critical',
        message: 'Failed to upsert settlement',
        correlationId,
      })
      return withCorrelationId(
        createApiErrorResponse('SETTLEMENT_UPSERT_FAILED', 'Fehler beim Speichern der Abrechnung', 500),
        correlationId
      )
    }

    // Reset and recreate transfers for this settlement snapshot.
    const { error: deleteTransfersError } = await supabase
      .from('settlement_transfers')
      .delete()
      .eq('settlement_id', settlement.id)

    if (deleteTransfersError) {
      logger.error('[settlements] Error resetting transfers', deleteTransfersError, logMeta)
    }

    // Create settlement transfers if any
    if (normalizedTransfers.length > 0) {
      const nowIso = new Date().toISOString()
      const transfersToInsert = normalizedTransfers.map((t) => ({
        settlement_id: settlement.id,
        from_user_id: t.fromUserId,
        to_user_id: t.toUserId,
        amount_cents: t.amount,
        paid_amount_cents: t.paidAmount,
        paid_at: t.paidAmount > 0 ? nowIso : null,
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
      action: existing ? 'update' : 'create',
      entityType: 'settlement',
      entityId: settlement.id,
      details: {
        periodStart,
        periodEnd,
        totalAmountCents,
        transferCount: normalizedTransfers.length,
        remainingAmountCents,
        status,
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
        remainingAmountCents: settlement.remaining_amount_cents || 0,
        status: settlement.status || status,
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
