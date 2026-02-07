'use client'

import { useState, useEffect, useCallback } from 'react'
import { useHousehold } from '@/contexts/household-context'
import { getSupplyRange } from '@/app/actions/nutrition'

export interface SupplyRangeData {
  totalCaloriesPurchased: number
  totalProteinG: number
  totalCarbsG: number
  totalFatG: number
  dailyHouseholdBurn: number
  coverageDays: number
  memberCount: number
  foodItemCount: number
  hasProfiles: boolean
}

interface UseSupplyRangeReturn {
  data: SupplyRangeData | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useSupplyRange(daysLookback = 30): UseSupplyRangeReturn {
  const { currentHousehold } = useHousehold()
  const [data, setData] = useState<SupplyRangeData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!currentHousehold) {
      setData(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await getSupplyRange(currentHousehold.id, daysLookback)
      setData(result)
    } catch (err) {
      console.error('Error fetching supply range:', err)
      setError(err instanceof Error ? err.message : 'Fehler beim Laden')
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [currentHousehold, daysLookback])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refresh: fetchData }
}
