'use client'

import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'

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
  AnalyticsDriver,
} from '@/types/analytics'
import { getBudgetStatus } from '@/app/actions/budget'

interface UseDashboardAnalyticsOptions {
  preset: PeriodPreset
  customRange?: DateRange
}

interface UseDashboardAnalyticsReturn extends AnalyticsState {
  refresh: () => Promise<void>
}

function formatEuro(cents: number): string {
  return (cents / 100).toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  })
}

function aggregateByCategory(
  items: Array<{ price_cents: number; quantity: number; products: { category: string | null } | null }>
): Map<string, number> {
  const categoryMap = new Map<string, number>()
  items.forEach((item) => {
    const category = item.products?.category || 'Sonstiges'
    const amount = item.price_cents * item.quantity
    categoryMap.set(category, (categoryMap.get(category) || 0) + amount)
  })
  return categoryMap
}

function aggregateByStore(
  receipts: Array<{
    merchant_id: string | null
    total_amount_cents: number
    merchants: { id: string; name: string; logo_url: string | null } | null
  }>
): Map<string, StoreData> {
  const storeMap = new Map<string, StoreData>()

  receipts.forEach((receipt) => {
    if (!receipt.merchant_id || !receipt.merchants) return

    const merchant = receipt.merchants
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
  })

  return storeMap
}

function buildDrivers(params: {
  totalSpentChange: number | null
  currentTotal: number
  previousTotal: number
  currentCategories: Map<string, number>
  previousCategories: Map<string, number>
  currentStores: Map<string, StoreData>
  previousStores: Map<string, StoreData>
  currentCount: number
  previousCount: number
}): AnalyticsDriver[] {
  const {
    totalSpentChange,
    currentTotal,
    previousTotal,
    currentCategories,
    previousCategories,
    currentStores,
    previousStores,
    currentCount,
    previousCount,
  } = params

  const drivers: AnalyticsDriver[] = []

  if (totalSpentChange !== null) {
    if (totalSpentChange >= 0) {
      drivers.push({
        id: 'total-change',
        title: `Gesamtausgaben +${totalSpentChange.toFixed(0)}%`,
        description: `${formatEuro(currentTotal - previousTotal)} mehr als im Vergleichszeitraum.`,
        actionUrl: '/dashboard/ausgaben',
      })
    } else {
      drivers.push({
        id: 'total-change',
        title: `Gesamtausgaben ${totalSpentChange.toFixed(0)}%`,
        description: `${formatEuro(Math.abs(currentTotal - previousTotal))} weniger als im Vergleichszeitraum.`,
        actionUrl: '/dashboard/ausgaben',
      })
    }
  }

  const categoryNames = new Set([...currentCategories.keys(), ...previousCategories.keys()])
  let strongestCategory: { name: string; delta: number } | null = null
  categoryNames.forEach((name) => {
    const delta = (currentCategories.get(name) || 0) - (previousCategories.get(name) || 0)
    if (!strongestCategory || Math.abs(delta) > Math.abs(strongestCategory.delta)) {
      strongestCategory = { name, delta }
    }
  })

  if (strongestCategory && strongestCategory.delta !== 0) {
    const direction = strongestCategory.delta > 0 ? 'mehr' : 'weniger'
    drivers.push({
      id: 'category-driver',
      title: `Treiber Kategorie: ${strongestCategory.name}`,
      description: `${formatEuro(Math.abs(strongestCategory.delta))} ${direction} als im Vergleichszeitraum.`,
      actionUrl: '/dashboard/ausgaben',
    })
  }

  const storeIds = new Set([...currentStores.keys(), ...previousStores.keys()])
  let strongestStore: { name: string; delta: number } | null = null
  storeIds.forEach((storeId) => {
    const current = currentStores.get(storeId)
    const previous = previousStores.get(storeId)
    const delta = (current?.amount || 0) - (previous?.amount || 0)
    const name = current?.name || previous?.name || 'Unbekannt'
    if (!strongestStore || Math.abs(delta) > Math.abs(strongestStore.delta)) {
      strongestStore = { name, delta }
    }
  })

  if (strongestStore && strongestStore.delta !== 0) {
    const direction = strongestStore.delta > 0 ? 'mehr' : 'weniger'
    drivers.push({
      id: 'store-driver',
      title: `Treiber Store: ${strongestStore.name}`,
      description: `${formatEuro(Math.abs(strongestStore.delta))} ${direction} bei diesem Händler.`,
      actionUrl: '/dashboard/receipts',
    })
  }

  const currentAvg = currentCount > 0 ? Math.round(currentTotal / currentCount) : 0
  const previousAvg = previousCount > 0 ? Math.round(previousTotal / previousCount) : 0
  const avgDelta = currentAvg - previousAvg
  if (previousCount > 0 && avgDelta !== 0) {
    const direction = avgDelta > 0 ? 'größer' : 'kleiner'
    drivers.push({
      id: 'basket-driver',
      title: `Warenkorbgröße ${direction}`,
      description: `Ø Bon: ${formatEuro(currentAvg)} (zuvor ${formatEuro(previousAvg)}).`,
      actionUrl: '/dashboard/receipts',
    })
  }

  return drivers.slice(0, 3)
}

/**
 * Hook for fetching dashboard analytics data
 */
