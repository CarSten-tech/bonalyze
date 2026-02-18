'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'

export function useShoppingListRealtime(householdId: string | null, currentListId: string | null) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  // 1. Lists Subscription
  useEffect(() => {
    if (!householdId) return

    const listsChannel = supabase
      .channel('shopping_lists_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shopping_lists', filter: `household_id=eq.${householdId}` },
        () => {
          // Invalidate to refetch
          queryClient.invalidateQueries({ queryKey: ['shopping_lists', householdId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(listsChannel)
    }
  }, [householdId, queryClient, supabase])

  // 2. Items Subscription
  useEffect(() => {
    if (!currentListId) return

    const itemsChannel = supabase
      .channel(`items_realtime_${currentListId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shopping_list_items', filter: `shopping_list_id=eq.${currentListId}` },
        () => {
           // Basic Invalidation strategy
           // React Query keeps previous data visible while fetching new data
           queryClient.invalidateQueries({ queryKey: ['shopping_list_items', currentListId] })
        }
      )
      .subscribe()

      return () => {
        supabase.removeChannel(itemsChannel)
      }
  }, [currentListId, queryClient, supabase])
}
