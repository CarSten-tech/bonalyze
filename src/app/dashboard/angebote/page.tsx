'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Tag, ChevronLeft, ShoppingCart, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { getDeals, type Deal } from '@/app/actions/deals'

function DealCard({ deal }: { deal: Deal }) {
  return (
    <Card className="overflow-hidden hover:bg-accent/30 transition-colors">
      <CardContent className="p-0">
        <div className="flex gap-3 p-3">
          {/* Product Image */}
          <div className="relative w-20 h-20 flex-shrink-0 rounded-lg bg-muted overflow-hidden">
            {deal.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={deal.image_url}
                alt={deal.product_name}
                className="w-full h-full object-contain p-1"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Tag className="w-8 h-8 text-muted-foreground/40" />
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-snug line-clamp-2">
              {deal.product_name}
            </p>
            {deal.brand && (
              <p className="text-xs text-muted-foreground mt-0.5">{deal.brand}</p>
            )}
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-primary">
                  {deal.price.toFixed(2).replace('.', ',')} €
                </span>
              </div>
              {deal.grammage && (
                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                  {deal.grammage}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function CategoryPill({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap',
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:bg-muted/80'
      )}
    >
      {label}
    </button>
  )
}

function DealCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex gap-3">
          <Skeleton className="w-20 h-20 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-6 w-1/4 mt-2" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AngebotePage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [deals, setDeals] = useState<Deal[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [total, setTotal] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isPending, startTransition] = useTransition()

  const LIMIT = 30

  const loadDeals = useCallback(async (
    category: string,
    search: string,
    offset = 0,
    append = false
  ) => {
    if (offset === 0) setIsLoading(true)
    else setIsLoadingMore(true)

    try {
      const result = await getDeals(
        category === 'all' ? undefined : category,
        search || undefined,
        LIMIT,
        offset
      )

      if (append) {
        setDeals(prev => [...prev, ...result.deals])
      } else {
        setDeals(result.deals)
      }
      setCategories(result.categories)
      setTotal(result.total)
    } catch (err) {
      console.error('Error loading deals:', err)
      toast.error('Fehler beim Laden der Angebote')
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    const cat = searchParams.get('category') || 'all'
    setSelectedCategory(cat)
    loadDeals(cat, '')
  }, [searchParams, loadDeals])

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
    setSearchQuery('')
    startTransition(() => {
      loadDeals(category, '')
    })
  }

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    startTransition(() => {
      loadDeals(selectedCategory, value)
    })
  }

  const handleLoadMore = () => {
    loadDeals(selectedCategory, searchQuery, deals.length, true)
  }

  const hasMore = deals.length < total

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 -ml-2"
              onClick={() => router.back()}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Angebote</h1>
              <p className="text-xs text-muted-foreground">
                {total} REWE Angebote · Täglich aktualisiert
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Produkt suchen..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 bg-card border-border"
            />
          </div>
        </div>

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide">
          <CategoryPill
            label="Alle"
            active={selectedCategory === 'all'}
            onClick={() => handleCategoryChange('all')}
          />
          {categories.map((cat) => (
            <CategoryPill
              key={cat}
              label={cat}
              active={selectedCategory === cat}
              onClick={() => handleCategoryChange(cat)}
            />
          ))}
        </div>
      </div>

      {/* Deal Grid */}
      <div className="px-4 pt-4 space-y-3">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <DealCardSkeleton key={i} />
          ))
        ) : deals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Tag className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <p className="font-medium">Keine Angebote gefunden</p>
            <p className="text-sm text-muted-foreground mt-1">
              Versuche eine andere Kategorie oder Suche
            </p>
          </div>
        ) : (
          <>
            {deals.map((deal) => (
              <DealCard key={deal.id} deal={deal} />
            ))}

            {hasMore && (
              <Button
                variant="outline"
                className="w-full h-12 rounded-xl"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Mehr laden ({total - deals.length} weitere)
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
