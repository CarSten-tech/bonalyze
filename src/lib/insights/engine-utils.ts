import type { DaySpending } from '@/types/insights'

export const WEEKDAY_SHORT: DaySpending['day'][] = ['MO', 'DI', 'MI', 'DO', 'FR', 'SA', 'SO']

const PRODUCT_STOPWORDS = new Set([
  'bio',
  'frisch',
  'gross',
  'klein',
  'packung',
  'stuck',
  'stk',
  'g',
  'kg',
  'ml',
  'l',
  'liter',
  'beutel',
  'dose',
  'glas',
])

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
}

function tokenizeProductName(value: string): string[] {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
}

export function normalizeProductKey(value: string): string {
  const tokens = tokenizeProductName(value).filter(
    (token) => token.length >= 2 && !PRODUCT_STOPWORDS.has(token)
  )
  return tokens.slice(0, 5).join(' ')
}

export function pickSearchKeyword(value: string): string | null {
  const token = tokenizeProductName(value).find(
    (candidate) => candidate.length >= 3 && !PRODUCT_STOPWORDS.has(candidate)
  )
  return token ?? null
}

function toTokenSet(value: string): Set<string> {
  return new Set(
    tokenizeProductName(value).filter(
      (token) => token.length >= 2 && !PRODUCT_STOPWORDS.has(token)
    )
  )
}

export function jaccardScore(a: string, b: string): number {
  const setA = toTokenSet(a)
  const setB = toTokenSet(b)
  if (setA.size === 0 || setB.size === 0) return 0

  let intersection = 0
  for (const token of setA) {
    if (setB.has(token)) intersection += 1
  }
  const union = setA.size + setB.size - intersection
  return union === 0 ? 0 : intersection / union
}

export function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[middle - 1] + sorted[middle]) / 2)
  }
  return sorted[middle]
}

export function defaultBestDays(): DaySpending[] {
  return WEEKDAY_SHORT.map((day) => ({
    day,
    percentage: 20,
    isHighlighted: false,
  }))
}

export function calculateDataQuality(
  receiptCount: number,
  comparableProducts: number
): 'low' | 'medium' | 'high' {
  if (receiptCount >= 12 && comparableProducts >= 5) return 'high'
  if (receiptCount >= 6 && comparableProducts >= 2) return 'medium'
  return 'low'
}
