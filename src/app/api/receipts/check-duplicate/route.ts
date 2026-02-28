import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import {
  createApiErrorResponse,
  mbToBytes,
  parseJsonBodyWithLimit,
  requireAuthenticatedUser,
  requireHouseholdMembership,
} from '@/lib/api-guards'
import { normalizeProductName } from '@/lib/receipt-normalization'
import { getRouteLogMeta, resolveCorrelationId, withCorrelationId } from '@/lib/request-tracing'
import { logger } from '@/lib/logger'

const MAX_BODY_BYTES = mbToBytes(0.15)

const duplicateCheckSchema = z.object({
  householdId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  merchantId: z.string().uuid().nullable().optional(),
  totalAmountCents: z.number().int().min(1),
  itemNames: z.array(z.string().min(1)).default([]),
  excludeReceiptId: z.string().uuid().optional(),
})

interface CandidateItem {
  product_name: string
}

function dateDiffDays(aIso: string, bIso: string): number {
  const a = new Date(`${aIso}T00:00:00Z`).getTime()
  const b = new Date(`${bIso}T00:00:00Z`).getTime()
  return Math.round(Math.abs(a - b) / (1000 * 60 * 60 * 24))
}

function overlapScore(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0
  const aSet = new Set(a)
  const bSet = new Set(b)
  const intersection = [...aSet].filter((entry) => bSet.has(entry)).length
  const union = new Set([...aSet, ...bSet]).size
  if (union === 0) return 0
  return Math.round((intersection / union) * 100)
}

export async function POST(request: NextRequest) {
  const correlationId = resolveCorrelationId(request.headers)
  const route = 'api/receipts/check-duplicate'
  const logMeta = getRouteLogMeta(route, correlationId)
  const respond = (body: unknown, init?: ResponseInit) =>
    withCorrelationId(NextResponse.json(body, init), correlationId)

  try {
    const auth = await requireAuthenticatedUser('receipts/check-duplicate')
    if (!auth.ok) return withCorrelationId(auth.response, correlationId)

    const {
      context: { supabase, userId },
    } = auth

    const parsedBody = await parseJsonBodyWithLimit(request, duplicateCheckSchema, MAX_BODY_BYTES)
    if (!parsedBody.ok) return withCorrelationId(parsedBody.response, correlationId)

    const {
      householdId,
      date,
      merchantId,
      totalAmountCents,
      itemNames,
      excludeReceiptId,
    } = parsedBody.data

    const membershipResponse = await requireHouseholdMembership(
      supabase,
      userId,
      householdId,
      'receipts/check-duplicate'
    )
    if (membershipResponse) return withCorrelationId(membershipResponse, correlationId)

    let query = supabase
      .from('receipts')
      .select(`
        id,
        date,
        total_amount_cents,
        merchant_id,
        merchants (
          name
        ),
        receipt_items (
          product_name
        )
      `)
      .eq('household_id', householdId)
      .eq('total_amount_cents', totalAmountCents)
      .limit(30)

    if (merchantId) {
      query = query.eq('merchant_id', merchantId)
    }

    const { data: rows, error } = await query

    if (error) {
      logger.error('[receipts/check-duplicate] query failed', error, logMeta)
      return withCorrelationId(
        createApiErrorResponse('DUPLICATE_CHECK_FAILED', 'Duplikatpruefung fehlgeschlagen.', 500),
        correlationId
      )
    }

    const normalizedInputItems = itemNames.map((name) => normalizeProductName(name)).filter(Boolean)

    const candidates = (rows || [])
      .filter((row) => row.id !== excludeReceiptId)
      .map((row) => {
        const dateDelta = dateDiffDays(row.date, date)
        const candidateItems = ((row.receipt_items || []) as CandidateItem[])
          .map((item) => normalizeProductName(item.product_name))
          .filter(Boolean)

        const isExactMerchantMatch = merchantId
          ? row.merchant_id === merchantId
          : row.merchant_id === null

        const itemScore = overlapScore(normalizedInputItems, candidateItems)

        let score = 0
        if (isExactMerchantMatch) score += 35
        if (dateDelta === 0) score += 35
        else if (dateDelta === 1) score += 20
        score += Math.round(itemScore * 0.3)

        const exactFingerprint = isExactMerchantMatch && dateDelta === 0

        return {
          id: row.id,
          date: row.date,
          merchantId: row.merchant_id,
          merchantName: (row.merchants as { name: string } | null)?.name || 'Unbekannt',
          totalAmountCents: row.total_amount_cents,
          score,
          dateDelta,
          itemOverlap: itemScore,
          exactFingerprint,
        }
      })
      .filter((candidate) => candidate.exactFingerprint || candidate.score >= 70)
      .sort((a, b) => b.score - a.score)

    return respond({
      success: true,
      isDuplicate: candidates.length > 0,
      duplicates: candidates.slice(0, 5),
    })
  } catch (error) {
    logger.error('[receipts/check-duplicate] unhandled error', error, logMeta)
    return withCorrelationId(
      createApiErrorResponse('SERVER_ERROR', 'Ein Fehler ist aufgetreten.', 500),
      correlationId
    )
  }
}