export function useDashboardAnalytics(
  options: UseDashboardAnalyticsOptions
): UseDashboardAnalyticsReturn {
  const { preset, customRange } = options
  const { currentHousehold } = useHousehold()
  const supabase = createClient()

  const query = useQuery<DashboardAnalytics, Error>({
    queryKey: [
      'dashboard-analytics',
      currentHousehold?.id,
      preset,
      customRange?.startDate,
      customRange?.endDate,
    ],
    enabled: Boolean(currentHousehold?.id),
    staleTime: 60 * 1000,
    placeholderData: (previousData) => previousData,
    queryFn: async () => {
      if (!currentHousehold) {
        throw new Error('Kein Haushalt ausgewählt')
      }

      const currentPeriod = getDateRange(preset, customRange)
      const comparisonPeriod = getComparisonPeriod(preset, customRange)

      const budgetPromise = getBudgetStatus(currentHousehold.id, new Date(currentPeriod.startDate))

      const [
        { data: currentReceipts, error: currentError },
        { data: previousReceipts, error: previousError },
        budgetStatus,
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
          .select(`
            id,
            total_amount_cents,
            merchant_id,
            merchants (
              id,
              name,
              logo_url
            )
          `)
          .eq('household_id', currentHousehold.id)
          .gte('date', comparisonPeriod.startDate)
          .lte('date', comparisonPeriod.endDate),
        budgetPromise,
      ])

      if (currentError) throw currentError
      if (previousError) throw previousError

      const currentRows = (currentReceipts || []).map((receipt) => ({
        ...receipt,
        merchants: (receipt.merchants as { id: string; name: string; logo_url: string | null } | null) || null,
      }))
      const previousRows = (previousReceipts || []).map((receipt) => ({
        ...receipt,
        merchants: (receipt.merchants as { id: string; name: string; logo_url: string | null } | null) || null,
      }))

      const currentReceiptIds = currentRows.map((receipt) => receipt.id)
      const previousReceiptIds = previousRows.map((receipt) => receipt.id)
      const allReceiptIds = [...new Set([...currentReceiptIds, ...previousReceiptIds])]

      let categoryData: CategoryData[] = []
      const currentCategoryMap = new Map<string, number>()
      const previousCategoryMap = new Map<string, number>()

      if (allReceiptIds.length > 0) {
        const { data: items, error: itemsError } = await supabase
          .from('receipt_items')
          .select(`
            receipt_id,
            price_cents,
            quantity,
            products (
              category
            )
          `)
          .in('receipt_id', allReceiptIds)

        if (itemsError) throw itemsError

        const currentIdSet = new Set(currentReceiptIds)
        const previousIdSet = new Set(previousReceiptIds)

        const currentItems = (items || []).filter((item) => currentIdSet.has(item.receipt_id))
        const previousItems = (items || []).filter((item) => previousIdSet.has(item.receipt_id))

        const aggregatedCurrent = aggregateByCategory(
          currentItems as Array<{ price_cents: number; quantity: number; products: { category: string | null } | null }>
        )
        const aggregatedPrevious = aggregateByCategory(
          previousItems as Array<{ price_cents: number; quantity: number; products: { category: string | null } | null }>
        )

        aggregatedCurrent.forEach((amount, name) => currentCategoryMap.set(name, amount))
        aggregatedPrevious.forEach((amount, name) => previousCategoryMap.set(name, amount))

        const totalItemsAmount = [...aggregatedCurrent.values()].reduce((sum, amount) => sum + amount, 0)

        categoryData = [...aggregatedCurrent.entries()]
          .map(([name, amount], index) => ({
            name,
            amount,
            percentage: totalItemsAmount > 0 ? (amount / totalItemsAmount) * 100 : 0,
            color: getCategoryColor(name, index),
          }))
          .sort((a, b) => b.amount - a.amount)

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

      const currentStoreMap = aggregateByStore(currentRows)
      const previousStoreMap = aggregateByStore(previousRows)

      const topStores = Array.from(currentStoreMap.values())
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5)

      const currentTotal = currentRows.reduce((sum, receipt) => sum + receipt.total_amount_cents, 0)
      const currentCount = currentRows.length
      const previousTotal = previousRows.reduce((sum, receipt) => sum + receipt.total_amount_cents, 0)
      const previousCount = previousRows.length

      const formattedBudgetStatus = budgetStatus
        ? {
            ...budgetStatus,
            period: {
              start: new Date(budgetStatus.period.start),
              end: new Date(budgetStatus.period.end),
            },
          }
        : null

      return {
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
        drivers: buildDrivers({
          totalSpentChange: calculatePercentageChange(currentTotal, previousTotal),
          currentTotal,
          previousTotal,
          currentCategories: currentCategoryMap,
          previousCategories: previousCategoryMap,
          currentStores: currentStoreMap,
          previousStores: previousStoreMap,
          currentCount,
          previousCount,
        }),
        periodLabel: currentPeriod.label,
        budgetStatus: formattedBudgetStatus,
      }
    },
  })

  const refresh = useCallback(async () => {
    await query.refetch()
  }, [query])

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error
      ? query.error instanceof Error
        ? query.error.message
        : 'Failed to load analytics'
      : null,
    refresh,
  }
}
