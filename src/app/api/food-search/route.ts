import { NextRequest, NextResponse } from 'next/server'
import { circuitBreaker, CIRCUITS } from '@/lib/circuit-breaker'
import { serverCache, createCacheKey } from '@/lib/cache'
import { logger } from '@/lib/logger'

export interface OpenFoodFactsProduct {
  code: string
  product_name: string
  brands?: string
  nutriments?: {
    'energy-kcal_100g'?: number
    'proteins_100g'?: number
    'carbohydrates_100g'?: number
    'fat_100g'?: number
  }
  serving_size?: string
  image_small_url?: string
}

interface OpenFoodFactsResponse {
  products: OpenFoodFactsProduct[]
  count: number
  page: number
  page_size: number
}

interface TransformedProduct {
  id: string
  name: string
  brand: string
  calories: number
  protein: number
  carbs: number
  fat: number
  servingSize: string
}

/** Timeout for Open Food Facts API requests in ms */
const API_TIMEOUT_MS = 20000 // Increased for slower connections
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

/**
 * Creates an AbortController with timeout
 */
function createTimeoutController(timeoutMs: number): { controller: AbortController; timeoutId: NodeJS.Timeout } {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  return { controller, timeoutId }
}

/**
 * Fetches products from Open Food Facts API.
 */
async function fetchFromOpenFoodFacts(query: string, page: string): Promise<TransformedProduct[]> {
  const { controller, timeoutId } = createTimeoutController(API_TIMEOUT_MS)

  try {
    const params = new URLSearchParams({
      search_terms: query,
      search_simple: '1',
      action: 'process',
      json: '1',
      page_size: '15',
      page,
      fields: 'code,product_name,brands,nutriments,serving_size',
      // Removed country filters as they significantly slow down the query (>15s)
      // tagtype_0: 'countries',
      // tag_contains_0: 'contains',
      // tag_0: 'germany',
    })

    const response = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?${params}`,
      {
        headers: {
          'User-Agent': 'Bonalyze/1.0 (Nutrition Tracker; contact@bonalyze.de)',
        },
        signal: controller.signal,
      }
    )

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data: OpenFoodFactsResponse = await response.json()

    return (data.products || [])
      .filter((p) => p.product_name)
      .map((p) => ({
        id: p.code || crypto.randomUUID(),
        name: p.product_name || 'Unbekannt',
        brand: p.brands || '',
        calories: Math.round(p.nutriments?.['energy-kcal_100g'] || 0),
        protein: Math.round((p.nutriments?.['proteins_100g'] || 0) * 10) / 10,
        carbs: Math.round((p.nutriments?.['carbohydrates_100g'] || 0) * 10) / 10,
        fat: Math.round((p.nutriments?.['fat_100g'] || 0) * 10) / 10,
        servingSize: p.serving_size || '100g',
      }))
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Server-side proxy for Open Food Facts API with circuit breaker and caching.
 * GET /api/food-search?q=<query>&page=<page>
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')
  const page = searchParams.get('page') || '1'

  if (!query || query.length < 2) {
    return NextResponse.json({ products: [], fromCache: false, circuitOpen: false })
  }

  const cacheKey = createCacheKey('off-search', query.toLowerCase(), page)

  // Check cache first
  const cached = serverCache.get<TransformedProduct[]>(cacheKey)
  if (cached) {
    return NextResponse.json({ products: cached, count: cached.length, fromCache: true, circuitOpen: false })
  }

  // Use circuit breaker for API call
  try {
    const products = await circuitBreaker.execute(
      CIRCUITS.OPEN_FOOD_FACTS,
      () => fetchFromOpenFoodFacts(query, page),
      () => [] as TransformedProduct[] // Fallback: empty array
    )

    // Cache successful results
    if (products.length > 0) {
      serverCache.set(cacheKey, products, CACHE_TTL_MS)
    }

    const stats = circuitBreaker.getStats(CIRCUITS.OPEN_FOOD_FACTS)
    
    return NextResponse.json({ 
      products, 
      count: products.length, // OFF API doesn't return reliable total count for search, so we use length of current page or 100+
      fromCache: false, 
      circuitOpen: stats.currentState === 'OPEN'
    })
  } catch (error) {
    logger.error('[food-search] Circuit breaker error', error)
    return NextResponse.json({ 
      products: [], 
      fromCache: false, 
      circuitOpen: true,
      error: 'Service temporarily unavailable'
    })
  }
}
