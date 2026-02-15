'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useProductAnalytics } from '@/hooks/use-product-analytics'
import { StoreDistributionChart, PriceHistoryChart, StorePriceComparison } from '@/components/ausgaben/product-charts'
import { ProductMetrics } from '@/components/ausgaben/product-metrics'

interface ProductPageProps {
  params: Promise<{ name: string }>
}

export default function ProductPage({ params }: ProductPageProps) {
  const router = useRouter()
  const [productName, setProductName] = useState<string>('')

  useEffect(() => {
    params.then((p) => setProductName(p.name))
  }, [params])

  const { data, isLoading, error } = useProductAnalytics(productName)

  if (isLoading) {
      return (
          <div className="p-6 space-y-6 animate-pulse">
              <div className="h-8 bg-muted w-1/2 rounded-lg" />
              <div className="h-64 bg-muted rounded-2xl" />
              <div className="grid grid-cols-2 gap-4">
                  <div className="h-32 bg-muted rounded-2xl" />
                  <div className="h-32 bg-muted rounded-2xl" />
              </div>
          </div>
      )
  }

  if (error || !data) {
     return (
         <div className="p-6 text-center">
             <h1 className="text-xl font-bold text-red-500">Fehler</h1>
             <p className="text-muted-foreground">{error || 'Produkt nicht gefunden'}</p>
             <Button variant="ghost" onClick={() => router.back()} className="mt-4">
                 Zurück
             </Button>
         </div>
     )
  }

  const decodedName = decodeURIComponent(productName)

  return (
    <div className="pb-24 px-4 pt-2 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.back()}
          className="-ml-2 text-muted-foreground hover:text-foreground hover:bg-transparent"
        >
          <ChevronLeft className="h-6 w-6" />
          <span className="sr-only">Zurück</span>
        </Button>
        <span className="text-sm font-medium text-muted-foreground" onClick={() => router.back()}>Zurück</span>
        <div className="flex-1" />
        <Button variant="default" size="sm" className="rounded-full px-4 bg-emerald-500 hover:bg-emerald-600">
            Bearbeiten
        </Button>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground leading-tight">
            {decodedName}
        </h1>
        {data.categoryName && (
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground mb-1">
                {data.categoryName}
            </div>
        )}
        <p className="text-sm text-muted-foreground">
            Produktinformationen und Statistiken
        </p>
      </div>
      
      {/* Metrics */}
      <ProductMetrics data={data} />

      {/* Charts */}
      <StoreDistributionChart storeStats={data.storeStats} />
      
      <StorePriceComparison storeStats={data.storeStats} />

      <PriceHistoryChart priceHistory={data.priceHistory} />
    </div>
  )
}
