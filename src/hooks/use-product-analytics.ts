import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useHousehold } from '@/contexts/household-context'

export interface PricePoint {
  date: string
  price: number
  merchantName: string
}

export interface StoreStat {
  merchantName: string
  merchantLogo?: string | null
  count: number
  avgPrice: number
  lastPrice: number
}

export interface ProductAnalyticsData {
  productName: string
  categoryName?: string
  categorySlug?: string
  totalCount: number
  totalSpend: number
  avgPrice: number
  minPrice: number
  maxPrice: number
  
  favoriteStore: StoreStat | null
  cheapestStore: StoreStat | null
  
  priceHistory: PricePoint[]
  storeStats: StoreStat[]
}

export function useProductAnalytics(productName: string) {
  const { currentHousehold } = useHousehold()
  const [data, setData] = useState<ProductAnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    if (!currentHousehold || !productName) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Fetch all instances of this product for the household
      // We explicitly decode decoding the URI component in case it comes encoded
      const decodedName = decodeURIComponent(productName)

      const { data: items, error: fetchError } = await supabase
        .from('receipt_items')
        .select(`
          price_cents,
          quantity,
          receipts!inner (
            date,
            household_id,
            merchants (
              name,
              logo_url
            )
          ),
          categories (
            name,
            slug
          )
        `)
        .eq('receipts.household_id', currentHousehold.id)
        .eq('product_name', decodedName)
        .order('receipts(date)', { ascending: true })

      if (fetchError) throw fetchError

      if (!items || items.length === 0) {
        setData(null)
        setIsLoading(false)
        return
      }

      // Process Data
      let totalCount = 0
      let totalSpend = 0
      let minPrice = Infinity
      let maxPrice = -Infinity
      
      const priceHistory: PricePoint[] = []
      const storeMap = new Map<string, {
        merchantName: string,
        logo?: string | null,
        count: number,
        totalPrice: number,
        latestDate: string,
        lastPrice: number
      }>()

      let categoryName: string | undefined
      let categorySlug: string | undefined

      items.forEach((item: any) => {
        // Extract category from the first item found (assuming valuable info is consistent)
        if (!categoryName && item.categories) {
            categoryName = item.categories.name
            categorySlug = item.categories.slug
        }

        const price = item.price_cents
        const qty = item.quantity || 1
        const date = item.receipts.date
        const merchantName = item.receipts.merchants?.name || 'Unbekannt'
        const merchantLogo = item.receipts.merchants?.logo_url

        // Global Stats
        totalCount += qty
        totalSpend += price // Assuming price_cents is line total based on previous finding
        
        // Single unit price approximation (if quantity > 1, average it)
        const unitPrice = price / qty
        
        if (unitPrice < minPrice) minPrice = unitPrice
        if (unitPrice > maxPrice) maxPrice = unitPrice

        // History
        priceHistory.push({
          date,
          price: unitPrice,
          merchantName
        })

        // Store Stats
        const storeKey = merchantName
        const existing = storeMap.get(storeKey) || {
          merchantName,
          logo: merchantLogo,
          count: 0,
          totalPrice: 0,
          latestDate: '1970-01-01',
          lastPrice: 0
        }

        existing.count += qty
        existing.totalPrice += price
        
        if (date >= existing.latestDate) {
            existing.latestDate = date
            existing.lastPrice = unitPrice
        }

        storeMap.set(storeKey, existing)
      })

      const avgPrice = totalSpend / totalCount

      // Convert Map to Array
      const storeStats: StoreStat[] = Array.from(storeMap.values()).map(s => ({
        merchantName: s.merchantName,
        merchantLogo: s.logo,
        count: s.count,
        avgPrice: s.totalPrice / s.count,
        lastPrice: s.lastPrice
      })).sort((a, b) => b.count - a.count)

      const favoriteStore = storeStats.length > 0 ? storeStats[0] : null
      
      // Cheapest store based on average price
      const sortedByPrice = [...storeStats].sort((a, b) => a.avgPrice - b.avgPrice)
      const cheapestStore = sortedByPrice.length > 0 ? sortedByPrice[0] : null

      setData({
        productName: decodedName,
        categoryName,
        categorySlug,
        totalCount,
        totalSpend,
        avgPrice,
        minPrice: minPrice === Infinity ? 0 : minPrice,
        maxPrice: maxPrice === -Infinity ? 0 : maxPrice,
        favoriteStore,
        cheapestStore,
        priceHistory,
        storeStats
      })

    } catch (err) {
      console.error('Error fetching product analytics:', err)
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Daten')
    } finally {
      setIsLoading(false)
    }
  }, [productName, currentHousehold, supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refresh: fetchData }
}
