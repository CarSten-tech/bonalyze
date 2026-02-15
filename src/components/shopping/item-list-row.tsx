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
  offerHints?: Array<{
    store: string
    price: number | null
    valid_until: string | null
  }>
}

export function ItemListRow({ item, onCheck, onUncheck, onDetailsClick, estimatedPrice, offerHints }: ItemListRowProps) {
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
          ? "bg-muted border-border opacity-60"
          : "bg-card border-border hover:border-primary/50"
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
            : "bg-muted text-muted-foreground"
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
            item.is_checked && "line-through text-muted-foreground"
          )}
        >
          {item.product_name}
        </span>
        {estimatedPrice !== undefined && (
          <span className="text-xs text-muted-foreground">
            ~{(estimatedPrice / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
          </span>
        )}
        {offerHints && offerHints.length > 0 && !item.is_checked && (
          <span className="text-[11px] text-green-600 font-medium mt-0.5">
            🏷 {offerHints.map((h, i) => (
              <span key={h.store}>
                {i > 0 && ' · '}
                <span className={i === 0 ? 'font-bold' : 'font-normal text-green-500/80'}>
                  {h.store}{h.price != null ? ` ${h.price.toFixed(2).replace('.', ',')} €` : ''}
                </span>
              </span>
            ))}
            {offerHints[0]?.valid_until && (
              <span className="text-green-500/70"> (bis {new Date(offerHints[0].valid_until).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })})</span>
            )}
          </span>
        )}
      </div>

      {/* Quantity Badge */}
      {quantityDisplay && (
        <div 
          className={cn(
            "flex items-center px-2 py-1 rounded bg-muted min-w-[2rem] justify-center mx-2",
            item.is_checked && "opacity-50"
          )}
        >
          <span className="text-xs font-bold text-foreground whitespace-nowrap">
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
          "text-muted-foreground hover:text-muted-foreground hover:bg-muted",
          "transition-colors"
        )}
      >
        <MoreVertical className="w-4 h-4" />
      </button>
    </div>
  )
}
