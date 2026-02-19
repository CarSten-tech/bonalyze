'use server'

import { createServerClient as createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { logger } from '@/lib/logger'
import { trackAiQualityMetric } from '@/lib/ai-quality-metrics'

export interface Offer {
  id: string
  product_name: string
  price: number
  original_price: number | null
  store: string
  image_url: string | null
  valid_from: string | null
  valid_until: string | null
  discount_percent: number | null
  category: string | null
  source_url: string | null
  price_per_unit: string | null
  weight_volume: string | null
  currency: string | null
  offer_id: string | null
  regular_price: number | null
  scraped_at: string
}

interface OffersResult {
  offers: Offer[]
  total: number
}

interface OfferOptions {
  categories: string[]
  stores: string[]
}

interface OfferRow {
  id: string
  product_name: string
  price: number
  original_price: number | null
  regular_price?: number | null
  store: string
  image_url: string | null
  valid_from: string | null
  valid_until: string | null
  discount_percent: number | null
  category: string | null
  source_url: string | null
  price_per_unit: string | null
  weight_volume: string | null
  currency: string | null
  offer_id: string | null
  scraped_at: string
}

interface SemanticOfferRow extends OfferRow {
  similarity?: number | null
}

function normalizeFilterValue(value?: string): string | undefined {
  if (!value) return undefined
  const normalized = value.trim()
  if (!normalized || normalized === 'all') return undefined
  return normalized
}

/** Maps a raw DB offer row to the typed Offer interface */
function mapOffer(o: OfferRow): Offer {
  return {
    id: o.id,
    product_name: o.product_name,
    price: o.price,
    original_price: o.original_price,
    store: o.store,
    image_url: o.image_url,
    valid_from: o.valid_from,
    valid_until: o.valid_until,
    discount_percent: o.discount_percent,
    category: o.category,
    source_url: o.source_url,
    price_per_unit: o.price_per_unit,
    weight_volume: o.weight_volume,
    currency: o.currency,
    offer_id: o.offer_id,
    regular_price: o.regular_price ?? o.original_price ?? null,
    scraped_at: o.scraped_at,
  }
}

export async function getOffers(
  store?: string,
  category?: string,
  search?: string,
  limit = 50,
  offset = 0
): Promise<OffersResult> {
  // Offers are public data - admin client is fine here (no user data accessed)
  const supabase = createAdminClient()
  const nowIso = new Date().toISOString()
  const storeFilter = normalizeFilterValue(store)
  const categoryFilter = normalizeFilterValue(category)

  let query = supabase
    .from('offers')
    .select('*', { count: 'exact' })
    .gte('valid_until', nowIso)
    .order('scraped_at', { ascending: false })

  if (storeFilter) {
    query = query.ilike('store', storeFilter)
  }

  if (categoryFilter) {
    query = query.ilike('category', categoryFilter)
  }

  if (search && search.trim().length > 0) {
    const term = search.trim()
    query = query.or(`product_name.ilike.%${term}%,category.ilike.%${term}%`)
  }

  // Range limit for performance
  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    logger.error('Error fetching offers', error)
    return { offers: [], total: 0 }
  }

  return {
    offers: ((data || []) as OfferRow[]).map(mapOffer),
    total: count ?? 0,
  }
}

/** Efficiently fetch distinct stores and categories for filtering */
export async function getOfferOptions(store?: string): Promise<OfferOptions> {
  const supabase = createAdminClient()
  const nowIso = new Date().toISOString()
  const storeFilter = normalizeFilterValue(store)

  let categoryQuery = supabase
    .from('offers')
    .select('category')
    .not('category', 'is', null)
    .gte('valid_until', nowIso)

  if (storeFilter) {
    categoryQuery = categoryQuery.ilike('store', storeFilter)
  }

  const [catRes, storeRes] = await Promise.all([
    categoryQuery,
    supabase
      .from('offers')
      .select('store')
      .not('store', 'is', null)
      .gte('valid_until', nowIso),
  ])

  const categories = [
    ...new Set(catRes.data?.map((c) => c.category).filter(Boolean) as string[]),
  ].sort((a, b) => a.localeCompare(b, 'de'))
  const stores = [
    ...new Set(storeRes.data?.map((s) => s.store).filter(Boolean) as string[]),
  ].sort((a, b) => a.localeCompare(b, 'de'))

  return { categories, stores }
}

