"use client"

import { Package, Check, MoreVertical, Percent, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ShoppingListItem, Offer } from "@/types/shopping"

interface ItemTileProps {
  item: ShoppingListItem
  onCheck: (id: string) => void
  onUncheck: (id: string) => void
  onDetailsClick?: (item: ShoppingListItem) => void
  estimatedPrice?: number
  offer?: Offer
}

export function ItemTile({ item, onCheck, onUncheck, onDetailsClick, estimatedPrice, offer }: ItemTileProps) {
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
      {/* Offer Badge */}
      {offer && !item.is_checked && (
        <div className="absolute top-1 left-1 z-10 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm animate-in fade-in zoom-in duration-300">
           <Percent className="w-3 h-3" />
           {offer.discount_percent && <span>-{offer.discount_percent}%</span>}
        </div>
      )}

      {/* Uncategorized indicator */}
      {!item.category_id && !item.is_checked && !offer && (
        <button
          type="button"
          onClick={handleDetailsClick}
          className="absolute top-1 left-1 z-10 bg-amber-100 text-amber-600 text-[10px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
        >
          <HelpCircle className="w-3 h-3" />
        </button>
      )}

      {/* Three-dots menu button */}
      <button
        type="button"
        title="Mehr Optionen"
        onClick={handleDetailsClick}
        className={cn(
          "absolute top-1 right-1 z-10",
          "w-6 h-6 rounded-full flex items-center justify-center",
          "text-muted-foreground hover:text-muted-foreground hover:bg-muted",
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
            ? "bg-muted border-border opacity-60"
            : "bg-card border-border hover:border-primary/50 hover:shadow-sm"
        )}
      >
        {/* Icon */}
        <div
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            item.is_checked
              ? "bg-green-100 text-green-600"
              : "bg-muted text-muted-foreground"
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
            item.is_checked && "line-through text-muted-foreground"
          )}
        >
          {item.product_name}
        </span>

        {/* Quantity (if present) */}
        {quantityDisplay && (
          <span
            className={cn(
              "text-xs text-muted-foreground",
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
