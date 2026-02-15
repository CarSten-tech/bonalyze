import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase"
import type { Database } from "@/types/database.types"

type Category = Database['public']['Tables']['categories']['Row']

export function useCategories() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })

      if (error) throw error
      return data as Category[]
    }
  })
}
