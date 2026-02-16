'use server'

import { createServerClient as createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { logger } from '@/lib/logger'

export interface Offer {
  id: string
  product_name: string
  price: number
  store: string
  image_url: string | null
  valid_from: string | null
  valid_until: string | null
  discount_percent: number | null
  category: string | null
  source_url: string | null
  price_per_unit: string | null
  weight_volume: string | null
}

interface OffersResult {
  offers: Offer[]
  categories: string[]
  stores: string[]
  total: number
}

/** Normalizes image URLs from the offers scraper */
function normalizeImageUrl(imageUrl: string | null): string | null {
  if (!imageUrl) return null
  if (imageUrl.startsWith('./')) {
    return `https://www.aktionspreis.de${imageUrl.substring(1)}`
  }
  if (!imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
    return `https://www.aktionspreis.de/${imageUrl}`
  }
  return imageUrl
}

/** Maps a raw DB offer row to the typed Offer interface */
function mapOffer(o: {
  id: string
  product_name: string
  price: number
  store: string
  image_url: string | null
  valid_from: string | null
  valid_until: string | null
  discount_percent: number | null
  category: string | null
  source_url: string | null
  price_per_unit: string | null
  weight_volume: string | null
}): Offer {
  return {
    id: o.id,
    product_name: o.product_name,
    price: o.price,
    store: o.store,
    image_url: normalizeImageUrl(o.image_url),
    valid_from: o.valid_from,
    valid_until: o.valid_until,
    discount_percent: o.discount_percent,
    category: o.category,
    source_url: o.source_url,
    price_per_unit: o.price_per_unit,
    weight_volume: o.weight_volume,
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

  let query = supabase
    .from('offers')
    .select('*', { count: 'exact' })
    .order('price', { ascending: true })

  if (store && store !== 'all') {
    query = query.eq('store', store)
  }

  if (category && category !== 'all') {
    query = query.eq('category', category)
  }

  if (search && search.trim().length > 0) {
    query = query.ilike('product_name', `%${search.trim()}%`)
  }

  query = query.range(offset, offset + limit * 2 - 1)

  const { data, error, count } = await query

  if (error) {
    logger.error('Error fetching offers', error)
    return { offers: [], categories: [], stores: [], total: 0 }
  }

  // Deduplicate by store + product_name
  const uniqueOffersMap = new Map<string, typeof data[number]>()
  if (data) {
    data.forEach((item) => {
      const key = `${item.store}-${item.product_name}`
      if (!uniqueOffersMap.has(key)) {
        uniqueOffersMap.set(key, item)
      }
    })
  }

  const uniqueData = Array.from(uniqueOffersMap.values()).slice(0, limit)

  // Fetch distinct categories and stores
  const { data: catData } = await supabase
    .from('offers')
    .select('category')
    .not('category', 'is', null)

  const categories = [...new Set(catData?.map(c => c.category).filter(Boolean) as string[])].sort()

  const { data: storeData } = await supabase
    .from('offers')
    .select('store')
    .not('store', 'is', null)

  const stores = [...new Set(storeData?.map(s => s.store).filter(Boolean) as string[])].sort()

  return {
    offers: uniqueData.map(mapOffer),
    categories,
    stores,
    total: count ?? 0,
  }
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

  // Count frequency of each product name
  const freqMap = new Map<string, number>()
  items.forEach(item => {
    const name = item.product_name?.trim()
    if (name) {
      freqMap.set(name, (freqMap.get(name) || 0) + 1)
    }
  })

  const topProducts = Array.from(freqMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit * 2)

  // 2. For each top product, search offers (public data - admin client ok)
  const adminSupabase = createAdminClient()
  const matches: OfferMatch[] = []

  for (const [productName, count] of topProducts) {
    if (matches.length >= limit) break

    const keywords = productName
      .split(/[\s,./\-()]+/)
      .filter(w => w.length >= 3)
      .slice(0, 2)

    if (keywords.length === 0) continue

    const { data: offerData } = await adminSupabase
      .from('offers')
      .select('*')
      .ilike('product_name', `%${keywords[0]}%`)
      .limit(5)

    if (!offerData || offerData.length === 0) continue

    matches.push({
      product_name: productName,
      purchase_count: count,
      offers: offerData.map(mapOffer),
    })
  }

  return matches
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
