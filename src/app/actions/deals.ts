'use server'

import { createAdminClient } from '@/lib/supabase-admin'

export interface Deal {
  id: string
  store: string
  product_name: string
  brand: string | null
  ean: string | null
  price: number
  grammage: string | null
  category: string | null
  image_url: string | null
  synced_at: string
}

interface DealsResult {
  deals: Deal[]
  categories: string[]
  total: number
}

export async function getDeals(
  category?: string,
  search?: string,
  limit = 50,
  offset = 0
): Promise<DealsResult> {
  const supabase = createAdminClient()

  let query = supabase
    .from('deals')
    .select('*', { count: 'exact' })
    .order('category', { ascending: true })
    .order('product_name', { ascending: true })

  if (category && category !== 'all') {
    query = query.eq('category', category)
  }

  if (search && search.trim().length > 0) {
    query = query.ilike('product_name', `%${search.trim()}%`)
  }

  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    console.error('Error fetching deals:', error)
    return { deals: [], categories: [], total: 0 }
  }

  // Fetch distinct categories
  const { data: catData } = await supabase
    .from('deals')
    .select('category')
    .not('category', 'is', null)
    .order('category')

  const categories = [...new Set(catData?.map(c => c.category).filter(Boolean) as string[])]

  return {
    deals: data as Deal[],
    categories,
    total: count ?? 0,
  }
}
