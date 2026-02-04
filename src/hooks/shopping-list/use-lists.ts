'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

export type ShoppingList = Database['public']['Tables']['shopping_lists']['Row']

export function useShoppingLists(householdId: string | null) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  // Fetch lists
  const query = useQuery({
    queryKey: ['shopping_lists', householdId],
    queryFn: async () => {
      // If no householdId, don't fetch (enabled handles this, but safe guard)
      if (!householdId) return []
      
      const { data, error } = await supabase
        .from('shopping_lists')
        .select('*')
        .eq('household_id', householdId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data as ShoppingList[]
    },
    enabled: !!householdId,
  })

  // Create List Mutation
  const createList = useMutation({
    mutationFn: async (name: string) => {
      if (!householdId) throw new Error("No household")
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { data, error } = await supabase
        .from('shopping_lists')
        .insert({
          name,
          household_id: householdId,
          created_by: user.id
        })
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: (newList) => {
      // Update cache instantly
      queryClient.setQueryData(['shopping_lists', householdId], (old: ShoppingList[] = []) => {
        return [newList, ...old]
      })
    }
  })

  // Delete List Mutation (if needed later)

  return {
    lists: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createList,
  }
}
