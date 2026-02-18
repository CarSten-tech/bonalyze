'use client'

import { useState, useEffect, useCallback } from 'react'
import { useHousehold } from '@/contexts/household-context'
import { createClient } from '@/lib/supabase'
import type { FilterType } from '@/components/ausgaben/filter-pills'

interface SubcategoryData {
  name: string
  amountCents: number
  slug?: string
}

interface CategoryData {
  id: string
  name: string
  emoji: string
  amountCents: number
  subcategories: SubcategoryData[]
}

interface MonthData {
  year: number
  monthNumber: number
  monthName: string
  receiptCount: number
  totalAmountCents: number
  categories: CategoryData[]
}

interface YearOption {
  year: number
  receiptCount: number
  totalAmountCents: number
}

interface UseExpensesDataOptions {
  year: number
  paymentType?: FilterType
  purpose?: string
}

interface UseExpensesDataResult {
  months: MonthData[]
  availableYears: YearOption[]
  isLoading: boolean
  error: string | null
  refresh: () => void
}

// German month names
const monthNames = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
]

/**
 * Hook to fetch expenses data grouped by month and category.
 * Uses the get_monthly_expenses_by_category RPC if available,
 * otherwise falls back to client-side aggregation.
 */
export function useExpensesData({
  year,
  paymentType,
  purpose,
}: UseExpensesDataOptions): UseExpensesDataResult {
  const { currentHousehold } = useHousehold()
  const [months, setMonths] = useState<MonthData[]>([])
  const [availableYears, setAvailableYears] = useState<YearOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchAvailableYears = useCallback(async () => {
    if (!currentHousehold) return

    try {
      const { data, error: rpcError } = await supabase
        .rpc('get_available_expense_years', {
          p_household_id: currentHousehold.id,
        })

      if (rpcError) {
        console.error('Error fetching years:', rpcError)
        // Fallback: get years from receipts directly
        const { data: receipts } = await supabase
          .from('receipts')
          .select('date, total_amount_cents')
          .eq('household_id', currentHousehold.id)

        if (receipts) {
          const yearMap = new Map<number, { count: number; total: number }>()
          receipts.forEach((r) => {
            const y = new Date(r.date).getFullYear()
            const existing = yearMap.get(y) || { count: 0, total: 0 }
            yearMap.set(y, {
              count: existing.count + 1,
              total: existing.total + r.total_amount_cents,
            })
          })
          const fallbackYears = Array.from(yearMap.entries())
            .map(([y, d]) => ({
              year: y,
              receiptCount: d.count,
              totalAmountCents: d.total,
            }))
            .sort((a, b) => b.year - a.year)
          setAvailableYears(fallbackYears)
        }
        return
      }

      if (data) {
        setAvailableYears(
          data.map((d: { year: number; receipt_count: number; total_amount_cents: number }) => ({
            year: d.year,
            receiptCount: d.receipt_count,
            totalAmountCents: d.total_amount_cents,
          }))
        )
      }
    } catch (err) {
      console.error('Error fetching available years:', err)
    }
  }, [currentHousehold, supabase])

  const fetchWithFallback = useCallback(async () => {
    if (!currentHousehold) return

    // Get receipts for the year
    const startDate = `${year}-01-01`
    const endDate = `${year}-12-31`

    let query = supabase
      .from('receipts')
      .select(`
        id,
        date,
        total_amount_cents,
        payment_type,
        purpose,
        receipt_items (
          id,
          price_cents,
          product_name,
          category_id,
          categories (
            id,
            name,
            emoji,
            slug,
            parent_id
          )
        )
      `)
      .eq('household_id', currentHousehold.id)
      .gte('date', startDate)
      .lte('date', endDate)

    if (paymentType && paymentType !== 'alle') {
      query = query.eq('payment_type', paymentType)
    }
    if (purpose) {
      query = query.eq('purpose', purpose)
    }

    const { data: receipts, error: receiptsError } = await query

    console.log('[DEBUG fetchWithFallback] Raw receipts:', {
      count: receipts?.length,
      error: receiptsError,
      firstReceipt: receipts?.[0],
      firstReceiptItems: receipts?.[0]?.receipt_items,
    })

    if (receiptsError) {
      console.error('Error fetching receipts:', receiptsError)
      setError('Fehler beim Laden der Kassenbelege')
      setIsLoading(false)
      return
    }

    // Aggregate by month
    const monthMap = new Map<number, {
      receiptCount: number
      totalAmountCents: number
      categoryMap: Map<string, {
        id: string
        name: string
        emoji: string
        amountCents: number
        subcategoryMap: Map<string, { name: string; amountCents: number; slug?: string }>
      }>
    }>()

    receipts?.forEach((receipt) => {
      const month = new Date(receipt.date).getMonth() + 1
      const existing = monthMap.get(month) || {
        receiptCount: 0,
        totalAmountCents: 0,
        categoryMap: new Map(),
      }

      existing.receiptCount += 1
      existing.totalAmountCents += receipt.total_amount_cents

      // Process items - now with direct category relation
      const items = receipt.receipt_items as Array<{
        price_cents: number
        product_name: string
        category_id: string | null
        categories: {
          id: string
          name: string
          emoji: string | null
          slug: string
          parent_id: string | null
        } | null
      }> | null

      items?.forEach((item) => {
        const category = item.categories
        if (!category) {
          // Uncategorized
          const uncatKey = 'uncategorized'
          const uncat = existing.categoryMap.get(uncatKey) || {
            id: uncatKey,
            name: 'Sonstiges',
            emoji: '📦',
            amountCents: 0,
            subcategoryMap: new Map(),
          }
          uncat.amountCents += item.price_cents
          existing.categoryMap.set(uncatKey, uncat)
          return
        }

        // Determine parent category
        const parentId = category.parent_id || category.id
        const isSubcategory = !!category.parent_id

        const catData = existing.categoryMap.get(parentId) || {
          id: parentId,
          name: isSubcategory ? 'Kategorie' : category.name,
          emoji: isSubcategory ? '📦' : (category.emoji || '📦'),
          amountCents: 0,
          subcategoryMap: new Map(),
        }

        catData.amountCents += item.price_cents

        if (isSubcategory) {
          const subData = catData.subcategoryMap.get(category.id) || {
            name: category.name,
            amountCents: 0,
            slug: category.slug,
          }
          subData.amountCents += item.price_cents
          catData.subcategoryMap.set(category.id, subData)
        }

        existing.categoryMap.set(parentId, catData)
      })

      monthMap.set(month, existing)
    })

    // Transform to array
    const result: MonthData[] = []
    monthMap.forEach((data, monthNum) => {
      const categories: CategoryData[] = []
      data.categoryMap.forEach((cat) => {
        const subcategories: SubcategoryData[] = []
        cat.subcategoryMap.forEach((sub) => {
          subcategories.push(sub)
        })
        subcategories.sort((a, b) => b.amountCents - a.amountCents)

        categories.push({
          id: cat.id,
          name: cat.name,
          emoji: cat.emoji,
          amountCents: cat.amountCents,
          subcategories,
        })
      })
      categories.sort((a, b) => b.amountCents - a.amountCents)

      result.push({
        year,
        monthNumber: monthNum,
        monthName: monthNames[monthNum - 1],
        receiptCount: data.receiptCount,
        totalAmountCents: data.totalAmountCents,
        categories,
      })
    })

    result.sort((a, b) => b.monthNumber - a.monthNumber)
    setMonths(result)
    setIsLoading(false)
  }, [currentHousehold, supabase, year, paymentType, purpose])

  const fetchMonthlyData = useCallback(async () => {
    if (!currentHousehold) {
      setMonths([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Try RPC first
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_monthly_expenses_by_category', {
          p_household_id: currentHousehold.id,
          p_year: year,
          p_payment_type: paymentType === 'alle' ? undefined : paymentType,
          p_purpose: purpose || undefined,
        })

      console.log('[DEBUG useExpensesData] RPC result:', {
        hasData: !!rpcData,
        dataLength: rpcData?.length,
        error: rpcError,
        rpcData: rpcData,
      })

      if (!rpcError && rpcData) {
        // Transform RPC data to our format
        const transformed: MonthData[] = rpcData.map((m: {
          month_number: number
          month_name: string
          year: number
          receipt_count: number
          total_amount_cents: number
          categories: unknown
        }) => ({
          year: m.year,
          monthNumber: m.month_number,
          monthName: monthNames[m.month_number - 1] || m.month_name,
          receiptCount: m.receipt_count,
          totalAmountCents: m.total_amount_cents,
          categories: parseCategories(m.categories),
        }))

        console.log('[DEBUG useExpensesData] Transformed RPC data:', transformed)

        setMonths(transformed.sort((a, b) => b.monthNumber - a.monthNumber))
        setIsLoading(false)
        return
      }

      // Fallback: Manual aggregation
      console.log('[DEBUG useExpensesData] RPC not available, using fallback aggregation')
      await fetchWithFallback()
    } catch (err) {
      console.error('Error fetching monthly data:', err)
      setError('Fehler beim Laden der Daten')
      setIsLoading(false)
    }
  }, [currentHousehold, supabase, year, paymentType, purpose, fetchWithFallback])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchAvailableYears()
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [fetchAvailableYears])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchMonthlyData()
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [fetchMonthlyData])

  const refresh = useCallback(() => {
    fetchAvailableYears()
    fetchMonthlyData()
  }, [fetchAvailableYears, fetchMonthlyData])

  return {
    months,
    availableYears,
    isLoading,
    error,
    refresh,
  }
}

// Helper to parse categories from RPC JSON
function parseCategories(categoriesJson: unknown): CategoryData[] {
  if (!categoriesJson || !Array.isArray(categoriesJson)) return []

  return categoriesJson.map((cat: {
    id: string
    name: string
    emoji?: string
    amount_cents: number
    subcategories?: Array<{
      name: string
      amount_cents: number
      slug?: string
    }>
  }) => ({
    id: cat.id,
    name: cat.name,
    emoji: cat.emoji || '📦',
    amountCents: cat.amount_cents,
    subcategories: (cat.subcategories || []).map((sub) => ({
      name: sub.name,
      amountCents: sub.amount_cents,
      slug: sub.slug,
    })),
  }))
}

export default useExpensesData