// ---------- Smart Offer Matching ----------

export interface OfferMatch {
  product_name: string
  purchase_count: number
  offers: Offer[]
}

/**
 * Cross-reference the household's most-purchased products with current offers.
 * Uses the authenticated user client for receipt access (RLS protected).
 */
export async function getOfferMatches(
  householdId: string,
  limit = 10
): Promise<OfferMatch[]> {
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    logger.warn('getOfferMatches called without auth')
    return []
  }

  // 1. Get top purchased product names for this household (RLS enforced)
  const { data: receipts } = await supabase
    .from('receipts')
    .select('id')
    .eq('household_id', householdId)

  if (!receipts || receipts.length === 0) return []

  const receiptIds = receipts.map(r => r.id)

  const { data: items } = await supabase
    .from('receipt_items')
    .select('product_name')
    .in('receipt_id', receiptIds)

  if (!items || items.length === 0) return []

  // Build a small stats summary for better UX labels.
  const productCounts = new Map<string, number>()
  for (const item of items) {
    const key = item.product_name?.trim()
    if (!key) continue
    productCounts.set(key, (productCounts.get(key) || 0) + 1)
  }
  const [topProductName = 'Dein Einkaufsprofil', topProductCount = 0] =
    [...productCounts.entries()].sort((a, b) => b[1] - a[1])[0] || []

  // 2. Use semantic matching RPC to find relevant offers.
  const { data, error } = await supabase.rpc('get_semantic_matches', {
    p_household_id: householdId,
    p_threshold: 0.60,
    p_limit: limit
  })
  
  if (error) {
    logger.error('Error fetching semantic match offers', error)
    return []
  }

  const semanticRows = ((data || []) as SemanticOfferRow[])
  const matchedOffers = semanticRows.map(mapOffer)
  if (matchedOffers.length === 0) return []

  const similarities = semanticRows
    .map((row) => row.similarity)
    .filter((value): value is number => typeof value === 'number')
  const avgSimilarity =
    similarities.length > 0
      ? similarities.reduce((sum, value) => sum + value, 0) / similarities.length
      : null

  await trackAiQualityMetric({
    metricType: 'offer_match',
    householdId,
    userId: user.id,
    confidence: avgSimilarity,
    matchScore: avgSimilarity,
    model: 'text-embedding-004-768',
    metadata: {
      threshold: 0.6,
      limit,
      matchCount: matchedOffers.length,
    },
  })

  return [
    {
      product_name: topProductName,
      purchase_count: topProductCount,
      offers: matchedOffers,
    },
  ]
}

// ---------- Shopping List Offer Matching ----------

export interface ShoppingListOfferHint {
  item_name: string
  store: string
  price: number | null
  valid_until: string | null
  discount_percent: number | null
}

/**
 * For a list of shopping list item names, find matching offers.
 * Returns a map: itemName -> offer hints (cheapest first).
 * Offers are public data so admin client is used for performance.
 */
export async function getShoppingListOfferMatches(
  itemNames: string[]
): Promise<Record<string, ShoppingListOfferHint[]>> {
  if (itemNames.length === 0) return {}

  const supabase = createAdminClient()
  const result: Record<string, ShoppingListOfferHint[]> = {}

  await Promise.all(itemNames.map(async (name) => {
    const keyword = name
      .trim()
      .split(/[\s,./\-()]+/)
      .filter(w => w.length >= 3)
      .slice(0, 1)[0]

    if (!keyword) return

    const { data } = await supabase
      .from('offers')
      .select('product_name, store, price, valid_until, discount_percent')
      .gte('valid_until', new Date().toISOString())
      .ilike('product_name', `%${keyword}%`)
      .order('price', { ascending: true })
      .limit(5)

    if (data && data.length > 0) {
      const seenStores = new Set<string>()
      const hints: ShoppingListOfferHint[] = []

      for (const offer of data) {
        if (seenStores.has(offer.store)) continue
        seenStores.add(offer.store)
        hints.push({
          item_name: offer.product_name,
          store: offer.store,
          price: offer.price,
          valid_until: offer.valid_until,
          discount_percent: offer.discount_percent,
        })
      }

      if (hints.length > 0) {
        result[name] = hints
      }
    }
  }))

  return result
}
