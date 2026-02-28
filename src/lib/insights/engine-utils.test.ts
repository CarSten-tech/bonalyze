import { describe, expect, it } from 'vitest'

import {
  calculateDataQuality,
  defaultBestDays,
  jaccardScore,
  median,
  normalizeProductKey,
  pickSearchKeyword,
} from '@/lib/insights/engine-utils'

describe('insights engine utils', () => {
  it('normalizes product keys and removes stopwords', () => {
    expect(normalizeProductKey('Bio Frisch Milch 1L')).toBe('milch 1l')
    expect(normalizeProductKey('Grosse Packung Bananen')).toBe('grosse bananen')
  })

  it('picks a stable search keyword', () => {
    expect(pickSearchKeyword('Bio 1L Milch')).toBe('milch')
    expect(pickSearchKeyword('kg ml l')).toBeNull()
  })

  it('calculates jaccard similarity for fuzzy matching', () => {
    const scoreA = jaccardScore('Hafer Milch Barista', 'Hafermilch Barista Edition')
    const scoreB = jaccardScore('Spuelmittel', 'Toilettenpapier')
    expect(scoreA).toBeGreaterThanOrEqual(0.2)
    expect(scoreB).toBe(0)
  })

  it('calculates medians for odd and even lists', () => {
    expect(median([1, 5, 9])).toBe(5)
    expect(median([1, 3, 5, 7])).toBe(4)
    expect(median([])).toBe(0)
  })

  it('returns default weekday profile', () => {
    const days = defaultBestDays()
    expect(days).toHaveLength(7)
    expect(days[0]?.day).toBe('MO')
    expect(days.every((entry) => entry.percentage === 20 && entry.isHighlighted === false)).toBe(
      true
    )
  })

  it('classifies data quality thresholds', () => {
    expect(calculateDataQuality(3, 0)).toBe('low')
    expect(calculateDataQuality(6, 2)).toBe('medium')
    expect(calculateDataQuality(12, 5)).toBe('high')
  })
})
