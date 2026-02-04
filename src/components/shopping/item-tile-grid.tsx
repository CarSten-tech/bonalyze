"use client"

import { ItemTile } from "./item-tile"
import type { ShoppingListItem } from "@/types/shopping"

interface ItemTileGridProps {
  items: ShoppingListItem[]
  onCheck: (id: string) => void
  onUncheck: (id: string) => void
  onDetailsClick?: (item: ShoppingListItem) => void
}

export function ItemTileGrid({ items, onCheck, onUncheck, onDetailsClick }: ItemTileGridProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((item) => (
        <ItemTile
          key={item.id}
          item={item}
          onCheck={onCheck}
          onUncheck={onUncheck}
          onDetailsClick={onDetailsClick}
        />
      ))}
    </div>
  )
}
