"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { ShoppingCart, LayoutGrid, List, Layers } from "lucide-react"
import { 
  AddItemInput, 
  ItemTileGrid, 
  ItemListRow,
  ItemDetailSheet,
  CheckedItemsSection,
  ListSelector 
} from "@/components/shopping"
import { useShoppingList } from "@/hooks/use-shopping-list"
import { useOffers } from "@/hooks/shopping-list/use-offers"
import { createClient } from "@/lib/supabase"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { useCategories } from "@/hooks/use-categories"
import { CategoryHeader } from "@/components/shopping/category-header"
import { cn } from "@/lib/utils"
import type { Offer, ShoppingListItem } from "@/types/shopping"
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
const STORAGE_KEY_GROUPING = "shopping-list-grouping"
const STORAGE_KEY_LIST = "shopping-list-current"

export default function ShoppingListPage() {
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "grid"
    const savedView = localStorage.getItem(STORAGE_KEY_VIEW)
    return savedView === "list" ? "list" : "grid"
  })
  const [isCategorized, setIsCategorized] = useState(() => {
    if (typeof window === "undefined") return true
    const savedGrouping = localStorage.getItem(STORAGE_KEY_GROUPING)
    return savedGrouping !== null ? savedGrouping === "true" : true
  })
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({})
  
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const supabase = createClient()

  // Save view preference to localStorage
  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode)
    localStorage.setItem(STORAGE_KEY_VIEW, mode)
  }

  // Toggle Grouping
  const toggleGrouping = () => {
    const newValue = !isCategorized
    setIsCategorized(newValue)
    localStorage.setItem(STORAGE_KEY_GROUPING, String(newValue))
  }

  // Toggle Category Collapse
  const toggleCategoryCollapse = (categoryId: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }))
  }

  // Get current household ID
  useEffect(() => {
    const getHousehold = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

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
    isLoading: isLoadingList,
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
  const { data: offers } = useOffers(!!householdId)

  const normalizeProductName = useCallback((name: string) => name.toLowerCase().trim(), [])

  const getOfferForItem = useCallback((itemName: string): Offer | undefined => {
    if (!offers) return undefined
    const normalized = normalizeProductName(itemName)
    return offers.find((offerItem) => {
      const offerName = normalizeProductName(offerItem.product_name)
      return offerName.includes(normalized) || normalized.includes(offerName)
    })
  }, [offers, normalizeProductName])

  const getHistoricalPriceCents = useCallback((item: ShoppingListItem): number | undefined => {
    return (item.product_id ? productPrices[item.product_id] : undefined) || productPrices[normalizeProductName(item.product_name)]
  }, [normalizeProductName, productPrices])

  const getBestOfferPriceCents = useCallback((item: ShoppingListItem): number | undefined => {
    const directOffer = getOfferForItem(item.product_name)
    const directOfferCents =
      directOffer && Number.isFinite(directOffer.price) ? Math.round(directOffer.price * 100) : undefined

    const hintedOffer = item.offerHints?.find((hint) => typeof hint.price === "number" && Number.isFinite(hint.price))
    const hintedOfferCents =
      hintedOffer && hintedOffer.price != null ? Math.round(hintedOffer.price * 100) : undefined

    if (directOfferCents !== undefined && hintedOfferCents !== undefined) {
      return Math.min(directOfferCents, hintedOfferCents)
    }
    return directOfferCents ?? hintedOfferCents
  }, [getOfferForItem])

  const pricingSummary = useMemo(() => {
    let pricedItemCount = 0
    let totalCents = 0

    for (const item of uncheckedItems) {
      const historicalPriceCents = getHistoricalPriceCents(item)
      const offerPriceCents = getBestOfferPriceCents(item)
      const selectedPriceCents = offerPriceCents ?? historicalPriceCents

      if (selectedPriceCents === undefined) continue

      pricedItemCount += 1
      totalCents += (item.quantity || 1) * selectedPriceCents
    }

    return {
      pricedItemCount,
      totalCents,
      totalItemCount: uncheckedItems.length,
    }
  }, [uncheckedItems, getBestOfferPriceCents, getHistoricalPriceCents])

  // Group items by category (if enabled)
  const groupedItems = useMemo(() => {
    // If not using categories, return everything as 'uncategorized' effectively (or handle in render)
    // But we reuse the structure for consistency
    const groups: Record<string, ShoppingListItem[]> = {}
    const uncategorized: ShoppingListItem[] = []

    uncheckedItems.forEach(item => {
      if (isCategorized && item.category_id) {
        if (!groups[item.category_id]) groups[item.category_id] = []
        groups[item.category_id].push(item)
      } else {
        uncategorized.push(item)
      }
    })

    return { groups, uncategorized }
  }, [uncheckedItems, isCategorized])

  // Get sorted category IDs based on category sort_order
  const sortedCategoryIds = useMemo(() => {
    if (!categories) return [] as string[]
    return categories
      .filter(c => !!groupedItems.groups?.[c.id])
      .map(c => c.id)
  }, [categories, groupedItems])

  // Duplicate Check Hook
  const allItems = useMemo(() => [...uncheckedItems, ...checkedItems], [uncheckedItems, checkedItems])
  
  const selectedItem = useMemo(() => 
    allItems.find(i => i.id === selectedItemId) || null,
  [allItems, selectedItemId])

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
    setSelectedItemId(item.id)
    setIsDetailOpen(true)
  }

  // Helpers for render
  const renderItemGrid = (items: ShoppingListItem[]) => (
    <ItemTileGrid
      items={items}
      onCheck={checkItem}
      onDetailsClick={handleDetailsClick}
      priceData={productPrices}
      offers={offers}
      getOfferForItem={getOfferForItem}
    />
  )

  const renderItemList = (items: ShoppingListItem[]) => (
    <div className="bg-card rounded-xl border border-border shadow-sm divide-y divide-border">
      {items.map((item) => (
        <ItemListRow
          key={item.id}
          item={item}
          onCheck={checkItem}
          onUncheck={uncheckItem}
          onDetailsClick={handleDetailsClick}
          estimatedPrice={(item.product_id ? productPrices[item.product_id] : undefined) || productPrices[item.product_name.toLowerCase().trim()]}
          offer={getOfferForItem(item.product_name)}
          offerHints={item.offerHints || undefined}
        />
      ))}
    </div>
  )

  // Final loading state
  const isLoading = !householdId || isLoadingList

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
        <div className="flex items-center gap-4">
           {/* Grouping Toggle */}
           <Button
              variant="ghost"
              size="sm"
              onClick={toggleGrouping}
              className={cn(
                "h-7 px-2 rounded-md text-xs font-medium gap-1.5",
                isCategorized 
                  ? "bg-primary/10 text-primary hover:bg-primary/20" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              title={isCategorized ? "Kategorien aktiv" : "Kategorien inaktiv"}
            >
              <Layers className="w-3.5 h-3.5" />
              {isCategorized ? "Kategorien" : "Einfach"}
            </Button>
            
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
            
            {/* 
                Render Logic:
                If categorized -> Render Groups + Uncategorized
                If not categorized -> Render everything as Uncategorized (which contains all items in that mode)
            */}
            
            {isCategorized ? (
                <>
                    {/* Render Sorted Categories */}
                    {sortedCategoryIds.map(catId => {
                      const category = categories?.find(c => c.id === catId)
                      const items = groupedItems.groups[catId]
                      const isCollapsed = collapsedCategories[catId]
                      if (!items?.length) return null
        
                      return (
                        <div key={catId} className="mb-6">
                            <CategoryHeader 
                                name={category?.name || "Kategorie"} 
                                count={items.length}
                                isCollapsed={isCollapsed}
                                onToggle={() => toggleCategoryCollapse(catId)}
                            />
                          
                          {!isCollapsed && (
                              <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                {viewMode === "grid" ? renderItemGrid(items) : renderItemList(items)}
                              </div>
                          )}
                        </div>
                      )
                    })}
        
                    {/* Render Uncategorized Items (always at bottom) */}
                    {groupedItems.uncategorized.length > 0 && (
                      <div className="mb-6">
                         {/* Only show header if there are prioritized categories */}
                         {sortedCategoryIds.length > 0 && (
                            <CategoryHeader name="Sonstiges" count={groupedItems.uncategorized.length} />
                         )}
                         {viewMode === "grid" ? renderItemGrid(groupedItems.uncategorized) : renderItemList(groupedItems.uncategorized)}
                      </div>
                    )}
                </>
            ) : (
                /* Flat View - Render All Items */
                <div className="mt-4">
                    {/* In flat mode, 'uncategorized' contains all items due to the useMemo logic above */}
                    {viewMode === "grid" ? renderItemGrid(groupedItems.uncategorized) : renderItemList(groupedItems.uncategorized)}
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
          const count = pricingSummary.pricedItemCount
          const total = pricingSummary.totalItemCount
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
                  {(pricingSummary.totalCents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
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
        lastChangedBy={selectedItem?.last_changed_by_profile?.display_name}
      />

      {/* Duplicate Warning Dialog */}
      <AlertDialog open={!!duplicateWarning} onOpenChange={() => duplicateWarning?.onCancel()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Produkt existiert bereits</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{duplicateWarning?.matchName}&quot; steht schon auf der Liste. Möchtest du &quot;{duplicateWarning?.originalName}&quot; trotzdem hinzufügen?
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
