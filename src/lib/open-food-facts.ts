/**
 * Open Food Facts client library
 * Uses server-side proxy at /api/food-search to avoid CORS issues
 */

export interface FoodSearchResult {
  id: string
  name: string
  brand: string
  calories: number
  protein: number
  carbs: number
  fat: number
  servingSize: string
  imageUrl?: string
}

interface FoodSearchResponse {
  products: FoodSearchResult[]
  error?: string
}

/**
 * Searches for food products via the server-side proxy.
 * The proxy handles CORS and caching.
 */
export async function searchFoods(
  query: string,
  page = 1
): Promise<FoodSearchResult[]> {
  if (!query || query.length < 2) return []

  const params = new URLSearchParams({
    q: query,
    page: String(page),
  })

  const response = await fetch(`/api/food-search?${params}`)

  if (!response.ok) {
    console.error('[searchFoods] API error:', response.status)
    return []
  }

  const data: FoodSearchResponse = await response.json()

  if (data.error) {
    console.warn('[searchFoods] API returned error:', data.error)
  }

  return data.products || []
}
