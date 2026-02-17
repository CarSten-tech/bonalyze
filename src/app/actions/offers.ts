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

// ---------- Semantic Offer Matching ----------

/**
 * Uses vector embeddings to find offers semantically similar
 * to the household's purchase history.
 */
export async function getSmartOfferMatches(
  householdId: string,
  limit = 20
): Promise<Offer[]> {
  const supabase = await createClient()

  // 1. Auth & Membership Check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    logger.warn('getSmartOfferMatches called without auth')
    return []
  }

  // Verify user is member of the household
  const { data: membership } = await supabase
    .from('household_members')
    .select('id')
    .eq('household_id', householdId)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    logger.warn(`User ${user.id} attempted to access smart offers for household ${householdId} without membership`)
    return []
  }

  // 2. Call RPC
  // Using admin client for RPC because offers are public data,
  // but we need the RPC to access the household's receipt_items (which are private).
  // Wait, the RPC runs with SECURITY DEFINER, so it bypasses RLS?
  // Yes, I added SECURITY DEFINER to the RPC.
  // So we can use the authenticated client OR admin client.
  // Ideally we use authenticated client and RLS allows reading receipt_items.
  // But offers table might be public.
  // Let's use the authenticated client to be safe with RLS policies on receipt_items if SECURITY DEFINER wasn't there.
  // But I put SECURITY DEFINER. So it runs as owner.
  // Meaning it has full access.
  // This is fine for this RPC as it takes household_id and we verified membership.

  const { data, error } = await supabase.rpc('get_semantic_matches', {
    p_household_id: householdId,
    p_threshold: 0.65, // Slightly lower threshold for better recall
    p_limit: limit
  })

  if (error) {
    logger.error('Error fetching smart offer matches', error)
    return []
  }

  // 3. Map to Offer interface
  return (data || []).map((row: any) => ({
    id: row.id,
    product_name: row.product_name,
    price: row.price,
    original_price: row.original_price,
    store: row.store,
    image_url: row.image_url,
    valid_from: row.valid_from,
    valid_until: row.valid_until,
    discount_percent: row.discount_percent,
    category: row.category,
    source_url: row.source_url,
    price_per_unit: row.price_per_unit,
    weight_volume: row.weight_volume,
    scraped_at: row.scraped_at,
  }))
}
