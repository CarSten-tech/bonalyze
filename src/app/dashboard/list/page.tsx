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
import { useCategories } from "@/hooks/use-categories"
import { CategoryHeader } from "@/components/shopping/category-header"
import { useMemo } from "react"
import { cn } from "@/lib/utils"
import type { ShoppingListItem } from "@/types/shopping"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useItemDuplicateCheck } from "@/hooks/shopping-list/use-duplicate-check"

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
    moveItem,
    createList,
    clearCheckedItems,
    productPrices,
  } = useShoppingList({ householdId })

  const { data: categories } = useCategories()

  // Group items by category
  const groupedItems = useMemo(() => {
    if (!uncheckedItems.length) return { groups: {}, uncategorized: [] }
    
    const groups: Record<string, ShoppingListItem[]> = {}
    const uncategorized: ShoppingListItem[] = []

    uncheckedItems.forEach(item => {
      if (item.category_id) {
        if (!groups[item.category_id]) groups[item.category_id] = []
        groups[item.category_id].push(item)
      } else {
        uncategorized.push(item)
      }
    })

    return { groups, uncategorized }
  }, [uncheckedItems])

  // Get sorted category IDs based on category sort_order
  const sortedCategoryIds = useMemo(() => {
    if (!categories) return []
    return categories
      .filter(c => groupedItems.groups?.[c.id])
      .map(c => c.id)
  }, [categories, groupedItems])

  // Duplicate Check Hook
  const allItems = [...uncheckedItems, ...checkedItems]
  const { duplicateWarning, checkDuplicate } = useItemDuplicateCheck(allItems)

  const handleAddItem = async ({ product_name, quantity, unit }: { product_name: string, quantity?: number, unit?: string }) => {
    checkDuplicate(product_name, async () => {
      await addItem({ product_name, quantity, unit })
    })
  }



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
          <div className="flex bg-muted rounded-lg p-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewChange("grid")}
              className={cn(
                "h-7 w-7 p-0 rounded-md",
                viewMode === "grid" 
                  ? "bg-card shadow-sm text-primary" 
                  : "text-muted-foreground hover:text-foreground"
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
                  ? "bg-card shadow-sm text-primary" 
                  : "text-muted-foreground hover:text-foreground"
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
          onAdd={handleAddItem}
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
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <ShoppingCart className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">
              Liste ist leer
            </h3>
            <p className="text-sm text-muted-foreground max-w-[200px]">
              Füge Produkte hinzu, die du einkaufen möchtest
            </p>
          </div>
        )}



        {/* Unchecked Items */}
        {!isLoading && uncheckedItems.length > 0 && (
          <div>
            <h2 className="sr-only">Noch zu kaufen</h2>
            
            {/* Render Sorted Categories */}
            {sortedCategoryIds.map(catId => {
              const category = categories?.find(c => c.id === catId)
              const items = groupedItems.groups[catId]
              if (!items?.length) return null

              return (
                <div key={catId} className="mb-6">
                  <CategoryHeader 
                    name={category?.name || "Kategorie"} 
                    emoji={category?.emoji} 
                    count={items.length}
                  />
                  {viewMode === "grid" ? (
                    <ItemTileGrid
                      items={items}
                      onCheck={checkItem}
                      onDetailsClick={handleDetailsClick}
                      priceData={productPrices}
                    />
                  ) : (
                    <div className="bg-card rounded-xl border border-border shadow-sm divide-y divide-border">
                      {items.map((item) => (
                        <ItemListRow
                          key={item.id}
                          item={item}
                          onCheck={checkItem}
                          onUncheck={uncheckItem}
                          onDetailsClick={handleDetailsClick}
                          estimatedPrice={(item.product_id ? productPrices[item.product_id] : undefined) || productPrices[item.product_name.toLowerCase().trim()]}
                          offerHints={item.offerHints || undefined}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Render Uncategorized Items */}
            {groupedItems.uncategorized.length > 0 && (
              <div className="mb-6">
                 {/* Only show header if there are also categorized items, or if explicit sorting is desired */}
                 {sortedCategoryIds.length > 0 && (
                    <CategoryHeader name="Sonstiges" emoji="🛒" count={groupedItems.uncategorized.length} />
                 )}
                 {viewMode === "grid" ? (
                    <ItemTileGrid
                      items={groupedItems.uncategorized}
                      onCheck={checkItem}
                      onDetailsClick={handleDetailsClick}
                      priceData={productPrices}
                    />
                  ) : (
                    <div className="bg-card rounded-xl border border-border shadow-sm divide-y divide-border">
                      {groupedItems.uncategorized.map((item) => (
                        <ItemListRow
                          key={item.id}
                          item={item}
                          onCheck={checkItem}
                          onUncheck={uncheckItem}
                          onDetailsClick={handleDetailsClick}
                          estimatedPrice={(item.product_id ? productPrices[item.product_id] : undefined) || productPrices[item.product_name.toLowerCase().trim()]}
                          offerHints={item.offerHints || undefined}
                        />
                      ))}
                    </div>
                  )}
              </div>
            )}
          </div>
        )}

        {/* Divider */}
        {!isLoading && uncheckedItems.length > 0 && checkedItems.length > 0 && (
          <hr className="border-border" />
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
            <div 
              className="fixed left-0 right-0 bg-card/95 backdrop-blur border-t border-border p-3 px-4 shadow-sm z-10 flex justify-between items-center text-sm"
              style={{ bottom: "var(--bottom-nav-height)" }}
            >
              <span className="text-muted-foreground">Geschätzt (offen):</span>
              <div className="flex items-center gap-2">
                {isPartial ? (
                   <span className="text-amber-600 text-xs font-medium flex items-center gap-1">
                     ⚠️ nur {count}/{total}
                   </span>
                ) : (
                   <span className="text-muted-foreground text-xs">({count}/{total})</span>
                )}
                <span className="font-bold text-foreground">
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
        onMove={moveItem}
        lists={lists}
      />

      {/* Duplicate Warning Dialog */}
      <AlertDialog open={!!duplicateWarning} onOpenChange={() => duplicateWarning?.onCancel()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Produkt existiert bereits</AlertDialogTitle>
            <AlertDialogDescription>
              "{duplicateWarning?.matchName}" steht schon auf der Liste. Möchtest du "{duplicateWarning?.originalName}" trotzdem hinzufügen?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => duplicateWarning?.onCancel()}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={() => duplicateWarning?.onConfirm()}>Hinzufügen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
