'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'

export function useProductPrices(householdId: string | null) {
  const supabase = createClient()

  const query = useQuery({
    queryKey: ['product_prices', householdId],
    queryFn: async () => {
      if (!householdId) return {}
      
      const { data, error } = await supabase
        .from('products')
        .select('id, name, last_price_cents')
        .eq('household_id', householdId)
        .not('last_price_cents', 'is', null)
      
      if (error) throw error
      
      // Transform to lookup map
      // Map<string, number> where keys are ID AND Name (lowercase)
      // This allows O(1) lookup by ID or Name
      const prices: Record<string, number> = {}
      data?.forEach(p => {
        if (p.last_price_cents !== null) {
            // ID lookup
            prices[p.id] = p.last_price_cents
            // Name lookup (fallback)
            if (p.name) {
                prices[p.name.toLowerCase().trim()] = p.last_price_cents
            }
        }
      })
      return prices
    },
    enabled: !!householdId,
    // Prices don't change often, keep fresh for 5 mins
    staleTime: 5 * 60 * 1000, 
  })

  return {
    productPrices: query.data || {},
    isLoading: query.isLoading,
    refetch: query.refetch
  }
}
