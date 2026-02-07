'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useHousehold } from '@/contexts/household-context'
import {
  PeriodPreset,
  DateRange,
  getDateRange,
  getComparisonPeriod,
  calculatePercentageChange,
} from '@/lib/date-utils'
import {
  DashboardAnalytics,
  AnalyticsState,
  CategoryData,
  StoreData,
  getCategoryColor,
} from '@/types/analytics'
import { getBudgetStatus } from '@/app/actions/budget'

interface UseDashboardAnalyticsOptions {
  preset: PeriodPreset
  customRange?: DateRange
}

interface UseDashboardAnalyticsReturn extends AnalyticsState {
  refresh: () => Promise<void>
}

/**
 * Hook for fetching dashboard analytics data
 *
 * Performs server-side aggregations via Supabase queries
 * to calculate spending summaries, category breakdowns, and store rankings.
 */
export function useDashboardAnalytics(
  options: UseDashboardAnalyticsOptions
): UseDashboardAnalyticsReturn {
  const { preset, customRange } = options
  const { currentHousehold } = useHousehold()
  const [state, setState] = useState<AnalyticsState>({
    data: null,
    isLoading: true,
    error: null,
  })

  const supabase = createClient()

  const fetchAnalytics = useCallback(async () => {
    if (!currentHousehold) {
      setState({ data: null, isLoading: false, error: null })
      return
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      // Get date ranges
      const currentPeriod = getDateRange(preset, customRange)
      const comparisonPeriod = getComparisonPeriod(preset, customRange)

      // Fetch budget status (in parallel)
      const budgetPromise = getBudgetStatus(currentHousehold.id, new Date(currentPeriod.startDate))

      // Wait for all data
      const [
        { data: currentReceipts, error: currentError },
        { data: previousReceipts, error: previousError },
        budgetStatus
      ] = await Promise.all([
        supabase
          .from('receipts')
          .select(`
            id,
            total_amount_cents,
            date,
            merchant_id,
            merchants (
              id,
              name,
              logo_url
            )
          `)
          .eq('household_id', currentHousehold.id)
          .gte('date', currentPeriod.startDate)
          .lte('date', currentPeriod.endDate),
        supabase
          .from('receipts')
          .select('total_amount_cents')
          .eq('household_id', currentHousehold.id)
          .gte('date', comparisonPeriod.startDate)
          .lte('date', comparisonPeriod.endDate),
        budgetPromise
      ])

      if (currentError) throw currentError
      if (previousError) throw previousError

      // Fetch receipt items with product categories for current period
      const receiptIds = currentReceipts?.map((r) => r.id) || []
      let categoryData: CategoryData[] = []
      
      if (receiptIds.length > 0) {
        const { data: items, error: itemsError } = await supabase
          .from('receipt_items')
          .select(`
            price_cents,
            quantity,
            product_id,
            products (
              category
            )
          `)
          .in('receipt_id', receiptIds)

        if (itemsError) throw itemsError

        // Aggregate by category
        const categoryMap = new Map<string, number>()
        let totalItemsAmount = 0

        items?.forEach((item) => {
          const category = item.products?.category || 'Sonstiges'
          const amount = item.price_cents * item.quantity
          categoryMap.set(category, (categoryMap.get(category) || 0) + amount)
          totalItemsAmount += amount
        })

        // Convert to array and calculate percentages
        categoryData = Array.from(categoryMap.entries())
          .map(([name, amount], index) => ({
            name,
            amount,
            percentage: totalItemsAmount > 0 ? (amount / totalItemsAmount) * 100 : 0,
            color: getCategoryColor(name, index),
          }))
          .sort((a, b) => b.amount - a.amount)

        // Group small categories into "Sonstiges" if more than 5 categories
        if (categoryData.length > 5) {
          const topCategories = categoryData.slice(0, 4)
          const otherCategories = categoryData.slice(4)
          const otherAmount = otherCategories.reduce((sum, cat) => sum + cat.amount, 0)
          const otherPercentage = otherCategories.reduce((sum, cat) => sum + cat.percentage, 0)

          categoryData = [
            ...topCategories,
            {
              name: 'Sonstiges',
              amount: otherAmount,
              percentage: otherPercentage,
              color: getCategoryColor('Sonstiges', 4),
            },
          ]
        }
      }

      // Aggregate store data
      const storeMap = new Map<string, StoreData>()
      currentReceipts?.forEach((receipt) => {
        if (receipt.merchant_id && receipt.merchants) {
          const merchant = receipt.merchants as { id: string; name: string; logo_url: string | null }
          const existing = storeMap.get(merchant.id)
          if (existing) {
            existing.amount += receipt.total_amount_cents
            existing.visitCount += 1
          } else {
            storeMap.set(merchant.id, {
              id: merchant.id,
              name: merchant.name,
              amount: receipt.total_amount_cents,
              visitCount: 1,
              logoUrl: merchant.logo_url,
            })
          }
        }
      })

      const topStores = Array.from(storeMap.values())
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5)

      // Calculate summaries
      const currentTotal = currentReceipts?.reduce(
        (sum, r) => sum + r.total_amount_cents,
        0
      ) || 0
      const currentCount = currentReceipts?.length || 0
      const previousTotal = previousReceipts?.reduce(
        (sum, r) => sum + r.total_amount_cents,
        0
      ) || 0
      const previousCount = previousReceipts?.length || 0

      // Map budget status correctly to the updated type
      // Since getBudgetStatus returns the correct shape, we just need to ensure dates are Dates
      const formattedBudgetStatus = budgetStatus ? {
        ...budgetStatus,
        period: {
          start: new Date(budgetStatus.period.start),
          end: new Date(budgetStatus.period.end)
        }
      } : null

      const analytics: DashboardAnalytics = {
        current: {
          totalSpent: currentTotal,
          receiptCount: currentCount,
          averagePerReceipt: currentCount > 0 ? Math.round(currentTotal / currentCount) : 0,
        },
        comparison: {
          previousPeriodLabel: comparisonPeriod.label,
          totalSpentChange: calculatePercentageChange(currentTotal, previousTotal),
          receiptCountChange: calculatePercentageChange(currentCount, previousCount),
        },
        categories: categoryData,
        topStores,
        periodLabel: currentPeriod.label,
        budgetStatus: formattedBudgetStatus
      }

      setState({ data: analytics, isLoading: false, error: null })
    } catch (error) {
      console.error('Error fetching analytics:', error)
      setState({
        data: null,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load analytics',
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentHousehold?.id, preset, customRange?.startDate, customRange?.endDate])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  return {
    ...state,
    refresh: fetchAnalytics,
  }
}
