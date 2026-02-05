'use client'

import { use, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCategoryDetails } from '@/hooks/use-category-details'
import { ProductList } from '@/components/ausgaben/product-list'
import { formatCurrency } from '@/components/common/currency'

interface CategoryDetailPageProps {
  params: Promise<{ slug: string }>
}

export default function CategoryDetailPage({ params }: CategoryDetailPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const yearParam = searchParams.get('year')
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear()

  // Unwrap params using React.use() -> Next.js 15+ pattern, compatible with 14 in some setups or standard promise handling
  // For Next.js 13/14 App Router, params are props, but in 15 they might be promises. 
  // Safety: handle as promise if it is one, or direct object if not. 
  // Actually, in the current Next.js version (14/15 transition), params is a Promise.
  // We'll use a simple useEffect/state pattern to unwrap it safely without 'use' hook issues if not on React 19.
  
  const [slug, setSlug] = useState<string>('')

  useEffect(() => {
    params.then((p) => setSlug(p.slug))
  }, [params])

  const { items, categoryName, isLoading, error } = useCategoryDetails({
    categorySlug: slug,
    year,
  })

  const totalSum = items.reduce((sum, item) => sum + item.price, 0)

  return (
    <div className="space-y-6 pb-24 px-4 pt-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.back()}
          className="-ml-2"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">{isLoading ? 'Laden...' : categoryName}</h1>
          <p className="text-sm text-muted-foreground">
            Ausgaben im Jahr {year}
          </p>
        </div>
      </div>

      {/* Summary Card */}
      {!isLoading && !error && (
        <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10 text-center">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Gesamt
            </p>
            <div className="text-3xl font-bold text-primary">
                {formatCurrency(totalSum, { inCents: true })}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
                {items.length} Produkte gekauft
            </p>
        </div>
      )}

      {/* List */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pl-1">
            Produkte ({items.length})
        </h2>
        
        {error ? (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg">
                {error}
            </div>
        ) : (
            <ProductList items={items} isLoading={isLoading} />
        )}
      </div>
    </div>
  )
}
