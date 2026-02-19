'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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

type MainCategoryKey = 'all' | 'lebensmittel' | 'getraenke' | 'drogerie' | 'haushalt' | 'sonstiges'
type MainCategoryFilterKey = Exclude<MainCategoryKey, 'all'>

interface SubCategoryFilter {
  label: string
  token: string
}

type GroupedCategoryFilters = Record<MainCategoryFilterKey, SubCategoryFilter[]>

const MAIN_CATEGORY_PILLS: Array<{ key: MainCategoryFilterKey; label: string }> = [
  { key: 'lebensmittel', label: 'Lebensmittel' },
  { key: 'getraenke', label: 'Getränke' },
  { key: 'drogerie', label: 'Drogerie' },
  { key: 'haushalt', label: 'Haushalt' },
  { key: 'sonstiges', label: 'Sonstiges' },
]

const STORE_LABELS: Record<string, string> = {
  'aldi-sued': 'Aldi Süd',
  'aldi-süd': 'Aldi Süd',
  'aldi-nord': 'Aldi Nord',
  aldi: 'Aldi',
  edeka: 'Edeka',
  kaufland: 'Kaufland',
  lidl: 'Lidl',
  rewe: 'Rewe',
  netto: 'Netto',
  penny: 'Penny',
  dm: 'dm',
  rossmann: 'Rossmann',
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
}

function hasAnyKeyword(value: string, keywords: string[]): boolean {
  return keywords.some((keyword) => value.includes(keyword))
}

function toTitleCase(value: string): string {
  return value
    .split(/\s+/)
    .map((word) => {
      if (!word) return word
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')
}

function formatStoreLabel(store: string): string {
  const normalized = normalizeText(store.trim())
  if (STORE_LABELS[normalized]) {
    return STORE_LABELS[normalized]
  }
  const cleaned = store.replace(/[-_]+/g, ' ').trim()
  return toTitleCase(cleaned)
}

function formatCategoryLabel(category: string): string {
  const cleaned = category.replace(/[_-]+/g, ' ').trim()
  return toTitleCase(cleaned)
}

function createRawCategoryToken(category: string): string {
  return `raw:${encodeURIComponent(category)}`
}

function createInCategoryToken(categories: string[]): string {
  return `in:${categories.map((category) => encodeURIComponent(category)).join('||')}`
}

function classifyMainCategory(category: string): MainCategoryFilterKey {
  const normalized = normalizeText(category)

  const beverageKeywords = [
    'getrank',
    'trink',
    'wasser',
    'saft',
    'cola',
    'limo',
    'softdrink',
    'bier',
    'wein',
    'sekt',
    'spirituose',
    'alkohol',
    'sirup',
    'kaffee',
    'tee',
    'kakao',
  ]

  const drogerieKeywords = [
    'drogerie',
    'pflege',
    'kosmetik',
    'hygiene',
    'shampoo',
    'deo',
    'zahnpasta',
    'baby',
    'windel',
  ]

  const haushaltKeywords = [
    'haushalt',
    'reinigung',
    'putz',
    'wasch',
    'spul',
    'kuche',
    'kueche',
    'toilettenpapier',
    'muell',
    'haushaltswaren',
    'tier',
  ]

  const foodKeywords = [
    'lebensmittel',
    'gemuse',
    'obst',
    'frucht',
    'brot',
    'back',
    'fleisch',
    'wurst',
    'fisch',
    'veggie',
    'vegetar',
    'vegan',
    'milch',
    'kaese',
    'joghurt',
    'dessert',
    'snack',
    'suss',
    'schokolade',
    'konserve',
    'teig',
    'nudel',
    'reis',
    'tiefkuhl',
    'fertig',
    'pizza',
  ]

  if (hasAnyKeyword(normalized, beverageKeywords)) return 'getraenke'
  if (hasAnyKeyword(normalized, drogerieKeywords)) return 'drogerie'
  if (hasAnyKeyword(normalized, haushaltKeywords)) return 'haushalt'
  if (hasAnyKeyword(normalized, foodKeywords)) return 'lebensmittel'
  return 'sonstiges'
}

function classifyDrinkBucket(category: string): 'alkoholfrei' | 'alkoholisch' | 'weitere' {
  const normalized = normalizeText(category)
  const alcoholKeywords = ['alkohol', 'bier', 'wein', 'sekt', 'spirituose', 'likor', 'likoer', 'vodka', 'gin', 'rum']
  const nonAlcoholKeywords = [
    'wasser',
    'saft',
    'cola',
    'limo',
    'softdrink',
    'tee',
    'kaffee',
    'kakao',
    'sirup',
    'milch',
    'smoothie',
    'alkoholfrei',
  ]

  if (hasAnyKeyword(normalized, alcoholKeywords)) return 'alkoholisch'
  if (hasAnyKeyword(normalized, nonAlcoholKeywords)) return 'alkoholfrei'
  return 'weitere'
}

function sortUnique(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, 'de'))
}

