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
