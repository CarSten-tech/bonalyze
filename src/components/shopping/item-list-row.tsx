"use client"

import { Package, Check, MoreVertical, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ShoppingListItem, Offer } from "@/types/shopping"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"

interface ItemListRowProps {
  item: ShoppingListItem
  onCheck: (id: string) => void
  onUncheck: (id: string) => void
  onDetailsClick?: (item: ShoppingListItem) => void
  estimatedPrice?: number
  offer?: Offer
  offerHints?: Array<{
    store: string
    price: number | null
    valid_until: string | null
  }>
  standardPrices?: Array<{
    merchant_name: string
    price_cents: number
  }>
  categories?: { id: string; name: string }[]
  onCategoryChange?: (itemId: string, categoryId: string) => void
}

export function ItemListRow({ item, onCheck, onUncheck, onDetailsClick, estimatedPrice, offer, offerHints, standardPrices, categories, onCategoryChange }: ItemListRowProps) {
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

  const hasOfferInfo = !item.is_checked && (Boolean(offer) || Boolean(offerHints?.length) || Boolean(standardPrices?.length))
  const primaryOfferHint = offerHints?.[0]

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

      {/* Name and Price/Offer Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-center gap-2">
           <span
             className={cn(
               "text-sm font-medium block truncate leading-tight",
               item.is_checked && "line-through text-muted-foreground"
             )}
           >
             {item.product_name}
           </span>

           {/* Uncategorized indicator inline select */}
           {!item.category_id && !item.is_checked && !offer && (
             categories && onCategoryChange ? (
               <div onClick={(e) => e.stopPropagation()}>
                 <Select onValueChange={(val) => onCategoryChange(item.id, val)}>
                   <SelectTrigger 
                     aria-label="Kategorie zuweisen" 
                     title="Kategorie zuweisen" 
                     className="flex h-5 items-center gap-0.5 text-[10px] font-medium text-amber-600 bg-amber-100 px-1.5 py-0 rounded-full flex-shrink-0 border-none shadow-none hover:bg-amber-200 focus:ring-0 [&>svg]:hidden"
                   >
                     <HelpCircle className="w-3 h-3" />
                   </SelectTrigger>
                   <SelectContent>
                     {categories.map(cat => (
                       <SelectItem key={cat.id} value={cat.id} className="text-xs">
                         {cat.name}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
             ) : (
               <button
                 type="button"
                 onClick={handleDetailsClick}
                 className="flex items-center gap-0.5 text-[10px] font-medium text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full flex-shrink-0"
               >
                 <HelpCircle className="w-3 h-3" />
               </button>
             )
           )}
        </div>

        {/* Price Information */}
        <div className="flex items-center gap-2">
          {estimatedPrice !== undefined && (
            <span className={cn(
              "text-xs",
              hasOfferInfo ? "text-red-600 line-through decoration-slate-400/50" : "text-muted-foreground"
            )}>
              {hasOfferInfo ? '' : '~'}
              {(estimatedPrice / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
            </span>
          )}
          {offer && (
             <span className="text-xs font-bold text-red-600">
                {offer.price.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
             </span>
           )}
        </div>

        {/* Offer row in same shape as previous "hint row", but in red */}
        {offer && !item.is_checked && (
          <span className="text-[11px] text-red-600 font-medium mt-0.5 animate-in fade-in slide-in-from-top-1 duration-300">
            🏷{' '}
            <span className="font-bold">
              {offer.store} {offer.price.toFixed(2).replace('.', ',')} €
            </span>
            {offer.valid_until && (
              <span className="text-red-500/80">
                {' '}
                (bis {new Date(offer.valid_until).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })})
              </span>
            )}
          </span>
        )}

        {offerHints && offerHints.length > 0 && !item.is_checked && !offer && (
          <span className="text-[11px] text-red-600 font-medium mt-0.5 animate-in fade-in slide-in-from-top-1 duration-300 flex flex-wrap items-center gap-1">
            <span>🏷 </span>
            {offerHints.map((hint, index) => (
              <span key={hint.store}>
                {index > 0 && ' · '}
                <span className={index === 0 ? 'font-bold' : 'font-normal text-red-500/80'}>
                  {hint.store}
                  {hint.price != null ? ` ${hint.price.toFixed(2).replace('.', ',')} €` : ''}
                </span>
              </span>
            ))}
            {primaryOfferHint?.valid_until && (
              <span className="text-red-500/80">
                {' '}
                (bis {new Date(primaryOfferHint.valid_until).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })})
              </span>
            )}
          </span>
        )}

        {/* Standard Price Row (if no offers, but standard prices exist) */}
        {standardPrices && standardPrices.length > 0 && !item.is_checked && !offer && (!offerHints || offerHints.length === 0) && (
          <span className="text-[11px] text-emerald-600 font-medium mt-0.5 animate-in fade-in slide-in-from-top-1 duration-300 flex flex-wrap items-center gap-1">
            <span>✓ </span>
            {standardPrices.slice(0, 3).map((std, index) => (
              <span key={std.merchant_name}>
                {index > 0 && ' · '}
                <span className={index === 0 ? 'font-bold' : 'font-normal text-emerald-600/80'}>
                  {std.merchant_name} {(std.price_cents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                </span>
              </span>
            ))}
            {standardPrices.length > 3 && (
              <span className="text-emerald-600/80 w-auto ml-1">(+{standardPrices.length - 3})</span>
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
