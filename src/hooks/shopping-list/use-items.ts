'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import { getShoppingListItemsWithOffers } from '@/app/actions/shopping-list'
import { notifyShoppingListUpdate } from '@/app/actions/notifications'
import type { ShoppingListItem } from '@/types/shopping'

export type { ShoppingListItem }

export function useShoppingItems(listId: string | null) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const queryKey = ['shopping_list_items', listId]

  // Fetch items
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!listId) return []
      return getShoppingListItemsWithOffers(listId)
    },
    enabled: !!listId,
  })

  // Helper types for Mutations
  type AddItemInput = {
      product_name: string
      quantity?: number
      unit?: string
  }

  // Add Item Mutation
  const addItem = useMutation({
    mutationFn: async (input: AddItemInput) => {
        if (!listId) throw new Error("No list selected")
        
        // 1. Try to link product (fetch category_id for proper grouping)
        const { data: product } = await supabase
            .from('products')
            .select('id, category_id')
            .eq('name', input.product_name.trim())
            .maybeSingle()

        // 1.5 Get current user for attribution
        const { data: { user } } = await supabase.auth.getUser()

        // 2. Insert item (category_id is auto-assigned by DB trigger if not provided)
        const { data, error } = await supabase
            .from('shopping_list_items')
            .insert({
                shopping_list_id: listId,
                product_name: input.product_name.trim(),
                quantity: input.quantity || 1,
                unit: input.unit || null,
                product_id: product?.id || null,
                is_checked: false,
                user_id: user?.id || null
            })
            .select()
            .single()
        
        if (error) throw error
        return data as ShoppingListItem
    },
    onMutate: async (newItemInput) => {
        // Cancel persistent queries
        await queryClient.cancelQueries({ queryKey })
        
        // Snapshot
        const previousItems = queryClient.getQueryData<ShoppingListItem[]>(queryKey)
        
        // Optimistic Item
        const optimisticItem: ShoppingListItem = {
            id: crypto.randomUUID(), // Temp ID
            shopping_list_id: listId!,
            product_name: newItemInput.product_name,
            quantity: newItemInput.quantity || 1,
            unit: newItemInput.unit || null,
            product_id: null, // Unknown yet
            priority: null,
            is_checked: false,
            user_id: null, // Optimistic: we don't know the exact ID or name yet easily, but it renders fine.
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }

        // Update Cache
        queryClient.setQueryData<ShoppingListItem[]>(queryKey, (old) => [...(old || []), optimisticItem])

        return { previousItems, optimisticId: optimisticItem.id }
    },
    onError: (err, newTodo, context) => {
        queryClient.setQueryData(queryKey, context?.previousItems)
    },
    onSuccess: (savedItem, variables, context) => {
        // Replace optimistic with real
        queryClient.setQueryData<ShoppingListItem[]>(queryKey, (old) => {
             if (!old) return [savedItem]
             return old.map(item => item.id === context?.optimisticId ? savedItem : item)
        })

        // Trigger Notification (Fire and forget, but with 'includeSelf' if user wants to test)
        // We need the householdId. We can fetch it once or keep it in the hook.
        const triggerNotification = async () => {
             const { data: list } = await supabase.from('shopping_lists').select('household_id').eq('id', listId!).single()
             if (list?.household_id) {
                 await notifyShoppingListUpdate(list.household_id, listId!, savedItem.product_name, true)
             }
        }
        triggerNotification().catch(console.error)
    }
  })

  // Update Item (Check/Uncheck)
  const updateItem = useMutation({
      mutationFn: async ({ id, updates }: { id: string, updates: Partial<ShoppingListItem> }) => {
          const { data, error } = await supabase
              .from('shopping_list_items')
              .update(updates)
              .eq('id', id)
              .select()
              .single()
          if (error) throw error
          return data as ShoppingListItem
      },
      onMutate: async ({ id, updates }) => {
          await queryClient.cancelQueries({ queryKey })
          const previousItems = queryClient.getQueryData<ShoppingListItem[]>(queryKey)
          
          queryClient.setQueryData<ShoppingListItem[]>(queryKey, (old) => {
              return old?.map(item => item.id === id ? { ...item, ...updates } : item)
          })
          
          return { previousItems }
      },
      onError: (err, vars, context) => {
           queryClient.setQueryData(queryKey, context?.previousItems)
      },
      onSuccess: (savedItem) => {
           // Update with server response (e.g. updated_at)
           queryClient.setQueryData<ShoppingListItem[]>(queryKey, (old) => {
               return old?.map(item => item.id === savedItem.id ? savedItem : item)
           })
      }
  })

  // Delete Item
  const deleteItem = useMutation({
      mutationFn: async (id: string) => {
          const { error } = await supabase.from('shopping_list_items').delete().eq('id', id)
          if (error) throw error
          return id
      },
      onMutate: async (id) => {
          await queryClient.cancelQueries({ queryKey })
          const previousItems = queryClient.getQueryData<ShoppingListItem[]>(queryKey)
          
          queryClient.setQueryData<ShoppingListItem[]>(queryKey, (old) => {
              return old?.filter(item => item.id !== id)
          })
          
          return { previousItems }
      },
      onError: (err, vars, context) => {
           queryClient.setQueryData(queryKey, context?.previousItems)
      }
  })

  // Move Item to another list
  const moveItemMutation = useMutation({
      mutationFn: async ({ id, targetListId }: { id: string, targetListId: string }) => {
          const { error } = await supabase
              .from('shopping_list_items')
              .update({ shopping_list_id: targetListId, updated_at: new Date().toISOString() })
              .eq('id', id)
          
          if (error) throw error
          return id
      },
      onMutate: async ({ id }) => {
          await queryClient.cancelQueries({ queryKey })
          const previousItems = queryClient.getQueryData<ShoppingListItem[]>(queryKey)
          
          // Optimistically remove from current list
          queryClient.setQueryData<ShoppingListItem[]>(queryKey, (old) => {
              return old?.filter(item => item.id !== id)
          })
          
          return { previousItems }
      },
      onError: (err, vars, context) => {
           queryClient.setQueryData(queryKey, context?.previousItems)
      },
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['shopping_list_items'] })
      }
  })

  return {
      items: query.data || [],
      isLoading: query.isLoading,
      addItem,
      updateItem,
      deleteItem,
      moveItem: moveItemMutation
  }
}
