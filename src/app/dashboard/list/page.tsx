"use client"

import { useEffect, useState } from "react"
import { ShoppingCart, LayoutGrid, List } from "lucide-react"
import { 
  AddItemInput, 
  ItemTileGrid, 
  ItemListRow,
  ItemDetailSheet,
  CheckedItemsSection,
  ListSelector 
} from "@/components/shopping"
import { useShoppingList } from "@/hooks/use-shopping-list"
import { createClient } from "@/lib/supabase"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ShoppingListItem } from "@/types/shopping"

type ViewMode = "grid" | "list"

const STORAGE_KEY_VIEW = "shopping-list-view"
const STORAGE_KEY_LIST = "shopping-list-current"

export default function ShoppingListPage() {
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [selectedItem, setSelectedItem] = useState<ShoppingListItem | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const supabase = createClient()

  // Load view preference from localStorage
  useEffect(() => {
    const savedView = localStorage.getItem(STORAGE_KEY_VIEW) as ViewMode | null
    if (savedView === "grid" || savedView === "list") {
      setViewMode(savedView)
    }
  }, [])

  // Save view preference to localStorage
  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode)
    localStorage.setItem(STORAGE_KEY_VIEW, mode)
  }

  // Get current household ID
  const [debugUserId, setDebugUserId] = useState<string>('')
  
  useEffect(() => {
    const getHousehold = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setDebugUserId(user.id)

      const { data } = await supabase
        .from("household_members")
        .select("household_id")
        .eq("user_id", user.id)
        .single()

      if (data) {
        setHouseholdId(data.household_id)
      }
    }

    getHousehold()
  }, [supabase])

  const {
    lists,
    currentList,
    uncheckedItems,
    checkedItems,
    isLoading,
    isAddingItem,
    setCurrentListId,
    addItem,
    updateItem,
    checkItem,
    uncheckItem,
    deleteItem,
    createList,
    clearCheckedItems,
    productPrices,
  } = useShoppingList({ householdId })

  // Load last selected list from localStorage
  useEffect(() => {
    if (lists.length > 0 && householdId) {
      const savedListId = localStorage.getItem(`${STORAGE_KEY_LIST}-${householdId}`)
      if (savedListId && lists.some(l => l.id === savedListId)) {
        setCurrentListId(savedListId)
      }
    }
  }, [lists, householdId, setCurrentListId])

  // Save current list to localStorage when it changes
  const handleListChange = (listId: string) => {
    setCurrentListId(listId)
    if (householdId) {
      localStorage.setItem(`${STORAGE_KEY_LIST}-${householdId}`, listId)
    }
  }

  // Open detail sheet for an item
  const handleDetailsClick = (item: ShoppingListItem) => {
    setSelectedItem(item)
    setIsDetailOpen(true)
  }

  // Explicitly define states to prevent flicker
  const hasLists = lists.length > 0
  const isSelectingList = hasLists && !currentList?.id
  // Show loading if: 
  // 1. We don't have a household ID yet
  // 2. The hook says it's loading
  // 3. We have lists but haven't selected one yet (transition)
  const showLoading = !householdId || isLoading || isSelectingList

  return (
    <div className="pt-4 pb-32">
      {/* Header */}
      <div className="mb-6 px-1 flex items-center justify-between">
        <ListSelector
          lists={lists}
          currentList={currentList}
          onSelect={handleListChange}
          onCreate={createList}
        />
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewChange("grid")}
              className={cn(
                "h-7 w-7 p-0 rounded-md",
                viewMode === "grid" 
                  ? "bg-white shadow-sm text-primary" 
                  : "text-slate-500 hover:text-slate-700"
              )}
              title="Kachelansicht"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewChange("list")}
              className={cn(
                "h-7 w-7 p-0 rounded-md",
                viewMode === "list" 
                  ? "bg-white shadow-sm text-primary" 
                  : "text-slate-500 hover:text-slate-700"
              )}
              title="Listenansicht"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-4 space-y-6">
        {/* Add Item Input */}
        <AddItemInput
          onAdd={addItem}
          isLoading={isAddingItem}
        />

        {/* Loading State */}
        {isLoading && (
          <div className={viewMode === "grid" ? "grid grid-cols-3 gap-3" : "space-y-2"}>
            {[...Array(6)].map((_, i) => (
              <Skeleton 
                key={i} 
                className={viewMode === "grid" ? "aspect-square rounded-xl" : "h-16 rounded-lg"} 
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && uncheckedItems.length === 0 && checkedItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <ShoppingCart className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-1">
              Liste ist leer
            </h3>
            <p className="text-sm text-slate-500 max-w-[200px]">
              Füge Produkte hinzu, die du einkaufen möchtest
            </p>
          </div>
        )}

        {/* Unchecked Items */}
        {!isLoading && uncheckedItems.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-slate-500 mb-3">
              Noch zu kaufen ({uncheckedItems.length})
            </h2>
            {viewMode === "grid" ? (
              <ItemTileGrid
                items={uncheckedItems}
                onCheck={checkItem}
                onUncheck={uncheckItem}
                onDetailsClick={handleDetailsClick}
              />
            ) : (
              <div className="space-y-2">
                {uncheckedItems.map((item) => (
                  <ItemListRow
                    key={item.id}
                    item={item}
                    onCheck={checkItem}
                    onUncheck={uncheckItem}
                    onDetailsClick={handleDetailsClick}
                    estimatedPrice={(item.product_id ? productPrices[item.product_id] : undefined) || productPrices[item.product_name.toLowerCase().trim()]}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Divider */}
        {!isLoading && uncheckedItems.length > 0 && checkedItems.length > 0 && (
          <hr className="border-slate-200" />
        )}

        {/* Checked Items Section */}
        {!isLoading && (
          <CheckedItemsSection
            items={checkedItems}
            onUncheck={uncheckItem}
            onClearAll={clearCheckedItems}
          />
        )}
      </div>

      {/* Estimated Total Footer (if > 0) */}
      {!isLoading && (
        (() => {
          const itemsWithPrice = uncheckedItems.filter(i => (i.product_id && productPrices[i.product_id]) || productPrices[i.product_name.toLowerCase().trim()])
          const count = itemsWithPrice.length
          const total = uncheckedItems.length
          const hasAnyPrice = count > 0
          
          if (!hasAnyPrice) return null

          const isPartial = count < total

          return (
            <div className="fixed bottom-[4.5rem] left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-200 p-3 px-4 shadow-sm z-10 flex justify-between items-center text-sm">
              <span className="text-slate-500">Geschätzt (offen):</span>
              <div className="flex items-center gap-2">
                {isPartial ? (
                   <span className="text-amber-600 text-xs font-medium flex items-center gap-1">
                     ⚠️ nur {count}/{total}
                   </span>
                ) : (
                   <span className="text-slate-400 text-xs">({count}/{total})</span>
                )}
                <span className="font-bold text-slate-900">
                    {(uncheckedItems.reduce((sum, item) => {
                        const price = (item.product_id ? productPrices[item.product_id] : undefined) 
                                || productPrices[item.product_name.toLowerCase().trim()] 
                                || 0
                        return sum + (item.quantity || 1) * price
                    }, 0) / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                </span>
              </div>
            </div>
          )
        })()
      )}

      {/* Item Detail Sheet */}
      <ItemDetailSheet
        item={selectedItem}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onUpdate={updateItem}
        onDelete={deleteItem}
      />
    </div>
  )
}
