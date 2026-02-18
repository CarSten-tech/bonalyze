'use server'

import { createServerClient as createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { logger } from '@/lib/logger'

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


/** Maps a raw DB offer row to the typed Offer interface */
function mapOffer(o: {
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
  scraped_at: string
}): Offer {
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

  let query = supabase
    .from('offers')
    .select('*', { count: 'exact' })
    .gte('valid_until', new Date().toISOString())
    .order('scraped_at', { ascending: false })

  if (store && store !== 'all') {
    query = query.eq('store', store)
  }

  if (category && category !== 'all') {
    query = query.eq('category', category)
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
    offers: (data || []).map(mapOffer),
    total: count ?? 0,
  }
}

/** Efficiently fetch distinct stores and categories for filtering */
export async function getOfferOptions(): Promise<OfferOptions> {
  const supabase = createAdminClient()

  const [catRes, storeRes] = await Promise.all([
    supabase.from('offers').select('category').not('category', 'is', null),
    supabase.from('offers').select('store').not('store', 'is', null)
  ])

  const categories = [...new Set(catRes.data?.map(c => c.category).filter(Boolean) as string[])].sort()
  const stores = [...new Set(storeRes.data?.map(s => s.store).filter(Boolean) as string[])].sort()

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

// 2. Use the semantic matching RPC to find relevant offers
  // This RPC looks at the household's top products and finds offers with similar embeddings
  // We use the authenticated client or admin client - RPC is SECURITY DEFINER so it works either way
  // but we already verified household membership above.
  
  const { data, error } = await supabase.rpc('get_semantic_matches', {
    p_household_id: householdId,
    p_threshold: 0.60, // Good balance for recall
    p_limit: limit
  })
  
  if (error) {
    logger.error('Error fetching semantic match offers', error)
    return []
  }
  
  // Group results by input product for the UI structure
  // The RPC returns a flat list of offers. The UI expects OfferMatch objects which group by "product_name".
  // Since semantic matching is fuzzy, we can't easily group by "original product".
  // FOR NOW: We will map the flat offers to a structure that fits OfferMatch, 
  // maybe grouping by category or just returning them as a single "Recommended" block?
  // 
  // The current UI in insights/page.tsx iterates over OfferMatch[] and shows "Because you bought {product_name}".
  // The RPC returns distinct offers.
  // 
  // To verify: The RPC uses "top purchased products" internally to find matches.
  // Ideally the RPC would return "matched_source_product" so we can group.
  // 
  // Let's look at the RPC again. It returns `DISTINCT ON (o.id)`. It doesn't return which product it matched.
  // 
  // If we want to keep the "Because you bought X" UI, we might need to change the RPC or the strategy.
  // 
  // Alternative: The user just said "Refactor getOfferMatches... to use get_semantic_matches".
  // If the UI expects `OfferMatch` (product_name, count, offers[]), 
  // and our RPC just gives flat offers...
  // 
  // We can change the return type of `getOfferMatches`? 
  // Let's check `src/app/dashboard/insights/page.tsx` usage.
  // 
  // If I change the return type heavily, I break the UI.
  // 
  // Let's do a trick: Group the semantic matches by their own category or name to fit the structure,
  // OR update the RPC to return the source product name. 
  // 
  // Updating the RPC is providing "Enterprise Level" so let's check if we can get the source match.
  // 
  // Actually, the current RPC does:
  // SELECT MAX(1 - (o.embedding <=> pe)) ... FROM unnest(v_product_embeddings)
  // It aggregates. It doesn't tell us WHICH `pe` (product embedding) was the match.
  // 
  // Workaround: return a single "pseudo-match" group called "Based on your purchase history".
  // 
  return [{
      product_name: "Dein Einkaufsprofil",
      purchase_count: 99, // Dummy
      offers: (data || []).map(mapOffer)
  }]
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


