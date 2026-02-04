import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import type { SettlementWithDetails, Transfer } from '@/types/settlement'

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
  try {
    const supabase = await createServerClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Nicht eingeloggt' },
        { status: 401 }
      )
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const householdId = searchParams.get('householdId')
    const filter = (searchParams.get('filter') || 'all') as 'all' | 'open' | 'settled'

    if (!householdId) {
      return NextResponse.json(
        { error: 'householdId ist erforderlich' },
        { status: 400 }
      )
    }

    // Verify user is member of household
    const { data: membership, error: membershipError } = await supabase
      .from('household_members')
      .select('id')
      .eq('household_id', householdId)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'Kein Zugriff auf diesen Haushalt' },
        { status: 403 }
      )
    }

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
      console.error('Error fetching settlements:', settlementsError)
      return NextResponse.json(
        { error: 'Fehler beim Laden der Abrechnungen' },
        { status: 500 }
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

    return NextResponse.json({
      settlements,
      tableExists: true,
    })
  } catch (error) {
    console.error('Settlement GET error:', error)
    return NextResponse.json(
      { error: 'Ein Fehler ist aufgetreten' },
      { status: 500 }
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
  try {
    const supabase = await createServerClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Nicht eingeloggt' },
        { status: 401 }
      )
    }

    // Parse body
    const body = await request.json()
    const {
      householdId,
      periodStart,
      periodEnd,
      totalAmountCents,
      transfers,
    } = body as {
      householdId: string
      periodStart: string
      periodEnd: string
      totalAmountCents: number
      transfers: Transfer[]
    }

    // Validate required fields
    if (!householdId || !periodStart || !periodEnd || totalAmountCents === undefined) {
      return NextResponse.json(
        { error: 'Fehlende Pflichtfelder' },
        { status: 400 }
      )
    }

    // Verify user is member of household
    const { data: membership, error: membershipError } = await supabase
      .from('household_members')
      .select('id')
      .eq('household_id', householdId)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'Kein Zugriff auf diesen Haushalt' },
        { status: 403 }
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
      return NextResponse.json(
        { error: 'Diese Periode wurde bereits abgerechnet' },
        { status: 409 }
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
        settled_by: user.id,
      })
      .select()
      .single()

    if (settlementError || !settlement) {
      console.error('Error creating settlement:', settlementError)
      return NextResponse.json(
        { error: 'Fehler beim Erstellen der Abrechnung' },
        { status: 500 }
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
        console.error('Error creating transfers:', transfersError)
        // Settlement was created, so we don't fail completely
        // But log the error
      }
    }

    return NextResponse.json({
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
    console.error('Settlement POST error:', error)
    return NextResponse.json(
      { error: 'Ein Fehler ist aufgetreten' },
      { status: 500 }
    )
  }
}
