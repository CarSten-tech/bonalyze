import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase"
import type { Offer } from "@/types/shopping"

export function useOffers(enabled = true) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['offers'],
    queryFn: async () => {
      // Fetch active offers
      const today = new Date().toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .gte('valid_until', today)
        .order('product_name')
      
      if (error) throw error
      return data as unknown as Offer[]
    },
    enabled,
    staleTime: 1000 * 60 * 60, // 1 hour
  })
}
