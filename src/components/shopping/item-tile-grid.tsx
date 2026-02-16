"use client"

import { ItemTile } from "./item-tile"
import type { ShoppingListItem } from "@/types/shopping"

interface ItemTileGridProps {
  items: ShoppingListItem[]
  onCheck: (id: string) => void
  onUncheck?: (id: string) => void
  onDetailsClick: (item: ShoppingListItem) => void
  priceData?: Record<string, number>
}

export function ItemTileGrid({ 
  items, 
  onCheck, 
  onUncheck,
  onDetailsClick,
  priceData 
}: ItemTileGridProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((item) => (
        <ItemTile
          key={item.id}
          item={item}
          onCheck={() => onCheck(item.id)}
          onUncheck={() => onUncheck?.(item.id)}
          onDetailsClick={() => onDetailsClick(item)}
          estimatedPrice={(item.product_id ? priceData?.[item.product_id] : undefined) || priceData?.[item.product_name.toLowerCase().trim()]}
        />
      ))}
    </div>
  )
}
