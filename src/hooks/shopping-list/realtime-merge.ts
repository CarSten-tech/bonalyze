import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import type { ShoppingListItem } from '@/types/shopping'

export type ShoppingListRow = Database['public']['Tables']['shopping_lists']['Row']
export type ShoppingListItemRow = Database['public']['Tables']['shopping_list_items']['Row']
export type CachedShoppingListItem = ShoppingListItem & {
  __optimistic?: boolean
  __optimisticInsertedAt?: number
}

export const OPTIMISTIC_MATCH_WINDOW_MS = 20_000

function toTimestamp(value: string | null | undefined): number {
  if (!value) return 0
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

function normalizeComparableText(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase()
}

function isEqualQuantity(a: number | null | undefined, b: number | null | undefined): boolean {
  if (a == null && b == null) return true
  if (a == null || b == null) return false
  return Math.abs(a - b) < 0.0001
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const byId = new Map<string, T>()
  for (const item of items) {
    byId.set(item.id, item)
  }
  return [...byId.values()]
}

function sortListsByCreatedAtDesc(items: ShoppingListRow[]): ShoppingListRow[] {
  return [...items].sort((a, b) => toTimestamp(b.created_at) - toTimestamp(a.created_at))
}

function sortItemsByCreatedAtAsc(items: CachedShoppingListItem[]): CachedShoppingListItem[] {
  return [...items].sort((a, b) => toTimestamp(a.created_at) - toTimestamp(b.created_at))
}

export function mergeListPayload(
  current: ShoppingListRow[],
  payload: RealtimePostgresChangesPayload<ShoppingListRow>
): ShoppingListRow[] {
  if (payload.eventType === 'DELETE') {
    const deletedId = payload.old.id
    if (!deletedId) return current
    return current.filter((row) => row.id !== deletedId)
  }

  const incoming = payload.new
  if (!incoming.id) return current

  const existingIndex = current.findIndex((row) => row.id === incoming.id)
  if (existingIndex >= 0) {
    const merged = current.map((row) => (row.id === incoming.id ? { ...row, ...incoming } : row))
    return sortListsByCreatedAtDesc(merged)
  }

  return sortListsByCreatedAtDesc([...current, incoming])
}

export function isLikelyOptimisticMatch(
  candidate: CachedShoppingListItem,
  incoming: ShoppingListItemRow,
  nowMs = Date.now()
): boolean {
  if (!candidate.__optimistic) return false
  if (candidate.shopping_list_id !== incoming.shopping_list_id) return false
  if (normalizeComparableText(candidate.product_name) !== normalizeComparableText(incoming.product_name)) {
    return false
  }
  if (normalizeComparableText(candidate.unit) !== normalizeComparableText(incoming.unit)) return false
  if (!isEqualQuantity(candidate.quantity, incoming.quantity)) return false

  const insertedAt = candidate.__optimisticInsertedAt ?? toTimestamp(candidate.created_at)
  if (!insertedAt) return false
  const ageMs = nowMs - insertedAt
  return ageMs >= 0 && ageMs <= OPTIMISTIC_MATCH_WINDOW_MS
}

export function mergeItemPayload(
  current: CachedShoppingListItem[],
  payload: RealtimePostgresChangesPayload<ShoppingListItemRow>,
  nowMs = Date.now()
): CachedShoppingListItem[] {
  if (payload.eventType === 'DELETE') {
    const deletedId = payload.old.id
    if (!deletedId) return current
    return current.filter((row) => row.id !== deletedId)
  }

  const incoming = payload.new
  if (!incoming.id) return current

  const existingIndex = current.findIndex((row) => row.id === incoming.id)
  if (existingIndex >= 0) {
    const mergedExisting = current.map((row) =>
      row.id === incoming.id ? ({ ...row, ...incoming } as CachedShoppingListItem) : row
    )
    return sortItemsByCreatedAtAsc(dedupeById(mergedExisting))
  }

  if (payload.eventType === 'INSERT') {
    const optimisticIndex = current.findIndex((row) => isLikelyOptimisticMatch(row, incoming, nowMs))
    if (optimisticIndex >= 0) {
      const replaced = [...current]
      replaced[optimisticIndex] = {
        ...replaced[optimisticIndex],
        ...incoming,
        __optimistic: false,
        __optimisticInsertedAt: undefined,
      }
      return sortItemsByCreatedAtAsc(dedupeById(replaced))
    }
  }

  // For UPDATE without existing item we append as defensive upsert.
  return sortItemsByCreatedAtAsc(dedupeById([...current, incoming as CachedShoppingListItem]))
}
