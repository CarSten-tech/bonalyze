import { describe, expect, it } from 'vitest'
import { formatListForSpeech, parseProductList } from '@/lib/alexa/parser'

describe('parseProductList', () => {
  it('parses multiple items separated by und/comma', () => {
    const parsed = parseProductList('Milch, Eier und Brot')

    expect(parsed).toEqual([
      { productName: 'Milch', quantity: null, unit: null },
      { productName: 'Eier', quantity: null, unit: null },
      { productName: 'Brot', quantity: null, unit: null },
    ])
  })

  it('parses quantity and unit in front of item', () => {
    const parsed = parseProductList('2 Liter Milch und 12 Eier')

    expect(parsed).toEqual([
      { productName: 'Milch', quantity: 2, unit: 'L' },
      { productName: 'Eier', quantity: 12, unit: null },
    ])
  })

  it('merges duplicate products by sum quantity', () => {
    const parsed = parseProductList('2 Milch und 3 Milch')

    expect(parsed).toEqual([
      { productName: 'Milch', quantity: 5, unit: null },
    ])
  })
})

describe('formatListForSpeech', () => {
  it('formats list entries for speech output', () => {
    const speech = formatListForSpeech([
      { product_name: 'Milch', quantity: 2, unit: 'L' },
      { product_name: 'Eier', quantity: 12, unit: null },
    ])

    expect(speech).toContain('2 L Milch')
    expect(speech).toContain('12 Eier')
  })
})
