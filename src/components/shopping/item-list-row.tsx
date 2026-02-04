"use client"

import { Package, Check, MoreVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ShoppingListItem } from "@/types/shopping"

interface ItemListRowProps {
  item: ShoppingListItem
  onCheck: (id: string) => void
  onUncheck: (id: string) => void
  onDetailsClick?: (item: ShoppingListItem) => void
  estimatedPrice?: number
}

export function ItemListRow({ item, onCheck, onUncheck, onDetailsClick, estimatedPrice }: ItemListRowProps) {
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
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border transition-all",
        item.is_checked
          ? "bg-slate-50 border-slate-200 opacity-60"
          : "bg-white border-slate-200 hover:border-primary/50"
      )}
    >
      {/* Checkbox area */}
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0",
          "transition-colors",
          item.is_checked
            ? "bg-green-500 border-green-500 text-white"
            : "border-slate-300 hover:border-primary"
        )}
      >
        {item.is_checked && <Check className="w-4 h-4" />}
      </button>

      {/* Icon */}
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
          item.is_checked
            ? "bg-green-100 text-green-600"
            : "bg-slate-100 text-slate-500"
        )}
      >
        {item.is_checked ? (
          <Check className="w-4 h-4" />
        ) : (
          <Package className="w-4 h-4" />
        )}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <span
          className={cn(
            "text-sm font-medium block truncate leading-tight",
            item.is_checked && "line-through text-slate-400"
          )}
        >
          {item.product_name}
        </span>
        {estimatedPrice !== undefined && (
          <span className="text-xs text-slate-400">
            ~{(estimatedPrice / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
          </span>
        )}
        {/* Placeholder for subtitle/category if we had it */}
        {/* <span className="text-xs text-slate-400">Gemüse</span> */}
      </div>

      {/* Quantity Badge */}
      {quantityDisplay && (
        <div 
          className={cn(
            "flex items-center px-2 py-1 rounded bg-slate-100 min-w-[2rem] justify-center mx-2",
            item.is_checked && "opacity-50"
          )}
        >
          <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
            {quantityDisplay}
          </span>
        </div>
      )}

      {/* Three-dots menu button */}
      <button
        type="button"
        title="Mehr Optionen"
        onClick={handleDetailsClick}
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
          "text-slate-400 hover:text-slate-600 hover:bg-slate-100",
          "transition-colors"
        )}
      >
        <MoreVertical className="w-4 h-4" />
      </button>
    </div>
  )
}
