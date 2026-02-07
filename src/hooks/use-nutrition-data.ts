'use client'

import { useState, useEffect, useCallback } from 'react'
import { useHousehold } from '@/contexts/household-context'
import { createClient } from '@/lib/supabase'
import { getDailyNutritionSummary, addNutritionLog, deleteNutritionLog } from '@/app/actions/nutrition'
import { format } from 'date-fns'

export interface NutritionLogEntry {
  id: string
  meal_type: string
  item_name: string | null
  calories_kcal: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  activity_name: string | null
  burned_calories_kcal: number | null
  duration_minutes: number | null
  fluid_ml: number | null
  receipt_item_id: string | null
  created_at: string
}

export interface DailyNutritionData {
  date: string
  targets: {
    calories: number
    protein: number
    carbs: number
    fat: number
    water: number
  }
  consumption: {
    calories: number
    protein: number
    carbs: number
    fat: number
  }
  activity: {
    totalBurned: number
    count: number
    logs: NutritionLogEntry[]
  }
  fluid: {
    totalMl: number
    logs: NutritionLogEntry[]
  }
  meals: Record<string, NutritionLogEntry[]>
  allLogs: NutritionLogEntry[]
}

interface UseNutritionDataReturn {
  data: DailyNutritionData | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  addLog: (logData: {
    meal_type: string
    item_name?: string
    calories_kcal?: number
    protein_g?: number
    carbs_g?: number
    fat_g?: number
    activity_name?: string
    burned_calories_kcal?: number
    duration_minutes?: number
    fluid_ml?: number
  }) => Promise<void>
  removeLog: (logId: string) => Promise<void>
}

export function useNutritionData(date: Date): UseNutritionDataReturn {
  const { currentHousehold } = useHousehold()
  const supabase = createClient()
  const [data, setData] = useState<DailyNutritionData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // Get current user
  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id || null)
    }
    getUser()
  }, [supabase])

  const dateStr = format(date, 'yyyy-MM-dd')

  const fetchData = useCallback(async () => {
    if (!currentHousehold || !userId) {
      setData(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await getDailyNutritionSummary(currentHousehold.id, userId, dateStr)
      setData(result as DailyNutritionData)
    } catch (err) {
      console.error('Error fetching nutrition data:', err)
      setError(err instanceof Error ? err.message : 'Fehler beim Laden')
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [currentHousehold, userId, dateStr])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const addLog = useCallback(async (logData: {
    meal_type: string
    item_name?: string
    calories_kcal?: number
    protein_g?: number
    carbs_g?: number
    fat_g?: number
    activity_name?: string
    burned_calories_kcal?: number
    duration_minutes?: number
    fluid_ml?: number
  }) => {
    if (!currentHousehold) return

    await addNutritionLog({
      household_id: currentHousehold.id,
      log_date: dateStr,
      ...logData,
    })
    await fetchData()
  }, [currentHousehold, dateStr, fetchData])

  const removeLog = useCallback(async (logId: string) => {
    await deleteNutritionLog(logId)
    await fetchData()
  }, [fetchData])

  return { data, isLoading, error, refresh: fetchData, addLog, removeLog }
}
