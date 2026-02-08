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

export async function searchFoods(
  query: string,
  page = 1
): Promise<FoodSearchResult[]> {
  if (!query || query.length < 2) return []

  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '20',
    page: String(page),
    fields:
      'code,product_name,brands,nutriments,serving_size,image_small_url',
    tagtype_0: 'countries',
    tag_contains_0: 'contains',
    tag_0: 'germany',
  })

  const response = await fetch(
    `https://world.openfoodfacts.org/cgi/search.pl?${params}`,
    {
      headers: {
        'User-Agent': 'Bonalyze/1.0',
      },
    }
  )

  if (!response.ok) throw new Error('Open Food Facts API error')

  const data = await response.json()

  return (data.products || [])
    .filter((p: Record<string, unknown>) => p.product_name)
    .map((p: Record<string, unknown>) => {
      const nutriments = (p.nutriments || {}) as Record<string, number>
      return {
        id: (p.code as string) || crypto.randomUUID(),
        name: (p.product_name as string) || 'Unbekannt',
        brand: (p.brands as string) || '',
        calories: Math.round(nutriments['energy-kcal_100g'] || 0),
        protein:
          Math.round((nutriments['proteins_100g'] || 0) * 10) / 10,
        carbs:
          Math.round((nutriments['carbohydrates_100g'] || 0) * 10) / 10,
        fat: Math.round((nutriments['fat_100g'] || 0) * 10) / 10,
        servingSize: (p.serving_size as string) || '100g',
        imageUrl: (p.image_small_url as string) || undefined,
      }
    })
}
