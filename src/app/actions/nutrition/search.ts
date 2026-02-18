'use server'

import { createServerClient as createClient } from '@/lib/supabase-server'
import { isRateLimited } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { searchNutritionLibrarySchema } from '@/lib/validations'
import { serverCache, createCacheKey } from '@/lib/cache'
import {
  type BLSSearchRow,
  type FoodItem,
  type OFFProduct,
  type OFFSearchResponse,
  getMedian,
  normalizeName,
  wordMatch,
} from './shared'

export interface NutritionLibraryItem {
  id: string
  bls_code: string
  name: string
  category: string | null
  calories: number
  protein: number
  carbs: number
  fat: number
}

export interface SearchResult<T> {
  items: T[]
  count: number
}

/**
 * Searches the local BLS nutrition library database using the 'search_food' RPC.
 * Includes rate limiting, caching, and parallel OFF search with smart clustering.
 */
export async function searchNutritionLibrary(query: string, page = 0) {
  const parsed = searchNutritionLibrarySchema.safeParse({ query, page })
  if (!parsed.success) {
    return { success: false, data: [] }
  }

  const supabase = await createClient()
  const itemsPerPage = 20

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    if (await isRateLimited(`search:${user.id}`, 30, 60000)) {
      throw new Error('Zu viele Suchanfragen. Bitte versuche es in einer Minute erneut.')
    }
  }

  const cacheKey = createCacheKey('combined-search', query.toLowerCase(), page)
  const cached = await serverCache.get<{ success: boolean; data: FoodItem[] }>(cacheKey)
  if (cached) {
    logger.debug('Search cache hit', { query })
    return cached
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)

  try {
    const [blsResult, offResult] = await Promise.allSettled([
      supabase.rpc('search_food', {
        search_term: query,
        items_per_page: itemsPerPage,
        page_number: page,
      }),
      fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=50&page=1&tagtype_0=countries&tag_contains_0=contains&tag_0=germany&fields=code,product_name,nutriments,brands`,
        {
          signal: controller.signal,
          headers: { 'User-Agent': 'Bonalyze/1.0 (Nutrition Tracker; contact@bonalyze.de)' },
          next: { revalidate: 3600 },
        }
      )
        .then((res) => res.json())
        .finally(() => clearTimeout(timeoutId)),
    ])

    let finalResults: FoodItem[] = []

    if (blsResult.status === 'fulfilled' && blsResult.value.data) {
      finalResults = (blsResult.value.data as BLSSearchRow[]).map((item) => ({
        id: item.id.toString(),
        name: item.name,
        calories: item.calories,
        protein: item.protein || 0,
        carbs: item.carbs || 0,
        fat: item.fat || 0,
        category: item.category || 'Allgemein',
        source: 'bls' as const,
      }))
    }

    if (page === 0 && offResult.status === 'fulfilled') {
      const offResponse = offResult.value as OFFSearchResponse
      const products = offResponse.products || []
      if (products.length > 0) {
        const clusters = new Map<string, OFFProduct[]>()
        const unmatchedProducts: OFFProduct[] = []

        products.forEach((p) => {
          if (!p.product_name || !p.nutriments || p.nutriments['energy-kcal_100g'] === undefined) return
          if (Number(p.nutriments['energy-kcal_100g']) <= 0) return

          const cleanName = normalizeName(p.product_name)

          if (wordMatch(p.product_name, query)) {
            if (!clusters.has(cleanName)) clusters.set(cleanName, [])
            clusters.get(cleanName)?.push(p)
          } else {
            unmatchedProducts.push(p)
          }
        })

        const clusteredItems: FoodItem[] = []

        clusters.forEach((items, cleanKey) => {
          const calories = items.map((i) => Number(i.nutriments?.['energy-kcal_100g'] || 0))
          const proteins = items.map((i) => Number(i.nutriments?.proteins_100g || 0))
          const carbs = items.map((i) => Number(i.nutriments?.carbohydrates_100g || 0))
          const fats = items.map((i) => Number(i.nutriments?.fat_100g || 0))

          const bestName = items.sort((a, b) => (a.product_name?.length || 0) - (b.product_name?.length || 0))[0]
            .product_name as string

          clusteredItems.push({
            id: `off_cluster_${cleanKey.replace(/\s/g, '_')}`,
            name: bestName,
            calories: Math.round(getMedian(calories)),
            protein: Math.round(getMedian(proteins) * 10) / 10,
            carbs: Math.round(getMedian(carbs) * 10) / 10,
            fat: Math.round(getMedian(fats) * 10) / 10,
            category: 'Extern (Geprüft)',
            brand: items.length > 1 ? `Ø aus ${items.length} Produkten` : (items[0].brands || 'OpenFoodFacts'),
            source: 'openfoodfacts',
          })
        })

        clusteredItems.sort((a, b) => {
          const countA = a.brand?.match(/\d+/)?.[0] ? parseInt(a.brand.match(/\d+/)?.[0] || '1', 10) : 1
          const countB = b.brand?.match(/\d+/)?.[0] ? parseInt(b.brand.match(/\d+/)?.[0] || '1', 10) : 1
          return countB - countA
        })

        const individualItems: FoodItem[] = unmatchedProducts.slice(0, 5).map((p) => ({
          id: `off_${p.code || crypto.randomUUID()}`,
          name: p.product_name || 'Unbekannt',
          calories: Math.round(Number(p.nutriments?.['energy-kcal_100g'] || 0)),
          protein: Math.round(Number(p.nutriments?.proteins_100g || 0) * 10) / 10,
          carbs: Math.round(Number(p.nutriments?.carbohydrates_100g || 0) * 10) / 10,
          fat: Math.round(Number(p.nutriments?.fat_100g || 0) * 10) / 10,
          category: 'Online-Suche',
          brand: p.brands || 'OpenFoodFacts',
          source: 'openfoodfacts' as const,
        }))

        const offResults = [...clusteredItems.slice(0, 5), ...individualItems]
        logger.debug('OFF search results', {
          clusters: clusteredItems.length,
          individual: individualItems.length,
          raw: products.length,
        })
        finalResults = [...offResults, ...finalResults]
      }
    } else if (page === 0 && offResult.status === 'rejected') {
      logger.warn('OFF request failed/timed out, showing BLS only')
    }

    const result = { success: true, data: finalResults }
    await serverCache.set(cacheKey, result, 5 * 60 * 1000)
    return result
  } catch (error) {
    logger.error('Nutrition search failed', error, { query })
    return { success: false, data: [] }
  }
}

/**
 * Fetches a single product by barcode from Open Food Facts.
 * Used for direct barcode scanning.
 */
export async function getProductByBarcode(barcode: string): Promise<NutritionLibraryItem | null> {
  const cacheKey = createCacheKey('off-barcode', barcode)
  const cached = await serverCache.get<NutritionLibraryItem>(cacheKey)
  if (cached) return cached

  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`, {
      headers: {
        'User-Agent': 'Bonalyze/1.0 (Nutrition Tracker; contact@bonalyze.de)',
      },
      next: { revalidate: 3600 },
    })

    if (!response.ok) return null

    const data = await response.json()
    if (!data.product) return null

    const p = data.product

    const item: NutritionLibraryItem = {
      id: `off-${p.code || barcode}`,
      bls_code: p.code || barcode,
      name: p.product_name || 'Unbekanntes Produkt',
      category: p.categories_tags?.[0]?.replace('en:', '') || null,
      calories: Math.round(p.nutriments?.['energy-kcal_100g'] || 0),
      protein: Math.round((p.nutriments?.['proteins_100g'] || 0) * 10) / 10,
      fat: Math.round((p.nutriments?.['fat_100g'] || 0) * 10) / 10,
      carbs: Math.round((p.nutriments?.['carbohydrates_100g'] || 0) * 10) / 10,
    }

    await serverCache.set(cacheKey, item, 60 * 60 * 1000)
    return item
  } catch (error) {
    logger.error('getProductByBarcode API error', error)
    return null
  }
}
