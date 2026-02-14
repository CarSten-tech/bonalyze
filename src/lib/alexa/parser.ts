export interface ParsedProductInput {
  productName: string
  quantity: number | null
  unit: string | null
}

const SPLIT_REGEX = /\s*(?:,|;|\bund\b|\bplus\b|\bund dann\b|\s&\s)\s*/i

const UNIT_MAP: Record<string, string> = {
  kg: 'kg',
  kilogramm: 'kg',
  kilo: 'kg',
  g: 'g',
  gramm: 'g',
  l: 'L',
  liter: 'L',
  ml: 'ml',
  stueck: 'Stueck',
  stück: 'Stueck',
  stk: 'Stueck',
  packung: 'Packung',
  packungen: 'Packung',
  dose: 'Dose',
  dosen: 'Dose',
  flasche: 'Flasche',
  flaschen: 'Flasche',
  becher: 'Becher',
}

function normalizeSpacing(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function normalizeProductName(name: string): string {
  return normalizeSpacing(name)
    .replace(/^(ein|eine|einen|den|die|das)\s+/i, '')
    .replace(/[.,;:!?]+$/g, '')
}

function normalizeUnit(unit: string | undefined): string | null {
  if (!unit) return null
  const normalized = UNIT_MAP[unit.toLowerCase()]
  return normalized || unit
}

export function normalizeCompareName(name: string): string {
  return normalizeProductName(name).toLowerCase()
}

export function parseProductList(input: string): ParsedProductInput[] {
  const normalizedInput = normalizeSpacing(input)
  if (!normalizedInput) return []

  const parts = normalizedInput
    .split(SPLIT_REGEX)
    .map((part) => part.trim())
    .filter(Boolean)

  const parsed = parts
    .map(parseSingleProduct)
    .filter((item): item is ParsedProductInput => item !== null)

  const merged = new Map<string, ParsedProductInput>()
  for (const item of parsed) {
    const key = `${normalizeCompareName(item.productName)}::${item.unit || ''}`
    const existing = merged.get(key)

    if (!existing) {
      merged.set(key, item)
      continue
    }

    if (item.quantity !== null) {
      existing.quantity = (existing.quantity || 0) + item.quantity
    }
  }

  return [...merged.values()]
}

function parseSingleProduct(part: string): ParsedProductInput | null {
  const cleaned = normalizeSpacing(part)
  if (!cleaned) return null

  const quantityFirstMatch = cleaned.match(/^(\d+(?:[.,]\d+)?)\s*([A-Za-zäöüÄÖÜ]+)?\s+(.+)$/)
  if (quantityFirstMatch) {
    const quantity = Number(quantityFirstMatch[1].replace(',', '.'))
    const rawUnit = quantityFirstMatch[2]
    const productName = normalizeProductName(quantityFirstMatch[3])

    if (!productName) return null

    return {
      productName,
      quantity: Number.isNaN(quantity) ? null : quantity,
      unit: normalizeUnit(rawUnit),
    }
  }

  const quantityLastMatch = cleaned.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s*([A-Za-zäöüÄÖÜ]+)?$/)
  if (quantityLastMatch) {
    const productName = normalizeProductName(quantityLastMatch[1])
    const quantity = Number(quantityLastMatch[2].replace(',', '.'))
    const rawUnit = quantityLastMatch[3]

    if (!productName) return null

    return {
      productName,
      quantity: Number.isNaN(quantity) ? null : quantity,
      unit: normalizeUnit(rawUnit),
    }
  }

  const productName = normalizeProductName(cleaned)
  if (!productName) return null

  return {
    productName,
    quantity: null,
    unit: null,
  }
}

export function formatListForSpeech(items: Array<{ product_name: string; quantity: number | null; unit: string | null }>): string {
  if (items.length === 0) {
    return 'Deine Einkaufsliste ist aktuell leer.'
  }

  const phrases = items.slice(0, 15).map((item) => {
    if (item.quantity && item.unit) {
      return `${trimNumber(item.quantity)} ${item.unit} ${item.product_name}`
    }

    if (item.quantity) {
      return `${trimNumber(item.quantity)} ${item.product_name}`
    }

    return item.product_name
  })

  const suffix = items.length > 15 ? ' und weitere Produkte.' : '.'
  return `Auf deiner Einkaufsliste stehen: ${phrases.join(', ')}${suffix}`
}

function trimNumber(value: number): string {
  const rounded = Number(value.toFixed(3))
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace('.', ',')
}
