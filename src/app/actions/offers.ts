'use server'

import { createAdminClient } from '@/lib/supabase-admin'

export interface Offer {
  id: string
  title: string
  price: number
  store: string
  description: string | null
  image_url: string | null
  valid_from: string | null
  valid_to: string | null
  discount_percent: number | null
  category: string | null
  url: string | null
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
    query = query.ilike('title', `%${search.trim()}%`)
  }

  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    console.error('Error fetching offers:', error)
    return { offers: [], categories: [], stores: [], total: 0 }
  }

  // Fetch distinct categories and stores (cached ideally, but direct for now)
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
    offers: (data as Offer[]).map(o => {
      let imageUrl = o.image_url;
      if (imageUrl) {
        if (imageUrl.startsWith('./')) {
          imageUrl = `https://www.aktionspreis.de${imageUrl.substring(1)}`;
        } else if (!imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
           // Handle cases like "produkt_bilder/foo.webp"
          imageUrl = `https://www.aktionspreis.de/${imageUrl}`;
        }
      }
      return {
        ...o,
        image_url: imageUrl
      };
    }),
    categories,
    stores,
    total: count ?? 0,
  }
}