function buildGroupedCategoryFilters(categories: string[]): GroupedCategoryFilters {
  const groupedRaw: Record<MainCategoryFilterKey, string[]> = {
    lebensmittel: [],
    getraenke: [],
    drogerie: [],
    haushalt: [],
    sonstiges: [],
  }

  for (const category of categories) {
    const trimmed = category?.trim()
    if (!trimmed) continue
    groupedRaw[classifyMainCategory(trimmed)].push(trimmed)
  }

  const sortedGroupedRaw: Record<MainCategoryFilterKey, string[]> = {
    lebensmittel: sortUnique(groupedRaw.lebensmittel),
    getraenke: sortUnique(groupedRaw.getraenke),
    drogerie: sortUnique(groupedRaw.drogerie),
    haushalt: sortUnique(groupedRaw.haushalt),
    sonstiges: sortUnique(groupedRaw.sonstiges),
  }

  const makeDefaultSubFilters = (values: string[], allLabel = 'Alle'): SubCategoryFilter[] => {
    if (values.length === 0) return []
    return [
      { label: allLabel, token: createInCategoryToken(values) },
      ...values.map((value) => ({
        label: formatCategoryLabel(value),
        token: createRawCategoryToken(value),
      })),
    ]
  }

  const beverageValues = sortedGroupedRaw.getraenke
  const beverageBuckets: Record<'alkoholfrei' | 'alkoholisch' | 'weitere', string[]> = {
    alkoholfrei: [],
    alkoholisch: [],
    weitere: [],
  }

  for (const value of beverageValues) {
    beverageBuckets[classifyDrinkBucket(value)].push(value)
  }

  const beverageFilters: SubCategoryFilter[] = []
  if (beverageValues.length > 0) {
    beverageFilters.push({
      label: 'Alle Getränke',
      token: createInCategoryToken(beverageValues),
    })
  }
  if (beverageBuckets.alkoholfrei.length > 0) {
    beverageFilters.push({
      label: 'Alkoholfrei',
      token: createInCategoryToken(sortUnique(beverageBuckets.alkoholfrei)),
    })
  }
  if (beverageBuckets.alkoholisch.length > 0) {
    beverageFilters.push({
      label: 'Alkoholisch',
      token: createInCategoryToken(sortUnique(beverageBuckets.alkoholisch)),
    })
  }
  if (beverageBuckets.weitere.length > 0) {
    beverageFilters.push({
      label: 'Weitere Getränke',
      token: createInCategoryToken(sortUnique(beverageBuckets.weitere)),
    })
  }
  beverageFilters.push(
    ...beverageValues.map((value) => ({
      label: formatCategoryLabel(value),
      token: createRawCategoryToken(value),
    }))
  )

  return {
    lebensmittel: makeDefaultSubFilters(sortedGroupedRaw.lebensmittel, 'Alle Lebensmittel'),
    getraenke: beverageFilters,
    drogerie: makeDefaultSubFilters(sortedGroupedRaw.drogerie, 'Alle Drogerie'),
    haushalt: makeDefaultSubFilters(sortedGroupedRaw.haushalt, 'Alle Haushaltskategorien'),
    sonstiges: makeDefaultSubFilters(sortedGroupedRaw.sonstiges, 'Alle Sonstigen'),
  }
}

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
                 <span>{formatStoreLabel(offer.store)}</span>
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
  const [selectedMainCategory, setSelectedMainCategory] = useState<MainCategoryKey>('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const LIMIT = 30
  const groupedCategoryFilters = useMemo(() => buildGroupedCategoryFilters(categories), [categories])
  const activeSubcategoryFilters =
    selectedMainCategory === 'all' ? [] : groupedCategoryFilters[selectedMainCategory]

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
    setSelectedMainCategory('all')
    setSelectedCategory('all')
    loadOffers(store, 'all', '')
  }, [searchParams, loadOffers])

  const handleStoreChange = (store: string) => {
    setSelectedStore(store)
    setSelectedMainCategory('all')
    setSelectedCategory('all')
    setSearchQuery('')
  }

  const handleMainCategoryChange = (mainCategory: MainCategoryKey) => {
    setSelectedMainCategory(mainCategory)
    if (mainCategory === 'all') {
      setSelectedCategory('all')
      setSearchQuery('')
      return
    }

    const subFilters = groupedCategoryFilters[mainCategory]
    setSelectedCategory(subFilters[0]?.token || 'all')
    setSearchQuery('')
  }

  const handleSubCategoryChange = (categoryToken: string) => {
    setSelectedCategory(categoryToken)
    setSearchQuery('')
  }

  useEffect(() => {
    if (selectedMainCategory === 'all') return

    const subFilters = groupedCategoryFilters[selectedMainCategory]
    if (subFilters.length === 0) {
      setSelectedMainCategory('all')
      setSelectedCategory('all')
      return
    }

    const selectedTokenStillValid = subFilters.some((subFilter) => subFilter.token === selectedCategory)
    if (!selectedTokenStillValid) {
      setSelectedCategory(subFilters[0].token)
    }
  }, [groupedCategoryFilters, selectedMainCategory, selectedCategory])

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
                label={formatStoreLabel(store)}
                active={selectedStore === store}
                onClick={() => handleStoreChange(store)}
              />
            ))}
          </div>

          {/* Category Filters */}
          <div className="flex gap-2 overflow-x-auto pb-1 mt-2 scrollbar-hide">
            <FilterPill
              label="Alle Kategorien"
              active={selectedMainCategory === 'all'}
              onClick={() => handleMainCategoryChange('all')}
            />
            {MAIN_CATEGORY_PILLS.map((mainCategory) => (
              <FilterPill
                key={mainCategory.key}
                label={mainCategory.label}
                active={selectedMainCategory === mainCategory.key}
                onClick={() => handleMainCategoryChange(mainCategory.key)}
              />
            ))}
            <div
              className={cn(
                'flex items-center gap-2 overflow-hidden transition-all duration-300 ease-out',
                selectedMainCategory === 'all' || activeSubcategoryFilters.length === 0
                  ? 'max-w-0 opacity-0 translate-x-2'
                  : 'max-w-[2200px] opacity-100 translate-x-0'
              )}
            >
              {activeSubcategoryFilters.map((subCategory) => (
                <FilterPill
                  key={subCategory.token}
                  label={subCategory.label}
                  active={selectedCategory === subCategory.token}
                  onClick={() => handleSubCategoryChange(subCategory.token)}
                />
              ))}
            </div>
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
