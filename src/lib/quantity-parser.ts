export interface ParsedQuantity {
  amount: number
  unit: string
}

export interface NormalizedQuantity {
  amount: number
  baseUnit: 'g' | 'ml' | 'stk'
}

/**
 * Extracts a quantity and unit from a product name string.
 * Example: "Tomaten 500g" -> { amount: 500, unit: "g" }
 * Example: "Coca Cola 1.5L" -> { amount: 1.5, unit: "l" }
 */
export function parseQuantity(text: string): ParsedQuantity | null {
  if (!text) return null
  
  // Clean up text format: '1,5 L' -> '1.5l'
  const normalized = text.toLowerCase().replace(',', '.')
  
  // Match patterns like "500g", "500 g", "1.5 l", "1,5kg"
  const regex = /(\d+(?:\.\d+)?)\s*(kg|g|mg|l|ml|stk|stück|pkg|pack|x)/i
  const match = normalized.match(regex)
  
  if (match) {
    return {
      amount: parseFloat(match[1] as string),
      unit: (match[2] as string).toLowerCase().trim()
    }
  }
  return null
}

/**
 * Normalizes a quantity to a base unit (g, ml, stk).
 */
export function normalizeQuantity(q: ParsedQuantity): NormalizedQuantity | null {
  const unit = q.unit
  
  // Weight
  if (['kg', 'kilo', 'kilogramm'].includes(unit)) return { amount: q.amount * 1000, baseUnit: 'g' }
  if (['g', 'gramm'].includes(unit)) return { amount: q.amount, baseUnit: 'g' }
  if (['mg', 'milligramm'].includes(unit)) return { amount: q.amount / 1000, baseUnit: 'g' }
  
  // Volume
  if (['l', 'liter'].includes(unit)) return { amount: q.amount * 1000, baseUnit: 'ml' }
  if (['ml', 'milliliter'].includes(unit)) return { amount: q.amount, baseUnit: 'ml' }
  
  // Pieces
  if (['stk', 'stück', 'x', 'pkg', 'pack', 'packung'].includes(unit)) return { amount: q.amount, baseUnit: 'stk' }
  
  return null
}

/**
 * Calculates the price multiplier needed to match an offer to a list item.
 * Example: List needs 500g, Offer is 250g. Multiplier is 2.
 * If units are incompatible or missing, returns 1.
 */
export function calculatePriceMultiplier(
  listAmount: number, 
  listUnit: string | null, 
  offerName: string
): number {
  // If list item has no specific unit, default to 1 piece/multiplier
  if (!listUnit || ['stk', 'x', 'pkg'].includes(listUnit.toLowerCase())) {
     return listAmount || 1
  }

  const parsedOffer = parseQuantity(offerName)
  if (!parsedOffer) return listAmount || 1

  const normList = normalizeQuantity({ amount: listAmount || 1, unit: listUnit.toLowerCase() })
  const normOffer = normalizeQuantity(parsedOffer)

  if (normList && normOffer && normList.baseUnit === normOffer.baseUnit) {
    // Both are 'g' or 'ml'
    return normList.amount / normOffer.amount
  }

  // Incompatible or parsing failed, fallback
  return listAmount || 1
}
