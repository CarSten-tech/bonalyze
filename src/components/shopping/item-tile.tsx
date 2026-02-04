"use client"

import { Package, Check, MoreVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ShoppingListItem } from "@/types/shopping"

interface ItemTileProps {
  item: ShoppingListItem
  onCheck: (id: string) => void
  onUncheck: (id: string) => void
  onDetailsClick?: (item: ShoppingListItem) => void
}

export function ItemTile({ item, onCheck, onUncheck, onDetailsClick }: ItemTileProps) {
  const handleClick = () => {
    if (item.is_checked) {
      onUncheck(item.id)
    } else {
      onCheck(item.id)
    }
  }

  const handleDetailsClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDetailsClick?.(item)
  }

  // Format quantity display
  const quantityDisplay = item.quantity && (item.quantity > 1 || item.unit)
    ? `${item.quantity}${item.unit ? ` ${item.unit}` : 'x'}`
    : item.unit || null

  return (
    <div className="relative">
      {/* Three-dots menu button */}
      <button
        type="button"
        title="Mehr Optionen"
        onClick={handleDetailsClick}
        className={cn(
          "absolute top-1 right-1 z-10",
          "w-6 h-6 rounded-full flex items-center justify-center",
          "text-slate-400 hover:text-slate-600 hover:bg-slate-100",
          "transition-colors"
        )}
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {/* Main tile button */}
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "flex flex-col items-center justify-center gap-1",
          "w-full aspect-square p-3",
          "rounded-xl border transition-all",
          "active:scale-95",
          item.is_checked
            ? "bg-slate-50 border-slate-200 opacity-60"
            : "bg-white border-slate-200 hover:border-primary/50 hover:shadow-sm"
        )}
      >
        {/* Icon */}
        <div
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            item.is_checked
              ? "bg-green-100 text-green-600"
              : "bg-slate-100 text-slate-500"
          )}
        >
          {item.is_checked ? (
            <Check className="w-5 h-5" />
          ) : (
            <Package className="w-5 h-5" />
          )}
        </div>

        {/* Name */}
        <span
          className={cn(
            "text-sm font-medium text-center leading-tight",
            "line-clamp-2 w-full",
            item.is_checked && "line-through text-slate-400"
          )}
        >
          {item.product_name}
        </span>

        {/* Quantity (if present) */}
        {quantityDisplay && (
          <span
            className={cn(
              "text-xs text-slate-400",
              item.is_checked && "line-through"
            )}
          >
            {quantityDisplay}
          </span>
        )}
      </button>
    </div>
  )
}
