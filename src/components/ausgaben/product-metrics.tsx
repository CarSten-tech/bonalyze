'use client'

import { 
  ShoppingCart, TrendingDown, Coins 
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { ProductAnalyticsData } from '@/hooks/use-product-analytics'
import { formatCurrency } from '@/components/common/currency'

interface ProductMetricsProps {
  data: ProductAnalyticsData
}

export function ProductMetrics({ data }: ProductMetricsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Total Purchases & Favorite Store */}
      <Card className="rounded-2xl border-slate-100 shadow-sm overflow-hidden">
        <CardContent className="p-0">
            <div className="flex h-full">
                {/* Left: Count */}
                <div className="flex-1 p-4 bg-blue-50/50 flex flex-col justify-center items-center text-center border-r border-slate-100">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-2">
                        <ShoppingCart className="w-5 h-5" />
                    </div>
                    <span className="text-2xl font-bold text-foreground">{data.totalCount}</span>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {data.totalCount === 1 ? 'Kauf' : 'Käufe'}
                    </span>
                </div>

                {/* Right: Favorite Store */}
                <div className="flex-1 p-4 flex flex-col justify-center items-center text-center">
                    <span className="text-xs text-muted-foreground mb-1">Lieblings-Shop</span>
                    {data.favoriteStore ? (
                        <>
                            <span className="font-bold text-lg text-foreground">{data.favoriteStore.merchantName}</span>
                            <span className="text-xs text-muted-foreground">
                                {data.favoriteStore.count} {data.favoriteStore.count === 1 ? 'Kauf' : 'Käufe'}
                            </span>
                        </>
                    ) : (
                        <span>-</span>
                    )}
                </div>
            </div>
        </CardContent>
      </Card>

      {/* Avg Price & Range */}
      <Card className="rounded-2xl border-slate-100 shadow-sm overflow-hidden">
         <CardContent className="p-0">
             <div className="flex items-center p-4 gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                    <Coins className="w-6 h-6" />
                </div>
                <div>
                    <div className="text-2xl font-bold text-foreground">
                        {formatCurrency(data.avgPrice, { inCents: true })}
                    </div>
                    <div className="text-xs text-muted-foreground font-medium">
                        Durchschnittspreis
                    </div>
                     <div className="text-[10px] text-muted-foreground mt-0.5">
                        {formatCurrency(data.minPrice, { inCents: true })} – {formatCurrency(data.maxPrice, { inCents: true })}
                     </div>
                </div>
             </div>
         </CardContent>
      </Card>

      {/* Cheapest Store Recommendation - Only show if we have more than 1 store, otherwise it's redundant with avg price */}
      {data.cheapestStore && data.storeStats.length > 1 && (
        <Card className="rounded-2xl border-slate-100 shadow-sm col-span-1 md:col-span-2">
            <CardContent className="p-4 flex items-center gap-4">
                 <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 flex-shrink-0">
                     <TrendingDown className="w-5 h-5" />
                 </div>
                 <div className="flex-1">
                     <div className="text-sm font-bold text-foreground uppercase tracking-wide">
                        {data.cheapestStore.merchantName}
                     </div>
                     <div className="text-xs text-muted-foreground">
                        Günstigster Durchschnitt
                     </div>
                 </div>
                 <div className="text-lg font-bold text-green-600">
                    Ø {formatCurrency(data.cheapestStore.avgPrice, { inCents: true })}
                 </div>
            </CardContent>
        </Card>
      )}
    </div>
  )
}
