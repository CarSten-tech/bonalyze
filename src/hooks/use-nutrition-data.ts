'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
  group_id: string | null
  group_name: string | null
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

type AddLogInput = {
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
  group_id?: string
  group_name?: string
  receipt_item_id?: string
}

interface UseNutritionDataReturn {
  data: DailyNutritionData | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  addLog: (logData: AddLogInput) => Promise<void>
  removeLog: (logId: string) => Promise<void>
}

const FOOD_MEAL_TYPES = ['fruehstueck', 'mittagessen', 'abendessen', 'snacks']

function recalculateTotals(data: DailyNutritionData): DailyNutritionData {
  const foodLogs = FOOD_MEAL_TYPES.flatMap(type => data.meals[type] || [])
  return {
    ...data,
    consumption: {
      calories: foodLogs.reduce((sum, l) => sum + (l.calories_kcal || 0), 0),
      protein: Math.round(foodLogs.reduce((sum, l) => sum + Number(l.protein_g || 0), 0)),
      carbs: Math.round(foodLogs.reduce((sum, l) => sum + Number(l.carbs_g || 0), 0)),
      fat: Math.round(foodLogs.reduce((sum, l) => sum + Number(l.fat_g || 0), 0)),
    },
    activity: {
      ...data.activity,
      totalBurned: data.activity.logs.reduce((sum, l) => sum + (l.burned_calories_kcal || 0), 0),
      count: data.activity.logs.length,
    },
    fluid: {
      ...data.fluid,
      totalMl: data.fluid.logs.reduce((sum, l) => sum + (l.fluid_ml || 0), 0),
    },
  }
}

export function useNutritionData(date: Date): UseNutritionDataReturn {
  const { currentHousehold } = useHousehold()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id || null)
    }
    getUser()
  }, [supabase])

  const dateStr = format(date, 'yyyy-MM-dd')
  const queryKey = useMemo(
    () => ['nutrition_data', currentHousehold?.id, userId, dateStr],
    [currentHousehold?.id, userId, dateStr]
  )

  const query = useQuery({
    queryKey,
    queryFn: () => getDailyNutritionSummary(currentHousehold!.id, userId!, dateStr),
    enabled: !!currentHousehold && !!userId,
  })

  const addLogMutation = useMutation({
    mutationFn: async (logData: AddLogInput) => {
      const payload = {
        household_id: currentHousehold!.id,
        log_date: dateStr,
        ...logData,
      }

      if (!navigator.onLine) {
        // Queue for sync when online
        const { queueAction } = await import('@/lib/sync-queue')
        await queueAction('ADD_NUTRITION_LOG', payload)
        
        // Return a mock response to satisfy the mutation
        return {
          id: crypto.randomUUID(),
          ...payload,
          user_id: userId!,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_from_suggestion: false,
          suggestion_dismissed: false,
          receipt_item_id: null,
          group_id: logData.group_id || null,
          group_name: logData.group_name || null,
        }
      }

      return addNutritionLog(payload)
    },
    onMutate: async (logData) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<DailyNutritionData>(queryKey)

      const tempId = crypto.randomUUID()
      const tempEntry: NutritionLogEntry = {
        id: tempId,
        meal_type: logData.meal_type,
        item_name: logData.item_name || null,
        calories_kcal: logData.calories_kcal || 0,
        protein_g: logData.protein_g || 0,
        carbs_g: logData.carbs_g || 0,
        fat_g: logData.fat_g || 0,
        activity_name: logData.activity_name || null,
        burned_calories_kcal: logData.burned_calories_kcal || 0,
        duration_minutes: logData.duration_minutes || null,
        fluid_ml: logData.fluid_ml || 0,
        receipt_item_id: logData.receipt_item_id || null,
        group_id: logData.group_id || null,
        group_name: logData.group_name || null,
        created_at: new Date().toISOString(),
      }

      queryClient.setQueryData<DailyNutritionData>(queryKey, (old) => {
        if (!old) return old
        const updated = { ...old, allLogs: [...old.allLogs, tempEntry] }

        if (logData.meal_type === 'fluid') {
          updated.fluid = {
            ...old.fluid,
            logs: [...old.fluid.logs, tempEntry],
            totalMl: old.fluid.totalMl + (logData.fluid_ml || 0),
          }
        } else if (logData.meal_type === 'activity') {
          updated.activity = {
            ...old.activity,
            logs: [...old.activity.logs, tempEntry],
            totalBurned: old.activity.totalBurned + (logData.burned_calories_kcal || 0),
            count: old.activity.count + 1,
          }
        } else if (FOOD_MEAL_TYPES.includes(logData.meal_type)) {
          updated.meals = {
            ...old.meals,
            [logData.meal_type]: [...(old.meals[logData.meal_type] || []), tempEntry],
          }
          return recalculateTotals(updated)
        }
        return updated
      })

      return { previous, optimisticId: tempId }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  const removeLogMutation = useMutation({
    mutationFn: async (logId: string) => {
      if (!navigator.onLine) {
        const { queueAction } = await import('@/lib/sync-queue')
        await queueAction('DELETE_NUTRITION_LOG', logId)
        return
      }
      return deleteNutritionLog(logId)
    },
    onMutate: async (logId) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<DailyNutritionData>(queryKey)

      queryClient.setQueryData<DailyNutritionData>(queryKey, (old) => {
        if (!old) return old
        const updated = {
          ...old,
          allLogs: old.allLogs.filter(l => l.id !== logId),
          fluid: {
            ...old.fluid,
            logs: old.fluid.logs.filter(l => l.id !== logId),
          },
          activity: {
            ...old.activity,
            logs: old.activity.logs.filter(l => l.id !== logId),
          },
          meals: Object.fromEntries(
            Object.entries(old.meals).map(([key, entries]) => [
              key,
              entries.filter(l => l.id !== logId),
            ])
          ),
        }
        return recalculateTotals(updated)
      })

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey })
  }, [queryClient, queryKey])

  const addLog = useCallback(
    async (logData: AddLogInput) => {
      await addLogMutation.mutateAsync(logData)
    },
    [addLogMutation]
  )

  const removeLog = useCallback(
    async (logId: string) => {
      await removeLogMutation.mutateAsync(logId)
    },
    [removeLogMutation]
  )

  return {
    data: (query.data as DailyNutritionData) ?? null,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refresh,
    addLog,
    removeLog,
  }
}
