import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase"
import type { Deal } from "@/types/shopping"

export function useDeals(enabled = true) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['deals'],
    queryFn: async () => {
      // @ts-ignore - table exists but types not generated yet
      const { data, error } = await supabase
        .from('deals' as any)
        .select('*')
        .order('product_name')
      
      if (error) throw error
      return data as unknown as Deal[]
    },
    enabled,
    staleTime: 1000 * 60 * 60, // 1 hour
  })
}
