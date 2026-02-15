'use client'

import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { formatCurrency } from '@/components/common/currency'
import { CategoryProductItem } from '@/hooks/use-category-details'
import { Store, ShoppingBag } from 'lucide-react'

interface ProductListProps {
  items: CategoryProductItem[]
  isLoading: boolean
}

export function ProductList({ items, isLoading }: ProductListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground bg-muted rounded-xl border border-dashed border-border">
        <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p>Keine Produkte in dieser Kategorie gefunden.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <button 
          key={item.id} 
          onClick={() => {
              // We need to use window location or passed router, 
              // but cleaner is to modify component to accept onProductClick or use useRouter
              window.location.href = `/dashboard/ausgaben/produkt/${encodeURIComponent(item.productName)}`
          }}
          className="w-full bg-card rounded-xl p-4 border border-border shadow-sm flex items-center justify-between hover:bg-muted transition-colors text-left"
        >
          <div className="flex items-center gap-4 overflow-hidden">
            {/* Date Box */}
            <div className="flex flex-col items-center justify-center bg-muted rounded-lg w-12 h-12 min-w-[3rem] text-xs font-medium text-muted-foreground border border-border">
              <span>{format(new Date(item.date), 'dd.', { locale: de })}</span>
              <span>{format(new Date(item.date), 'MM.', { locale: de })}</span>
            </div>

            <div className="min-w-0">
               {/* Product Name */}
               <h3 className="font-semibold text-foreground truncate pr-2">
                 {item.productName}
               </h3>
               
               {/* Merchant & Qty Info */}
               <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span className="flex items-center gap-1">
                     <Store className="w-3 h-3" />
                     {item.merchantName}
                  </span>
                  {item.quantity > 1 && (
                    <>
                      <span>•</span>
                      <span>{item.quantity}x</span>
                    </>
                  )}
               </div>
            </div>
          </div>

          {/* Price */}
          <div className="font-bold text-foreground whitespace-nowrap pl-2">
            {formatCurrency(item.price, { inCents: true })}
          </div>
        </button>
      ))}
    </div>
  )
}
