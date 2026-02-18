import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useHousehold } from '@/contexts/household-context'

export interface CategoryProductItem {
  id: string
  productName: string
  date: string
  price: number // in cents
  quantity: number
  merchantName: string
  merchantLogo?: string | null
}

export interface UseCategoryDetailsOptions {
  categorySlug: string
  year: number
}

export function useCategoryDetails({ categorySlug, year }: UseCategoryDetailsOptions) {
  const { currentHousehold } = useHousehold()
  const [items, setItems] = useState<CategoryProductItem[]>([])
  const [categoryName, setCategoryName] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    if (!currentHousehold || !categorySlug) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // 1. Get Category ID and Name from Slug
      const { data: categoryData, error: catError } = await supabase
        .from('categories')
        .select('id, name')
        .eq('slug', categorySlug)
        .single()

      if (catError) {
        throw new Error('Kategorie nicht gefunden')
      }

      setCategoryName(categoryData.name)

      // 2. Fetch Receipt Items for this category and year
      const startDate = `${year}-01-01`
      const endDate = `${year}-12-31`

      // We need to join receipt_items -> receipts -> merchants
      // and filter by category_id (or product category)
      
      const { data: receiptItems, error: itemsError } = await supabase
        .from('receipt_items')
        .select(`
          id,
          product_name,
          price_cents,
          quantity,
          category_id,
          receipts!inner (
            date,
            household_id,
            merchants (
              name,
              logo_url
            )
          )
        `)
        .eq('receipts.household_id', currentHousehold.id)
        .gte('receipts.date', startDate)
        .lte('receipts.date', endDate)
        .eq('category_id', categoryData.id)
        .order('receipts(date)', { ascending: false })

      if (itemsError) throw itemsError

      type ReceiptItemRow = {
        id: string
        product_name: string
        price_cents: number
        quantity: number
        receipts?: {
          date?: string
          merchants?: {
            name?: string
            logo_url?: string | null
          } | null
        } | null
      }

      const formattedItems: CategoryProductItem[] = ((receiptItems || []) as ReceiptItemRow[]).map((item) => ({
        id: item.id,
        productName: item.product_name,
        date: item.receipts?.date || '',
        price: item.price_cents,
        quantity: item.quantity,
        merchantName: item.receipts?.merchants?.name || 'Unbekannt',
        merchantLogo: item.receipts?.merchants?.logo_url,
      }))

      setItems(formattedItems)

    } catch (err) {
      console.error('Error fetching category details:', err)
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Details')
    } finally {
      setIsLoading(false)
    }
  }, [categorySlug, year, currentHousehold, supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { items, categoryName, isLoading, error, refresh: fetchData }
}
