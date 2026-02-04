'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useHousehold } from '@/contexts/household-context'
import {
  calculateSettlement,
  getCurrentMonth,
  parseMonthValue,
} from '@/lib/settlement-utils'
import type {
  SettlementResult,
  MonthOption,
  ReceiptsByPerson,
} from '@/types/settlement'

interface UseSettlementOptions {
  monthValue?: string // Format: 'YYYY-MM'
}

interface UseSettlementReturn {
  settlement: SettlementResult | null
  receiptsByPerson: ReceiptsByPerson[]
  isLoading: boolean
  error: string | null
  selectedMonth: MonthOption
  setSelectedMonth: (month: MonthOption) => void
  refresh: () => Promise<void>
  markAsSettled: () => Promise<boolean>
  isMarkingSettled: boolean
  settlementTableReady: boolean
}

export function useSettlement(
  options: UseSettlementOptions = {}
): UseSettlementReturn {
  const { currentHousehold } = useHousehold()
  const supabase = createClient()

  // State
  const [settlement, setSettlement] = useState<SettlementResult | null>(null)
  const [receiptsByPerson, setReceiptsByPerson] = useState<ReceiptsByPerson[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMarkingSettled, setIsMarkingSettled] = useState(false)
  const [settlementTableReady, setSettlementTableReady] = useState(false)

  // Initialize selected month from options or current month
  const initialMonth = options.monthValue
    ? parseMonthValue(options.monthValue) || getCurrentMonth()
    : getCurrentMonth()
  const [selectedMonth, setSelectedMonth] = useState<MonthOption>(initialMonth)

  // Fetch settlement data
  const fetchSettlement = useCallback(async () => {
    if (!currentHousehold) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // 1. Fetch household members with their profiles
      const { data: membersData, error: membersError } = await supabase
        .from('household_members')
        .select(
          `
          user_id,
          profiles (
            id,
            display_name,
            avatar_url
          )
        `
        )
        .eq('household_id', currentHousehold.id)

      if (membersError) throw membersError

      // Transform members data
      const members = (membersData || [])
        .filter((m) => m.profiles)
        .map((m) => ({
          userId: m.user_id,
          displayName: (m.profiles as { display_name: string }).display_name,
          avatarUrl: (m.profiles as { avatar_url: string | null }).avatar_url,
        }))

      // 2. Fetch receipts for the selected period
      const { data: receiptsData, error: receiptsError } = await supabase
        .from('receipts')
        .select(
          `
          id,
          date,
          total_amount_cents,
          created_by,
          merchants (
            name
          )
        `
        )
        .eq('household_id', currentHousehold.id)
        .gte('date', selectedMonth.start)
        .lte('date', selectedMonth.end)
        .order('date', { ascending: false })

      if (receiptsError) throw receiptsError

      // Transform receipts for calculation
      const receipts = (receiptsData || []).map((r) => ({
        id: r.id,
        totalAmountCents: r.total_amount_cents,
        paidByUserId: r.created_by,
        date: r.date,
        merchantName: (r.merchants as { name: string } | null)?.name || null,
      }))

      // 3. Calculate settlement
      const result = calculateSettlement(
        receipts,
        members,
        selectedMonth.start,
        selectedMonth.end,
        selectedMonth.label
      )

      setSettlement(result)

      // 4. Group receipts by person for drill-down
      const grouped: ReceiptsByPerson[] = members.map((member) => {
        const memberReceipts = receipts
          .filter((r) => r.paidByUserId === member.userId)
          .map((r) => ({
            id: r.id,
            date: r.date,
            totalAmountCents: r.totalAmountCents,
            merchantName: r.merchantName,
            paidByUserId: member.userId,
            paidByDisplayName: member.displayName,
          }))

        return {
          userId: member.userId,
          displayName: member.displayName,
          avatarUrl: member.avatarUrl,
          totalPaid: memberReceipts.reduce((sum, r) => sum + r.totalAmountCents, 0),
          receipts: memberReceipts,
        }
      })

      // Filter out persons with no receipts and sort by total paid descending
      const filteredGrouped = grouped
        .filter((g) => g.receipts.length > 0)
        .sort((a, b) => b.totalPaid - a.totalPaid)

      setReceiptsByPerson(filteredGrouped)
    } catch (err) {
      console.error('Error fetching settlement:', err)
      setError('Fehler beim Laden der Abrechnungsdaten')
    } finally {
      setIsLoading(false)
    }
  }, [currentHousehold, selectedMonth, supabase])

  // Mark settlement as settled
  // Note: This requires the settlements table to exist in the database
  // The Backend Developer needs to create the migration first
  const markAsSettled = useCallback(async (): Promise<boolean> => {
    if (!currentHousehold || !settlement) return false

    setIsMarkingSettled(true)
    setError(null)

    try {
      // Try to insert into settlements table
      // This will fail gracefully if the table doesn't exist yet
      const response = await fetch('/api/settlements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          householdId: currentHousehold.id,
          periodStart: settlement.period.start,
          periodEnd: settlement.period.end,
          totalAmountCents: settlement.totalSpent,
          transfers: settlement.transfers,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))

        // Check if it's a "table not found" error
        if (response.status === 501 || errorData.code === 'TABLE_NOT_FOUND') {
          setError('Die Settlement-Funktion ist noch nicht verfügbar. Backend-Migration erforderlich.')
          setSettlementTableReady(false)
          return false
        }

        throw new Error(errorData.message || 'Fehler beim Speichern')
      }

      setSettlementTableReady(true)
      return true
    } catch (err) {
      console.error('Error marking settlement as settled:', err)
      // For now, show a user-friendly message since the API doesn't exist yet
      setError('Diese Funktion ist noch nicht verfügbar. Die Abrechnung wurde nicht gespeichert.')
      return false
    } finally {
      setIsMarkingSettled(false)
    }
  }, [currentHousehold, settlement])

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchSettlement()
  }, [fetchSettlement])

  return {
    settlement,
    receiptsByPerson,
    isLoading,
    error,
    selectedMonth,
    setSelectedMonth,
    refresh: fetchSettlement,
    markAsSettled,
    isMarkingSettled,
    settlementTableReady,
  }
}
