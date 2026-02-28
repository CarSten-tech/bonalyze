'use client'

import { useEffect, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import {
  mergeItemPayload,
  mergeListPayload,
  type CachedShoppingListItem,
  type ShoppingListItemRow,
  type ShoppingListRow,
} from './realtime-merge'

export function useShoppingListRealtime(householdId: string | null, currentListId: string | null) {
  const supabase = useMemo(() => createClient(), [])
  const queryClient = useQueryClient()

  // 1. Lists Subscription
  useEffect(() => {
    if (!householdId) return

    const listsChannel = supabase
      .channel(`shopping_lists_realtime:${householdId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shopping_lists', filter: `household_id=eq.${householdId}` },
        (payload: RealtimePostgresChangesPayload<ShoppingListRow>) => {
          queryClient.setQueryData<ShoppingListRow[]>(['shopping_lists', householdId], (old) => {
            if (!old) return old
            return mergeListPayload(old, payload)
          })

          // Keep relational data (joins/derived fields) correct.
          queryClient.invalidateQueries({ queryKey: ['shopping_lists', householdId] })
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(listsChannel)
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
        (payload: RealtimePostgresChangesPayload<ShoppingListItemRow>) => {
          queryClient.setQueryData<CachedShoppingListItem[]>(['shopping_list_items', currentListId], (old) => {
            if (!old) return old
            return mergeItemPayload(old, payload)
          })

          // Keep relational fields (profile/offers/price hints) in sync.
          queryClient.invalidateQueries({ queryKey: ['shopping_list_items', currentListId] })
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(itemsChannel)
    }
  }, [currentListId, queryClient, supabase])
}
