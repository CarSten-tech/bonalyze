'use client'

import { useState, useMemo, useEffect } from 'react'

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

  // Auto-select first list if none selected
  useEffect(() => {
    if (!currentListId && lists.length > 0) {
      setCurrentListId(lists[0].id)
    }
  }, [lists, currentListId])

  // 3. Items
  const { 
    items, 
    isLoading: isLoadingItems, 
    addItem: addItemMutation, 
    updateItem: updateItemMutation, 
    deleteItem: deleteItemMutation 
  } = useShoppingItems(currentListId)

  // 4. Prices
  const { productPrices } = useProductPrices(householdId)

  // 5. Realtime Sync
  useShoppingListRealtime(householdId, currentListId)

  // Derived State
  const uncheckedItems = useMemo(() => 
    items.filter(i => !i.is_checked), 
  [items])
  
  const checkedItems = useMemo(() => 
    items.filter(i => i.is_checked), 
  [items])

  // --- Actions Wrappers (to match old API) ---

  const addItem = (input: { product_name: string, quantity?: number, unit?: string }) => {
    addItemMutation.mutate(input)
  }

  const checkItem = (id: string) => {
    updateItemMutation.mutate({ id, updates: { is_checked: true } })
  }

  const uncheckItem = (id: string) => {
    updateItemMutation.mutate({ id, updates: { is_checked: false } })
  }

  const deleteItem = (id: string) => {
    deleteItemMutation.mutate(id)
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
  const isSelectingList = !isLoadingLists && lists.length > 0 && !currentListId
  const isLoading = isLoadingLists || isSelectingList || (!!currentListId && isLoadingItems)

  const currentList = useMemo(() => 
    lists.find(l => l.id === currentListId) || null,
  [lists, currentListId])

  const updateItem = (id: string, updates: Partial<ShoppingListItem>) => {
      updateItemMutation.mutate({ id, updates })
  }

  return {
    // Data
    lists,
    currentList, // Added
    currentListId, // Kept for internal use if needed
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
    updateItem, // Added
    checkItem,
    uncheckItem,
    deleteItem,
    createList: handleCreateList,
    clearCheckedItems, 
  }
}
