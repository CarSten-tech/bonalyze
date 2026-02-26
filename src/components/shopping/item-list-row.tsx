"use client"

import { Package, Check, MoreVertical, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ShoppingListItem, Offer } from "@/types/shopping"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Minus, Plus } from "lucide-react"

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
  onUpdateItem?: (id: string, updates: Partial<ShoppingListItem>) => void
}

export function ItemListRow({ item, onCheck, onUncheck, onDetailsClick, estimatedPrice, offer, offerHints, standardPrices, categories, onCategoryChange, onUpdateItem }: ItemListRowProps) {
  const handleClick = (e?: React.MouseEvent) => {
    // Only toggle if we didn't click on an interactive element
    if (e && (e.target as HTMLElement).closest('button, [role="combobox"]')) return
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

  const handleQuantityUpdate = (e: React.MouseEvent, delta: number) => {
    e.stopPropagation()
    const current = item.quantity || 1
    const next = Math.max(1, current + delta)
    if (current !== next) {
      onUpdateItem?.(item.id, { quantity: next })
    }
  }

  const UNITS = ["Stk", "g", "kg", "ml", "l", "Pkg"]

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
        onClick={(e) => { e.stopPropagation(); handleClick(); }}
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
           {/* Interactive Stepper (Only when unchecked) */}
           {!item.is_checked && onUpdateItem ? (
             <div className="flex items-center gap-1">
               <div className="flex items-center bg-muted/50 rounded flex-shrink-0 border border-border/50">
                 <button 
                   type="button"
                   aria-label="Menge verringern"
                   title="Menge verringern"
                   onClick={(e) => handleQuantityUpdate(e, -1)}
                   className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-l transition-colors"
                 >
                   <Minus className="w-3 h-3" />
                 </button>
                 <span className="text-xs font-medium w-4 text-center select-none" onClick={(e) => e.stopPropagation()}>{item.quantity || 1}</span>
                 <button 
                   type="button"
                   aria-label="Menge erhöhen"
                   title="Menge erhöhen"
                   onClick={(e) => handleQuantityUpdate(e, 1)}
                   className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-r transition-colors"
                 >
                   <Plus className="w-3 h-3" />
                 </button>
               </div>
               
               <div onClick={(e) => e.stopPropagation()}>
                 <Select 
                   value={item.unit || "Stk"} 
                   onValueChange={(val) => onUpdateItem?.(item.id, { unit: val === "Stk" ? null : val })}
                 >
                   <SelectTrigger className="h-6 px-2 py-0 text-xs bg-muted/50 border-border/50 gap-1 rounded focus:ring-0 w-auto hover:bg-muted">
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     {UNITS.map(u => (
                       <SelectItem key={u} value={u} className="text-xs">{u}</SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
             </div>
           ) : (
             item.quantity || item.unit ? (
               <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                 {item.quantity || 1}{item.unit ? ` ${item.unit}` : 'x'}
               </span>
             ) : null
           )}

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
