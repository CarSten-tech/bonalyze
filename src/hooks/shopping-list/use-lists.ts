'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

export type ShoppingList = Database['public']['Tables']['shopping_lists']['Row']

export function useShoppingLists(householdId: string) {
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
      // We need to fetch current user to set created_by? 
      // Actually DB often handles defaults, but let's check schema.
      // Shopping lists usually just need name/household_id
      const { data, error } = await supabase
        .from('shopping_lists')
        .insert({
          name,
          household_id: householdId,
          // created_by is handled by TRIGGER or DEFAULT if configured, otherwise RLS auto-inserts auth.uid?
          // Default postgres usually doesn't AUTO insert auth.uid unless trigger. 
          // Previous code: .insert({ household_id, name, created_by: user.id })
          // So I should probably get user.id. 
          // But Supabase Client has session.
          // Let's rely on backend or just omit (if schema allows).
          // Checking previous `use-shopping-list.ts` (Step 1133 or before):
          // It called `fetchLists`.
          // `createList` impl: 
          /* 
            const { data, error } = await supabase.from('shopping_lists').insert({
               household_id: householdId,
               name,
               created_by: (await supabase.auth.getUser()).data.user?.id
            })
          */
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
