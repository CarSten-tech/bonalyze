'use client'

import { useState, useMemo } from 'react'

import { useShoppingLists } from './shopping-list/use-lists'
import { useShoppingItems, type ShoppingListItem } from './shopping-list/use-items'
import { useShoppingListRealtime } from './shopping-list/use-realtime'
import { useProductPrices } from './shopping-list/use-prices'

interface UseShoppingListProps {
  householdId: string | null
}

export type { ShoppingListItem } // Re-export for consumers

export function useShoppingList({ householdId }: UseShoppingListProps) {
  // 1. Lists
  const { lists, isLoading: isLoadingLists, createList } = useShoppingLists(householdId)
  
  // 2. Selection State
  const [currentListId, setCurrentListId] = useState<string | null>(null)

  const effectiveCurrentListId = currentListId ?? lists[0]?.id ?? null

  // 3. Items
  const { 
    items, 
    isLoading: isLoadingItems, 
    addItem: addItemMutation, 
    updateItem: updateItemMutation, 
    deleteItem: deleteItemMutation,
    moveItem: moveItemMutation
  } = useShoppingItems(effectiveCurrentListId)

  // 4. Prices
  const { productPrices } = useProductPrices(householdId)

  // 5. Realtime Sync
  useShoppingListRealtime(householdId, effectiveCurrentListId)

  // Derived State
  const uncheckedItems = useMemo(() => 
    items.filter(i => !i.is_checked), 
  [items])
  
  const checkedItems = useMemo(() => 
    items.filter(i => i.is_checked), 
  [items])

  // --- Actions Wrappers (to match old API) ---

  const addItem = async (input: { product_name: string, quantity?: number, unit?: string }) => {
    await addItemMutation.mutateAsync(input)
  }

  const checkItem = (id: string) => {
    updateItemMutation.mutate({ id, updates: { is_checked: true } })
  }

  const uncheckItem = (id: string) => {
    updateItemMutation.mutate({ id, updates: { is_checked: false } })
  }

  const deleteItem = async (id: string) => {
    await deleteItemMutation.mutateAsync(id)
  }

  const moveItem = async (id: string, targetListId: string) => {
    await moveItemMutation.mutateAsync({ id, targetListId })
  }

  // Helper for clearing checked items
  const clearCheckedItems = () => {
    checkedItems.forEach(item => {
        deleteItemMutation.mutate(item.id)
    })
  }

  const handleCreateList = async (name: string) => {
     try {
       const newList = await createList.mutateAsync(name)
       setCurrentListId(newList.id)
       return newList
     } catch {
       return null
     }
  }

  // State for internal selection
  const isLoading = isLoadingLists || (!!effectiveCurrentListId && isLoadingItems)

  const currentList = useMemo(() => 
    lists.find(l => l.id === effectiveCurrentListId) || null,
  [lists, effectiveCurrentListId])

  const updateItem = async (id: string, updates: Partial<ShoppingListItem>) => {
      await updateItemMutation.mutateAsync({ id, updates })
  }

  return {
    // Data
    lists,
    currentList, // Added
    currentListId: effectiveCurrentListId,
    items,
    checkedItems,
    uncheckedItems,
    productPrices,
    
    // State
    isLoading,
    isAddingItem: addItemMutation.isPending, // Renamed from setIsAddingItem to describe value
    
    // Actions
    setCurrentListId,
    addItem,
    updateItem,
    checkItem,
    uncheckItem,
    deleteItem,
    moveItem,
    createList: handleCreateList,
    clearCheckedItems, 
  }
}
