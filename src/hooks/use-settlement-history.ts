'use client'

import { useState, useEffect, useCallback } from 'react'
import { useHousehold } from '@/contexts/household-context'
import type { SettlementWithDetails } from '@/types/settlement'

type HistoryFilter = 'all' | 'open' | 'settled'

interface UseSettlementHistoryReturn {
  settlements: SettlementWithDetails[]
  isLoading: boolean
  error: string | null
  filter: HistoryFilter
  setFilter: (filter: HistoryFilter) => void
  refresh: () => Promise<void>
  tableExists: boolean
}

export function useSettlementHistory(): UseSettlementHistoryReturn {
  const { currentHousehold } = useHousehold()

  const [settlements, setSettlements] = useState<SettlementWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<HistoryFilter>('all')
  const [tableExists, setTableExists] = useState(false)

  const fetchHistory = useCallback(async () => {
    if (!currentHousehold) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Fetch settlement history from API
      // The API will return empty if the table doesn't exist
      const params = new URLSearchParams({
        householdId: currentHousehold.id,
        filter,
      })

      const response = await fetch(`/api/settlements?${params}`)

      if (!response.ok) {
        // Check if it's a "not implemented" error
        if (response.status === 501) {
          setTableExists(false)
          setSettlements([])
          setIsLoading(false)
          return
        }

        throw new Error('Fehler beim Laden der Historie')
      }

      const data = await response.json()

      if (data.tableExists === false) {
        setTableExists(false)
        setSettlements([])
      } else {
        setTableExists(true)
        setSettlements(data.settlements || [])
      }
    } catch (err) {
      console.error('Error fetching settlement history:', err)
      // Don't show error for expected "not implemented" case
      setTableExists(false)
      setSettlements([])
    } finally {
      setIsLoading(false)
    }
  }, [currentHousehold, filter])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  return {
    settlements,
    isLoading,
    error,
    filter,
    setFilter,
    refresh: fetchHistory,
    tableExists,
  }
}
