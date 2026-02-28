'use client'

import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'

import { getInsightsData } from '@/app/actions/insights'
import type { InsightsData } from '@/types/insights'

interface UseInsightsDataOptions {
  householdId: string | null
  year: number
  month: number
}

interface UseInsightsDataResult {
  data: InsightsData | null
  isLoading: boolean
  error: string | null
  refresh: () => void
}

/**
 * Hook to fetch real insights data for a specific household month.
 */
export function useInsightsData({
  householdId,
  year,
  month,
}: UseInsightsDataOptions): UseInsightsDataResult {
  const query = useQuery({
    queryKey: ['insights', householdId, year, month],
    queryFn: () =>
      getInsightsData({
        householdId: householdId!,
        year,
        month,
      }),
    enabled: Boolean(householdId),
    staleTime: 5 * 60 * 1000,
  })

  const refresh = useCallback(() => {
    void query.refetch()
  }, [query])

  return {
    data: query.data ?? null,
    isLoading: query.isLoading || query.isFetching,
    error: query.error
      ? query.error instanceof Error
        ? query.error.message
        : 'Insights konnten nicht geladen werden.'
      : null,
    refresh,
  }
}

export default useInsightsData
