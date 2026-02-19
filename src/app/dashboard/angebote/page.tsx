'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Tag, ChevronLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { getOffers, getOfferOptions, type Offer } from '@/app/actions/offers'
import { getStoreIcon } from '@/components/dashboard/receipt-list-item'

const OFFERS_REFERENCE_NOW_MS = Date.now()

function OfferCard({ offer }: { offer: Offer }) {
  const [imageError, setImageError] = useState(false)

  return (
    <Card className="overflow-hidden hover:bg-accent/30 transition-colors">
      <CardContent className="p-0">
        <div className="flex gap-3 p-3">
          {/* Product Image */}
          <div className="relative w-20 h-20 flex-shrink-0 rounded-lg bg-white overflow-hidden border border-border/50">
            {offer.image_url && !imageError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={offer.image_url}
                alt={offer.product_name}
                className="w-full h-full object-contain p-1"
                loading="lazy"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <Tag className="w-8 h-8 text-muted-foreground/40" />
              </div>
            )}
            {offer.discount_percent && (
              <div className="absolute top-0 left-0 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-br-md">
                -{offer.discount_percent}%
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-sm leading-snug line-clamp-2">
                  {offer.product_name}
                </p>
                <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 h-5 font-normal flex items-center gap-1">
                 {getStoreIcon(offer.store)}
                 <span>{offer.store}</span>
                </Badge>
              </div>
              {offer.price_per_unit && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{offer.price_per_unit}</p>
              )}
            </div>
            
            <div className="flex items-end justify-between mt-2">
              <div className="flex flex-col">
                 <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-primary leading-none">
                      {offer.price != null ? `${offer.price.toFixed(2).replace('.', ',')} €` : '—'}
                    </span>
                    {offer.original_price && offer.original_price > offer.price && (
                      <span className="text-xs text-muted-foreground line-through decoration-border">
                        {offer.original_price.toFixed(2).replace('.', ',')}
                      </span>
                    )}
                 </div>
                {offer.valid_until && (
                  <span className={cn(
                    "text-[10px] mt-1.5 inline-block",
                    // Highlight if expiring soon (within 2 days)
                    new Date(offer.valid_until).getTime() - OFFERS_REFERENCE_NOW_MS < 2 * 24 * 60 * 60 * 1000
                      ? "text-orange-600 dark:text-orange-400 font-medium"
                      : "text-muted-foreground"
                  )}>
                    Bis {new Date(offer.valid_until).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function FilterPill({
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
        'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap border',
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-background text-muted-foreground border-border hover:bg-muted'
      )}
    >
      {label}
    </button>
  )
}

function OfferCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex gap-3">
          <Skeleton className="w-20 h-20 rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-3 w-3/4" />
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

  const [offers, setOffers] = useState<Offer[]>([])
  const [stores, setStores] = useState<string[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [total, setTotal] = useState(0)
  
  const [selectedStore, setSelectedStore] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const LIMIT = 30

  const loadOptions = useCallback(async (store: string) => {
    try {
      const options = await getOfferOptions(store === 'all' ? undefined : store)
      setStores(options.stores)
      setCategories(options.categories)
    } catch (err) {
      console.error('Error loading filter options:', err)
    }
  }, [])

  const loadOffers = useCallback(async (
    store: string,
    category: string,
    search: string,
    offset = 0,
    append = false
  ) => {
    if (offset === 0) setIsLoading(true)
    else setIsLoadingMore(true)

    try {
      const result = await getOffers(
        store === 'all' ? undefined : store,
        category === 'all' ? undefined : category,
        search || undefined,
        LIMIT,
        offset
      )

      if (append) {
        setOffers(prev => [...prev, ...result.offers])
      } else {
        setOffers(result.offers)
      }
      setTotal(result.total)
    } catch (err) {
      console.error('Error loading offers:', err)
      toast.error('Fehler beim Laden der Angebote')
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [])

  // Reload categories per selected store (stores remain globally active)
  useEffect(() => {
    loadOptions(selectedStore)
  }, [selectedStore, loadOptions])

  // Initial load
  useEffect(() => {
    const store = searchParams.get('store') || 'all'
    setSelectedStore(store)
    loadOffers(store, 'all', '')
  }, [searchParams, loadOffers])

  const handleStoreChange = (store: string) => {
    setSelectedStore(store)
    setSelectedCategory('all')
    setSearchQuery('')
  }

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
    setSearchQuery('')
  }

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      loadOffers(selectedStore, selectedCategory, searchQuery)
    }, 400) // 400ms debounce

    return () => clearTimeout(timer)
  }, [searchQuery, selectedStore, selectedCategory, loadOffers])

  const handleSearch = (value: string) => {
    setSearchQuery(value)
  }

  const handleLoadMore = () => {
    loadOffers(selectedStore, selectedCategory, searchQuery, offers.length, true)
  }

  const hasMore = offers.length < total

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
                {total} Angebote in deiner Nähe
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Produkt suchen..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 bg-card border-border"
            />
          </div>

          {/* Store Filters */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <FilterPill
              label="Alle Märkte"
              active={selectedStore === 'all'}
              onClick={() => handleStoreChange('all')}
            />
            {stores.map((store) => (
              <FilterPill
                key={store}
                label={store}
                active={selectedStore === store}
                onClick={() => handleStoreChange(store)}
              />
            ))}
          </div>

          {/* Category Filters */}
          <div className="flex gap-2 overflow-x-auto pb-1 mt-2 scrollbar-hide">
            <FilterPill
              label="Alle"
              active={selectedCategory === 'all'}
              onClick={() => handleCategoryChange('all')}
            />
            {categories.map((cat) => (
              <FilterPill
                key={cat}
                label={cat}
                active={selectedCategory === cat}
                onClick={() => handleCategoryChange(cat)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Offers Grid */}
      <div className="px-4 pt-4 space-y-3">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <OfferCardSkeleton key={i} />
          ))
        ) : offers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Tag className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <p className="font-medium">Keine Angebote gefunden</p>
            <p className="text-sm text-muted-foreground mt-1">
              Versuche einen anderen Markt oder Suche
            </p>
          </div>
        ) : (
          <>
            {offers.map((offer) => (
              <OfferCard key={offer.id} offer={offer} />
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
                Mehr laden ({total - offers.length} weitere)
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
