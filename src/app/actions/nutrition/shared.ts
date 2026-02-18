export type FoodItem = {
  id: string
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  category: string
  brand?: string
  source: 'bls' | 'openfoodfacts'
}

/** OpenFoodFacts product shape (subset of fields we request) */
export interface OFFProduct {
  code?: string
  product_name?: string
  brands?: string
  nutriments?: {
    'energy-kcal_100g'?: number
    proteins_100g?: number
    carbohydrates_100g?: number
    fat_100g?: number
    [key: string]: number | undefined
  }
}

export interface OFFSearchResponse {
  products?: OFFProduct[]
}

/** BLS RPC result row */
export interface BLSSearchRow {
  id: number | string
  name: string
  calories: number
  protein?: number
  carbs?: number
  fat?: number
  category?: string
}

// Berechnet den Median, um Ausreißer bei Nährwerten zu ignorieren
export function getMedian(values: number[]): number {
  if (values.length === 0) return 0
  values.sort((a, b) => a - b)
  const half = Math.floor(values.length / 2)
  if (values.length % 2) return values[half]
  return (values[half - 1] + values[half]) / 2.0
}

// Normalisiert Produktnamen für besseres Clustering
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(bio|eco|organic|natur|premium|kl\.|klasse|choice|selection|beste|wahl|eigenmarke|original|frische|genuss)\b/g, '')
    .replace(/\b(rewe|edeka|aldi|lidl|ja!|gut&günstig|k-classic|milbona|baleares|spanische|italienische|deutsche|penny|netto)\b/g, '')
    .replace(/[^a-zäöüß0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Word-based match: Checks if ALL words of the search term appear
 * somewhere in the product name (order-independent).
 */
export function wordMatch(productName: string, searchTerm: string): boolean {
  const nameLower = productName.toLowerCase()
  const searchWords = searchTerm
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 1)

  if (searchWords.length === 0) return false
  return searchWords.every((word) => nameLower.includes(word))
}
