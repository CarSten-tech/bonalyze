'use client'

import { useState, useMemo, useCallback } from 'react'

/**
 * Mock insights data for the Smart Insights page.
 * This provides static demo data until real calculations are implemented.
 */

export interface DaySpending {
  day: 'MO' | 'DI' | 'MI' | 'DO' | 'FR' | 'SA' | 'SO'
  percentage: number
  isHighlighted: boolean
}

export interface Tip {
  id: string
  icon: string
  title: string
  description: string
  iconBgColor: string
  iconColor: string
}

export interface InsightsData {
  /** Savings potential in cents */
  savingsPotentialCents: number
  /** Efficiency percentage change */
  efficiencyPercentage: number
  /** Is efficiency positive (good performance) */
  isEfficiencyPositive: boolean
  /** Best shopping days data */
  bestDays: DaySpending[]
  /** Best day description */
  bestDayDescription: string
  /** Retailer optimization insight */
  retailerOptimization: {
    title: string
    description: string
    savingsAmountCents: number
  }
  /** Category trend insight */
  categoryTrend: {
    title: string
    description: string
    emoji: string
  }
  /** Concrete tips */
  tips: Tip[]
}

interface UseInsightsDataOptions {
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
 * Hook to get insights data for a specific month.
 *
 * Currently returns mock data. Will be connected to real
 * calculations/RPCs in a future iteration.
 */
export function useInsightsData({
  year,
  month,
}: UseInsightsDataOptions): UseInsightsDataResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error] = useState<string | null>(null)

  const refresh = useCallback(() => {
    setIsLoading(true)
    // Simulate loading
    setTimeout(() => setIsLoading(false), 300)
  }, [])

  // Mock data based on month for some variation
  const data = useMemo<InsightsData>(() => {
    const monthSeed = month + year * 12

    return {
      savingsPotentialCents: 4200 + (monthSeed % 1000),
      efficiencyPercentage: 12 + (monthSeed % 8),
      isEfficiencyPositive: true,
      bestDays: [
        { day: 'MO', percentage: 45, isHighlighted: false },
        { day: 'DI', percentage: 86, isHighlighted: true },
        { day: 'MI', percentage: 55, isHighlighted: false },
        { day: 'DO', percentage: 50, isHighlighted: false },
        { day: 'FR', percentage: 40, isHighlighted: false },
        { day: 'SA', percentage: 35, isHighlighted: false },
        { day: 'SO', percentage: 30, isHighlighted: false },
      ],
      bestDayDescription: 'Dienstags sparst du im Schnitt 14%.',
      retailerOptimization: {
        title: 'Händler-Optimierung',
        description:
          'Kaufe Drogerieartikel lieber bei Lidl statt Rewe. Das sparte dir diesen Monat theoretisch 8,45 €.',
        savingsAmountCents: 845,
      },
      categoryTrend: {
        title: 'Kategorie-Trend',
        description:
          'Starker Rückgang bei Snacks (-22%). Dein Fokus auf gesündere Ernährung spiegelt sich in den Bons wider.',
        emoji: '🍿',
      },
      tips: [
        {
          id: '1',
          icon: '🏷',
          title: 'Eigenmarken nutzen',
          description: 'Potenzial: 12% Ersparnis',
          iconBgColor: 'bg-blue-100',
          iconColor: 'text-blue-600',
        },
        {
          id: '2',
          icon: '🎫',
          title: 'Coupon-Reminder',
          description: '3 aktive Angebote verfügbar',
          iconBgColor: 'bg-orange-100',
          iconColor: 'text-orange-600',
        },
        {
          id: '3',
          icon: '🌙',
          title: 'Abendeinkauf vermeiden',
          description: 'Spontankäufe steigen nach 19 Uhr',
          iconBgColor: 'bg-rose-100',
          iconColor: 'text-rose-600',
        },
      ],
    }
  }, [month, year])

  return {
    data,
    isLoading,
    error,
    refresh,
  }
}

export default useInsightsData
