'use client'

import { useState, useEffect, useCallback } from 'react'
import { useHousehold } from '@/contexts/household-context'
import { getNutritionDeficitStats } from '@/app/actions/nutrition'
import { createClient } from '@/lib/supabase'

export interface NutritionDeficitData {
  dailyDeficit: number
  totalDeficit: number
  tdee: number
  daysTracked: number
}

interface UseNutritionDeficitReturn {
  data: NutritionDeficitData | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useNutritionDeficit(date: Date): UseNutritionDeficitReturn {
  const { currentHousehold } = useHousehold()
  const [data, setData] = useState<NutritionDeficitData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id || null)
    })
  }, [])

  const fetchData = useCallback(async () => {
    if (!currentHousehold || !userId) {
      if (currentHousehold && !userId) {
        // Still loading user
        return
      }
      setData(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const dateStr = date.toISOString().split('T')[0]
      const result = await getNutritionDeficitStats(currentHousehold.id, userId, dateStr)
      setData(result)
    } catch (err) {
      console.error('Error fetching nutrition deficit:', err)
      setError(err instanceof Error ? err.message : 'Fehler beim Laden')
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [currentHousehold, userId, date])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refresh: fetchData }
}
