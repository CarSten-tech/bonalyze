'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Tag, ChevronLeft, Loader2, SlidersHorizontal, X, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createClient } from '@/lib/supabase'
import { useShoppingLists, type ShoppingList } from '@/hooks/shopping-list/use-lists'
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

interface StoreFilter {
  label: string
  token: string
  values: string[]
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

type ClassifiableMainCategoryKey = Exclude<MainCategoryFilterKey, 'sonstiges'>

const MAIN_CATEGORY_KEYWORDS: Record<ClassifiableMainCategoryKey, string[]> = {
  lebensmittel: [
    'lebensmittel', 'gemuse', 'obst', 'frucht', 'beere', 'salat', 'kartoffel', 'brot', 'back',
    'fleisch', 'wurst', 'fisch', 'vegan', 'vegetar', 'molkerei', 'milch', 'kaese', 'joghurt',
    'quark', 'butter', 'sahne', 'eier', 'teig', 'nudel', 'reis', 'konserve', 'gewuerz',
    'sauce', 'aufstrich', 'snack', 'suss', 'schokolade', 'keks', 'bonbon', 'tiefkuehl',
    'tiefkuhl', 'fertig', 'pizza', 'frische',
  ],
  getraenke: [
    'getrank', 'getraenk', 'getraenke', 'drink', 'trink', 'wasser', 'saft', 'smoothie',
    'cola', 'limo', 'limonade', 'softdrink', 'soda', 'sirup', 'tee', 'kaffee', 'kakao',
    'bier', 'wein', 'sekt', 'spirituose', 'alkohol', 'energy', 'isotonisch',
  ],
  drogerie: [
    'drogerie', 'pflege', 'hygiene', 'kosmetik', 'beauty', 'makeup', 'make up', 'parfum',
    'shampoo', 'dusch', 'deo', 'zahnpasta', 'zahnpflege', 'rasur', 'rasier', 'hautpflege',
    'koerperpflege', 'baby', 'windel', 'gesundheit',
  ],
  haushalt: [
    'haushalt', 'reinigung', 'putz', 'spul', 'spuel', 'wasch', 'waesche', 'kueche', 'kuche',
    'toilettenpapier', 'kuechenrolle', 'muell', 'folie', 'beutel', 'haushaltswaren',
    'tierbedarf', 'heimtier', 'katzen', 'hunde',
  ],
}

function normalizeForMatching(value: string): string {
  return normalizeText(value)
    .replace(/>=|<=|=>|=<|[><=]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractCategorySignals(value: string): string[] {
  const signals = new Set<string>()
  const normalizedFull = normalizeForMatching(value)
  if (normalizedFull) {
    signals.add(normalizedFull)
  }

  const parts = value.split(/[>/|,;:+()]/g)
  for (const part of parts) {
    const normalizedPart = normalizeForMatching(part)
    if (normalizedPart) {
      signals.add(normalizedPart)
    }
  }

  for (const token of normalizedFull.split(' ')) {
    if (token.length >= 3) {
      signals.add(token)
    }
  }

  return [...signals]
}

function scoreSignalsForKeywords(signals: string[], keywords: string[]): number {
  if (signals.length === 0 || keywords.length === 0) return 0
  let score = 0

  for (const rawKeyword of keywords) {
    const keyword = normalizeForMatching(rawKeyword)
    if (!keyword) continue

    let keywordScore = 0
    for (const signal of signals) {
      if (signal === keyword) {
        keywordScore = 6
        break
      }
      if (signal.startsWith(`${keyword} `) || signal.endsWith(` ${keyword}`) || signal.includes(` ${keyword} `)) {
        keywordScore = Math.max(keywordScore, 4)
        continue
      }
      if (signal.includes(keyword)) {
        keywordScore = Math.max(keywordScore, 3)
        continue
      }
      if (keyword.includes(signal) && signal.length >= 5) {
        keywordScore = Math.max(keywordScore, 1)
      }
    }
    score += keywordScore
  }

  return score
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
  const cleaned = category
    .replace(/>=|<=|=>|=<|[><=]/g, ' ')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return toTitleCase(cleaned)
}

function createRawFilterToken(value: string): string {
  return `raw:${encodeURIComponent(value)}`
}

function createInFilterToken(values: string[]): string {
  return `in:${values.map((value) => encodeURIComponent(value)).join('||')}`
}

function normalizeKey(value: string): string {
  return normalizeText(value).replace(/[^a-z0-9]+/g, ' ').trim()
}

function sortUnique(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, 'de'))
}

function createTokenForValues(values: string[]): string {
  const uniqueValues = sortUnique(values)
  if (uniqueValues.length === 1) {
    return createRawFilterToken(uniqueValues[0])
  }
  return createInFilterToken(uniqueValues)
}

function buildStoreFilters(stores: string[]): StoreFilter[] {
  const groupedStores = new Map<string, { label: string; values: Set<string> }>()

  for (const store of stores) {
    const trimmed = store?.trim()
    if (!trimmed) continue
    const label = formatStoreLabel(trimmed)
    const key = normalizeKey(label)

    if (!groupedStores.has(key)) {
      groupedStores.set(key, { label, values: new Set<string>() })
    }
    groupedStores.get(key)?.values.add(trimmed)
  }

  return [...groupedStores.values()]
    .map((entry) => {
      const values = sortUnique([...entry.values])
      return {
        label: entry.label,
        token: createTokenForValues(values),
        values,
      }
    })
    .sort((a, b) => a.label.localeCompare(b.label, 'de'))
}

function classifyMainCategory(category: string): MainCategoryFilterKey {
  const signals = extractCategorySignals(category)
  if (signals.length === 0) return 'sonstiges'

  const candidates: Array<{ key: ClassifiableMainCategoryKey; score: number }> = [
    { key: 'lebensmittel', score: scoreSignalsForKeywords(signals, MAIN_CATEGORY_KEYWORDS.lebensmittel) },
    { key: 'getraenke', score: scoreSignalsForKeywords(signals, MAIN_CATEGORY_KEYWORDS.getraenke) },
    { key: 'drogerie', score: scoreSignalsForKeywords(signals, MAIN_CATEGORY_KEYWORDS.drogerie) },
    { key: 'haushalt', score: scoreSignalsForKeywords(signals, MAIN_CATEGORY_KEYWORDS.haushalt) },
  ]

  const best = candidates.sort((a, b) => b.score - a.score)[0]
  return best && best.score > 0 ? best.key : 'sonstiges'
}

interface CategoryBucket {
  label: string
  keywords: string[]
}

function buildBucketedFilters(
  values: string[],
  allLabel: string,
  buckets: CategoryBucket[],
  moreLabel: string
): SubCategoryFilter[] {
  const uniqueValues = sortUnique(values.map((value) => value.trim()).filter(Boolean))
  if (uniqueValues.length === 0) return []

  const bucketedValues = buckets.map(() => new Set<string>())
  const leftovers = new Set<string>()

  for (const value of uniqueValues) {
    const signals = extractCategorySignals(value)
    let bestBucketIndex = -1
    let bestBucketScore = 0

    buckets.forEach((bucket, index) => {
      const bucketScore = scoreSignalsForKeywords(signals, bucket.keywords)
      if (bucketScore > bestBucketScore) {
        bestBucketScore = bucketScore
        bestBucketIndex = index
      }
    })

    const bucketIndex = bestBucketScore > 0 ? bestBucketIndex : -1
    if (bucketIndex >= 0) {
      bucketedValues[bucketIndex].add(value)
    } else {
      leftovers.add(value)
    }
  }

  const filters: SubCategoryFilter[] = [
    { label: allLabel, token: createTokenForValues(uniqueValues) },
  ]

  buckets.forEach((bucket, index) => {
    const valuesForBucket = sortUnique([...bucketedValues[index]])
    if (valuesForBucket.length > 0) {
      filters.push({
        label: bucket.label,
        token: createTokenForValues(valuesForBucket),
      })
    }
  })

  const leftoverValues = sortUnique([...leftovers])
  if (leftoverValues.length > 0) {
    filters.push({
      label: moreLabel,
      token: createTokenForValues(leftoverValues),
    })
  }

  return filters
}

function buildRawCategoryFilters(values: string[], allLabel: string): SubCategoryFilter[] {
  const grouped = new Map<string, { label: string; values: Set<string> }>()

  for (const value of values) {
    const trimmed = value?.trim()
    if (!trimmed) continue
    const label = formatCategoryLabel(trimmed)
    const key = normalizeKey(label)
    if (!grouped.has(key)) {
      grouped.set(key, { label, values: new Set<string>() })
    }
    grouped.get(key)?.values.add(trimmed)
  }

  const merged = [...grouped.values()]
    .map((entry) => ({ label: entry.label, values: sortUnique([...entry.values]) }))
    .sort((a, b) => a.label.localeCompare(b.label, 'de'))

  const allValues = sortUnique(merged.flatMap((entry) => entry.values))
  if (allValues.length === 0) return []

  return [
    { label: allLabel, token: createTokenForValues(allValues) },
    ...merged.map((entry) => ({
      label: entry.label,
      token: createTokenForValues(entry.values),
    })),
  ]
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

  return {
    lebensmittel: buildBucketedFilters(
      sortedGroupedRaw.lebensmittel,
      'Alle Lebensmittel',
      [
        { label: 'Gemüse', keywords: ['gemuse', 'salat', 'kartoffel', 'tomate', 'gurke', 'paprika'] },
        { label: 'Obst', keywords: ['obst', 'frucht', 'beere', 'zitrus', 'apfel', 'banane'] },
        { label: 'Milchprodukte', keywords: ['molkerei', 'milch', 'kaese', 'joghurt', 'quark', 'butter', 'sahne'] },
        { label: 'Fertigprodukte', keywords: ['fertig', 'tiefkuehl', 'tiefkuhl', 'pizza', 'konserve', 'instant'] },
        { label: 'Süßigkeiten', keywords: ['suss', 'schokolade', 'keks', 'snack', 'dessert', 'bonbon', 'riegel'] },
      ],
      'Weitere Lebensmittel'
    ),
    getraenke: buildBucketedFilters(
      sortedGroupedRaw.getraenke,
      'Alle Getränke',
      [
        {
          label: 'Alkoholfrei',
          keywords: [
            'alkoholfrei', 'wasser', 'saft', 'cola', 'limo', 'limonade', 'softdrink', 'smoothie',
            'tee', 'kaffee', 'kakao', 'sirup', 'soda', 'energy',
          ],
        },
        {
          label: 'Alkoholisch',
          keywords: ['alkohol', 'bier', 'wein', 'sekt', 'spirituose', 'likor', 'likoer', 'vodka', 'gin', 'rum'],
        },
      ],
      'Weitere Getränke'
    ),
    drogerie: buildBucketedFilters(
      sortedGroupedRaw.drogerie,
      'Alle Drogerie',
      [
        { label: 'Hygiene & Pflege', keywords: ['hygiene', 'pflege', 'shampoo', 'deo', 'zahnpasta', 'koerper', 'koerperpflege'] },
        { label: 'Kosmetik', keywords: ['kosmetik', 'makeup', 'make up', 'beauty', 'parfum'] },
        { label: 'Baby', keywords: ['baby', 'windel'] },
      ],
      'Weitere Drogerie'
    ),
    haushalt: buildBucketedFilters(
      sortedGroupedRaw.haushalt,
      'Alle Haushaltskategorien',
      [
        { label: 'Reinigung', keywords: ['reinigung', 'putz', 'spul', 'desinfektion'] },
        { label: 'Küche', keywords: ['kuche', 'kueche', 'folie', 'beutel'] },
        { label: 'Wäsche', keywords: ['wasch', 'waesche', 'weichspuler'] },
        { label: 'Tierbedarf', keywords: ['tier', 'heimtier', 'katze', 'hund'] },
      ],
      'Weitere Haushalt'
    ),
    sonstiges: buildRawCategoryFilters(sortedGroupedRaw.sonstiges, 'Alle Sonstigen'),
  }
}

function OfferCard({ offer, lists }: { offer: Offer; lists: ShoppingList[] }) {
  const [imageError, setImageError] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const supabase = createClient()

  const handleAddToList = async (list: ShoppingList) => {
    setIsAdding(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { data: product } = await supabase
        .from('products')
        .select('id')
        .eq('name', offer.product_name.trim())
        .maybeSingle()

      const { error } = await supabase
        .from('shopping_list_items')
        .insert({
          shopping_list_id: list.id,
          product_name: offer.product_name.trim(),
          quantity: 1,
          unit: offer.price_per_unit || null,
          product_id: product?.id || null,
          is_checked: false,
          user_id: user?.id || null,
          last_changed_by: user?.id || null
        })

      if (error) throw error

      toast.success(`Angebot zur Liste "${list.name}" hinzugefügt!`)
    } catch (error) {
      console.error('Error adding to list:', error)
      toast.error('Fehler beim Hinzufügen')
    } finally {
      setIsAdding(false)
    }
  }

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
              
              {/* Add to List Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full shrink-0" disabled={isAdding}>
                    {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {lists.length > 0 ? (
                    lists.map(list => (
                      <DropdownMenuItem key={list.id} onClick={() => handleAddToList(list)}>
                        Zu &quot;{list.name}&quot; hinzufügen
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-muted-foreground text-center">Keine Listen gefunden</div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
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
  
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])
  const { lists } = useShoppingLists(householdId)

  useEffect(() => {
    const getHousehold = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from("household_members")
        .select("household_id")
        .eq("user_id", user.id)
        .single()

      if (data) {
        setHouseholdId(data.household_id)
      }
    }

    getHousehold()
  }, [supabase])

  const [selectedStore, setSelectedStore] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const LIMIT = 30
  const storeFilters = useMemo(() => buildStoreFilters(stores), [stores])
  const groupedCategoryFilters = useMemo(() => buildGroupedCategoryFilters(categories), [categories])

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
    setSelectedCategory('all')
    loadOffers(store, 'all', '')
  }, [searchParams, loadOffers])

  useEffect(() => {
    if (selectedStore === 'all') return
    if (selectedStore.startsWith('raw:') || selectedStore.startsWith('in:')) return

    const selectedStoreKey = normalizeKey(formatStoreLabel(selectedStore))
    const matchingFilter = storeFilters.find((filter) =>
      filter.values.some((value) => normalizeKey(formatStoreLabel(value)) === selectedStoreKey)
    )

    if (matchingFilter && matchingFilter.token !== selectedStore) {
      setSelectedStore(matchingFilter.token)
    }
  }, [selectedStore, storeFilters])

  const handleStoreChange = (storeToken: string) => {
    setSelectedStore(storeToken)
    setSelectedCategory('all')
    setSearchQuery('')
  }

  const handleSubCategoryChange = (categoryToken: string) => {
    setSelectedCategory(categoryToken)
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

  const getCategoryLabel = useCallback((token: string) => {
    for (const mainKey of Object.keys(groupedCategoryFilters) as MainCategoryFilterKey[]) {
      const sub = groupedCategoryFilters[mainKey].find((s) => s.token === token)
      if (sub) return sub.label
    }
    return token
  }, [groupedCategoryFilters])

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

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Produkt suchen..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9 bg-card border-border"
              />
            </div>
            
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="shrink-0 flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4" />
                  <span className="hidden sm:inline">Filtern</span>
                  {(selectedStore !== 'all' || selectedCategory !== 'all') && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 rounded-sm">
                      {[selectedStore !== 'all' ? 1 : 0, selectedCategory !== 'all' ? 1 : 0].reduce((a, b) => a + b, 0)}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader className="mb-6">
                  <SheetTitle>Filtern & Sortieren</SheetTitle>
                  <SheetDescription>Grenze die Angebote nach Markt und Kategorie ein.</SheetDescription>
                </SheetHeader>
                
                <div className="space-y-6">
                  {/* Store Filters */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Märkte
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={selectedStore === 'all' ? "default" : "outline"}
                        className="justify-start"
                        onClick={() => handleStoreChange('all')}
                      >
                        Alle Märkte
                      </Button>
                      {storeFilters.map((storeFilter) => (
                        <Button
                          key={storeFilter.token}
                          variant={selectedStore === storeFilter.token ? "default" : "outline"}
                          className="justify-start"
                          onClick={() => handleStoreChange(storeFilter.token)}
                        >
                          {storeFilter.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Category Filters */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Kategorien
                    </h3>
                    <Button
                      variant={selectedCategory === 'all' ? "default" : "outline"}
                      className="w-full justify-start mb-2"
                      onClick={() => handleSubCategoryChange('all')}
                    >
                      Alle Kategorien
                    </Button>
                    <Accordion type="single" collapsible className="w-full">
                      {MAIN_CATEGORY_PILLS.map((mainCategory) => {
                        const subs = groupedCategoryFilters[mainCategory.key];
                        if (!subs || subs.length === 0) return null;
                        
                        return (
                          <AccordionItem key={mainCategory.key} value={mainCategory.key}>
                            <AccordionTrigger className="text-sm">
                              {mainCategory.label}
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="flex flex-col gap-1 pt-1">
                                {subs.map((subCategory) => (
                                  <Button
                                    key={subCategory.token}
                                    variant={selectedCategory === subCategory.token ? "secondary" : "ghost"}
                                    size="sm"
                                    className="justify-start pl-6"
                                    onClick={() => handleSubCategoryChange(subCategory.token)}
                                  >
                                    {subCategory.label}
                                  </Button>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Active Filter Chips */}
          {(selectedStore !== 'all' || selectedCategory !== 'all') && (
            <div className="flex gap-2 overflow-x-auto pb-1 mt-3 scrollbar-hide animate-in fade-in slide-in-from-top-1">
              {selectedStore !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1 pl-2.5 pr-1.5 py-1 whitespace-nowrap min-h-6">
                  {storeFilters.find(f => f.token === selectedStore)?.label || selectedStore}
                  <button 
                    onClick={() => handleStoreChange('all')}
                    className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5 transition-colors"
                    title="Markt-Filter entfernen"
                    aria-label="Markt-Filter entfernen"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              
              {selectedCategory !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1 pl-2.5 pr-1.5 py-1 whitespace-nowrap min-h-6">
                  {getCategoryLabel(selectedCategory)}
                  <button 
                    onClick={() => handleSubCategoryChange('all')}
                    className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5 transition-colors"
                    title="Kategorie-Filter entfernen"
                    aria-label="Kategorie-Filter entfernen"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}

              {selectedStore !== 'all' && selectedCategory !== 'all' && (
                <button
                  onClick={() => {
                    handleStoreChange('all');
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground whitespace-nowrap px-2 flex items-center transition-colors"
                >
                  Alle löschen
                </button>
              )}
            </div>
          )}
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
              <OfferCard key={offer.id} offer={offer} lists={lists} />
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
