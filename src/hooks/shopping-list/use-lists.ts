'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

export type ShoppingList = Database['public']['Tables']['shopping_lists']['Row']

function toTimestamp(value: string | null | undefined): number {
  if (!value) return 0
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

function sortListsByCreatedAtDesc(items: ShoppingList[]): ShoppingList[] {
  return [...items].sort((a, b) => toTimestamp(b.created_at) - toTimestamp(a.created_at))
}

function upsertListById(current: ShoppingList[], incoming: ShoppingList): ShoppingList[] {
  const existingIndex = current.findIndex((item) => item.id === incoming.id)
  if (existingIndex >= 0) {
    const merged = current.map((item) => (item.id === incoming.id ? { ...item, ...incoming } : item))
    return sortListsByCreatedAtDesc(merged)
  }
  return sortListsByCreatedAtDesc([incoming, ...current])
}

export function useShoppingLists(householdId: string | null) {
  const supabase = useMemo(() => createClient(), [])
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
      // Upsert to avoid duplicate rows when realtime INSERT arrives in parallel.
      queryClient.setQueryData(['shopping_lists', householdId], (old: ShoppingList[] = []) => {
        return upsertListById(old, newList)
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
