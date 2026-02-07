'use client'

import { useState, useEffect, useCallback } from 'react'
import { useHousehold } from '@/contexts/household-context'
import {
  getSmartSuggestions,
  logFromSuggestion as serverLogFromSuggestion,
  dismissSuggestion as serverDismissSuggestion,
} from '@/app/actions/nutrition'

export interface SmartSuggestion {
  receiptItemId: string
  productName: string
  estimatedCalories: number
  estimatedProtein: number
  estimatedCarbs: number
  estimatedFat: number
  merchantName: string
  receiptDate: string
  suggestedMealType: string
}

interface UseSmartSuggestionsReturn {
  suggestion: SmartSuggestion | null
  isLoading: boolean
  logSuggestion: (mealType: string) => Promise<void>
  dismissSuggestion: () => Promise<void>
}

export function useSmartSuggestions(): UseSmartSuggestionsReturn {
  const { currentHousehold } = useHousehold()
  const [suggestion, setSuggestion] = useState<SmartSuggestion | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchSuggestion = useCallback(async () => {
    if (!currentHousehold) {
      setSuggestion(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const result = await getSmartSuggestions(currentHousehold.id)
      setSuggestion(result)
    } catch (err) {
      console.error('Error fetching suggestions:', err)
      setSuggestion(null)
    } finally {
      setIsLoading(false)
    }
  }, [currentHousehold])

  useEffect(() => {
    fetchSuggestion()
  }, [fetchSuggestion])

  const logSuggestion = useCallback(async (mealType: string) => {
    if (!currentHousehold || !suggestion) return

    // Optimistic: clear suggestion immediately
    const current = suggestion
    setSuggestion(null)

    try {
      await serverLogFromSuggestion(currentHousehold.id, current.receiptItemId, mealType)
      // Fetch next suggestion
      await fetchSuggestion()
    } catch (err) {
      console.error('Error logging suggestion:', err)
      setSuggestion(current) // Rollback
    }
  }, [currentHousehold, suggestion, fetchSuggestion])

  const dismissSuggestion = useCallback(async () => {
    if (!currentHousehold || !suggestion) return

    const current = suggestion
    setSuggestion(null)

    try {
      await serverDismissSuggestion(currentHousehold.id, current.receiptItemId)
      await fetchSuggestion()
    } catch (err) {
      console.error('Error dismissing suggestion:', err)
      setSuggestion(current)
    }
  }, [currentHousehold, suggestion, fetchSuggestion])

  return { suggestion, isLoading, logSuggestion, dismissSuggestion }
}
