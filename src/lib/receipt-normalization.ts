export function normalizeProductName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function cleanupProductName(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/[|]/g, 'I')
    .replace(/[€]/g, 'E')
    .replace(/^[^A-Za-z0-9]+/, '')
    .trim()
}

export function normalizeDateOnly(value: Date | string): string {
  if (typeof value === 'string') {
    return value.split('T')[0] || value
  }
  return value.toISOString().split('T')[0]
}

