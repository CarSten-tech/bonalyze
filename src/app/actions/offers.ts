'use server'

import { createAdminClient } from '@/lib/supabase-admin'

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

export async function getOffers(
  store?: string,
  category?: string,
  search?: string,
  limit = 50,
  offset = 0
): Promise<OffersResult> {
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

  query = query.range(offset, offset + limit * 2 - 1) // Fetch more to handle dedup

  const { data, error, count } = await query

  if (error) {
    console.error('Error fetching offers:', error)
    return { offers: [], categories: [], stores: [], total: 0 }
  }

  // Deduplicate by store + product_name
  const uniqueOffersMap = new Map<string, any>();
  if (data) {
    data.forEach((item) => {
      const key = `${item.store}-${item.product_name}`;
      if (!uniqueOffersMap.has(key)) {
        uniqueOffersMap.set(key, item);
      }
    });
  }

  // Convert to array and slice to limit
  const uniqueData = Array.from(uniqueOffersMap.values()).slice(0, limit);

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

  const offers: Offer[] = uniqueData.map((o: any) => {
      let imageUrl = o.image_url;
      if (imageUrl) {
        if (imageUrl.startsWith('./')) {
          imageUrl = `https://www.aktionspreis.de${imageUrl.substring(1)}`;
        } else if (!imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
          imageUrl = `https://www.aktionspreis.de/${imageUrl}`;
        }
      }
      return {
        id: o.id,
        product_name: o.product_name,
        price: o.price,
        store: o.store,
        image_url: imageUrl,
        valid_from: o.valid_from,
        valid_until: o.valid_until,
        discount_percent: o.discount_percent,
        category: o.category,
        source_url: o.source_url,
        price_per_unit: o.price_per_unit,
        weight_volume: o.weight_volume
      };
    });

  return {
    offers,
    categories,
    stores,
    total: count ?? 0,
  }
}

// ---------- Smart Offer Matching ----------

export interface OfferMatch {
  product_name: string       // name from receipt history
  purchase_count: number     // how often the user bought this
  offers: Offer[]            // matching current offers
}

/**
 * Cross-reference the household's most-purchased products with current offers.
 * Returns up to `limit` matches sorted by purchase frequency.
 */
export async function getOfferMatches(
  householdId: string,
  limit = 10
): Promise<OfferMatch[]> {
  const supabase = createAdminClient()

  // 1. Get top purchased product names for this household
  const { data: receipts } = await supabase
    .from('receipts')
    .select('id')
    .eq('household_id', householdId)

  if (!receipts || receipts.length === 0) return []

  const receiptIds = receipts.map(r => r.id)

  // Query receipt_items grouped by product_name, count occurrences
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

  // Sort by frequency, take top N
  const topProducts = Array.from(freqMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit * 2) // fetch more to account for non-matches

  // 2. For each top product, search offers
  const matches: OfferMatch[] = []

  for (const [productName, count] of topProducts) {
    if (matches.length >= limit) break

    // Extract first significant keyword (3+ chars) for fuzzy matching
    const keywords = productName
      .split(/[\s,./\-()]+/)
      .filter(w => w.length >= 3)
      .slice(0, 2)

    if (keywords.length === 0) continue

    // Build OR filter for keywords
    const searchPattern = keywords.map(k => `%${k}%`).join('')
    const { data: offerData } = await supabase
      .from('offers')
      .select('*')
      .ilike('product_name', `%${keywords[0]}%`)
      .limit(5)

    if (!offerData || offerData.length === 0) continue

    const mappedOffers: Offer[] = offerData.map((o: any) => {
      let imageUrl = o.image_url
      if (imageUrl) {
        if (imageUrl.startsWith('./')) {
          imageUrl = `https://www.aktionspreis.de${imageUrl.substring(1)}`
        } else if (!imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
          imageUrl = `https://www.aktionspreis.de/${imageUrl}`
        }
      }
      return {
        id: o.id,
        product_name: o.product_name,
        price: o.price,
        store: o.store,
        image_url: imageUrl,
        valid_from: o.valid_from,
        valid_until: o.valid_until,
        discount_percent: o.discount_percent,
        category: o.category,
        source_url: o.source_url,
        price_per_unit: o.price_per_unit,
        weight_volume: o.weight_volume,
      }
    })

    matches.push({
      product_name: productName,
      purchase_count: count,
      offers: mappedOffers,
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
 * Returns a map: itemName → best offer hint.
 */
export async function getShoppingListOfferMatches(
  itemNames: string[]
): Promise<Record<string, ShoppingListOfferHint>> {
  if (itemNames.length === 0) return {}

  const supabase = createAdminClient()
  const result: Record<string, ShoppingListOfferHint> = {}

  for (const name of itemNames) {
    const keyword = name
      .trim()
      .split(/[\s,./\-()]+/)
      .filter(w => w.length >= 3)
      .slice(0, 1)[0]

    if (!keyword) continue

    const { data } = await supabase
      .from('offers')
      .select('product_name, store, price, valid_until, discount_percent')
      .ilike('product_name', `%${keyword}%`)
      .order('price', { ascending: true })
      .limit(1)

    if (data && data.length > 0) {
      const offer = data[0]
      result[name] = {
        item_name: offer.product_name,
        store: offer.store,
        price: offer.price,
        valid_until: offer.valid_until,
        discount_percent: offer.discount_percent,
      }
    }
  }

  return result
}
