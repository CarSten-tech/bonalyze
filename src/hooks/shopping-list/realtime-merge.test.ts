import { describe, it, expect } from 'vitest'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import {
  mergeItemPayload,
  mergeListPayload,
  type CachedShoppingListItem,
  type ShoppingListItemRow,
  type ShoppingListRow,
} from './realtime-merge'

function buildPayload<T extends Record<string, unknown>>(
  eventType: 'INSERT' | 'UPDATE' | 'DELETE',
  nextRow: Partial<T>,
  oldRow: Partial<T> = {}
): RealtimePostgresChangesPayload<T> {
  return {
    schema: 'public',
    table: 'test_table',
    commit_timestamp: '2026-02-28T12:00:00.000Z',
    eventType,
    new: nextRow as T,
    old: oldRow as T,
    errors: null,
  } as unknown as RealtimePostgresChangesPayload<T>
}

function makeList(overrides: Partial<ShoppingListRow> = {}): ShoppingListRow {
  return {
    id: 'list-1',
    household_id: 'household-1',
    created_by: 'user-1',
    name: 'Einkaufsliste',
    is_completed: false,
    created_at: '2026-02-01T10:00:00.000Z',
    updated_at: '2026-02-01T10:00:00.000Z',
    ...overrides,
  }
}

function makeItemRow(overrides: Partial<ShoppingListItemRow> = {}): ShoppingListItemRow {
  return {
    id: 'item-1',
    shopping_list_id: 'list-1',
    product_name: 'Milch',
    quantity: 1,
    unit: 'l',
    product_id: null,
    category_id: null,
    note: null,
    priority: null,
    source: null,
    user_id: null,
    last_changed_by: null,
    is_checked: false,
    created_at: '2026-02-01T10:00:00.000Z',
    updated_at: '2026-02-01T10:00:00.000Z',
    ...overrides,
  }
}

function makeCachedItem(overrides: Partial<CachedShoppingListItem> = {}): CachedShoppingListItem {
  return {
    id: 'cached-1',
    shopping_list_id: 'list-1',
    product_id: null,
    product_name: 'Milch',
    quantity: 1,
    unit: 'l',
    is_checked: false,
    created_at: '2026-02-01T10:00:00.000Z',
    updated_at: '2026-02-01T10:00:00.000Z',
    ...overrides,
  }
}

describe('realtime-merge list payload handling', () => {
  it('inserts and keeps lists sorted by created_at descending', () => {
    const current = [
      makeList({ id: 'list-old', created_at: '2026-02-01T10:00:00.000Z' }),
      makeList({ id: 'list-newer', created_at: '2026-02-03T10:00:00.000Z' }),
    ]
    const payload = buildPayload<ShoppingListRow>(
      'INSERT',
      makeList({ id: 'list-middle', created_at: '2026-02-02T10:00:00.000Z' })
    )

    const result = mergeListPayload(current, payload)
    expect(result.map((row) => row.id)).toEqual(['list-newer', 'list-middle', 'list-old'])
  })

  it('updates existing list in place and keeps order deterministic', () => {
    const current = [
      makeList({ id: 'list-a', name: 'A', created_at: '2026-02-03T10:00:00.000Z' }),
      makeList({ id: 'list-b', name: 'B', created_at: '2026-02-02T10:00:00.000Z' }),
    ]
    const payload = buildPayload<ShoppingListRow>(
      'UPDATE',
      makeList({ id: 'list-b', name: 'B - renamed', updated_at: '2026-02-04T10:00:00.000Z' })
    )

    const result = mergeListPayload(current, payload)
    expect(result.find((row) => row.id === 'list-b')?.name).toBe('B - renamed')
    expect(result.map((row) => row.id)).toEqual(['list-a', 'list-b'])
  })

  it('deletes list by id', () => {
    const current = [makeList({ id: 'list-a' }), makeList({ id: 'list-b' })]
    const payload = buildPayload<ShoppingListRow>('DELETE', {}, { id: 'list-a' })

    const result = mergeListPayload(current, payload)
    expect(result.map((row) => row.id)).toEqual(['list-b'])
  })
})

describe('realtime-merge item payload handling', () => {
  it('replaces optimistic insert with realtime row and preserves non-db UI fields', () => {
    const now = Date.parse('2026-02-28T12:00:00.000Z')
    const current: CachedShoppingListItem[] = [
      makeCachedItem({
        id: 'temp-1',
        __optimistic: true,
        __optimisticInsertedAt: now - 4_000,
        created_at: '2026-02-28T11:59:58.000Z',
        offerHints: [{ store: 'Store A', price: 1.99, valid_until: null, discount_percent: null }],
      }),
    ]

    const payload = buildPayload<ShoppingListItemRow>(
      'INSERT',
      makeItemRow({
        id: 'item-real-1',
        shopping_list_id: 'list-1',
        product_name: 'Milch',
        quantity: 1,
        unit: 'l',
        created_at: '2026-02-28T11:59:59.000Z',
      })
    )

    const result = mergeItemPayload(current, payload, now)

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('item-real-1')
    expect(result[0].offerHints?.[0]?.store).toBe('Store A')
    expect(result[0].__optimistic).toBe(false)
  })

  it('does not match stale optimistic item outside the replacement window', () => {
    const now = Date.parse('2026-02-28T12:00:00.000Z')
    const current: CachedShoppingListItem[] = [
      makeCachedItem({
        id: 'temp-old',
        __optimistic: true,
        __optimisticInsertedAt: now - 30_000,
      }),
    ]

    const payload = buildPayload<ShoppingListItemRow>(
      'INSERT',
      makeItemRow({ id: 'item-real-2', product_name: 'Milch', quantity: 1, unit: 'l' })
    )

    const result = mergeItemPayload(current, payload, now)
    expect(result).toHaveLength(2)
    expect(result.map((row) => row.id).sort()).toEqual(['item-real-2', 'temp-old'])
  })

  it('updates existing item and keeps existing computed fields', () => {
    const current: CachedShoppingListItem[] = [
      makeCachedItem({
        id: 'item-1',
        offerHints: [{ store: 'Store B', price: 0.99, valid_until: null, discount_percent: null }],
        last_changed_by_profile: { display_name: 'Alice' },
      }),
    ]

    const payload = buildPayload<ShoppingListItemRow>(
      'UPDATE',
      makeItemRow({
        id: 'item-1',
        is_checked: true,
        updated_at: '2026-02-28T12:00:01.000Z',
      })
    )

    const result = mergeItemPayload(current, payload)
    expect(result[0].is_checked).toBe(true)
    expect(result[0].offerHints?.[0]?.store).toBe('Store B')
    expect(result[0].last_changed_by_profile?.display_name).toBe('Alice')
  })

  it('appends missing UPDATE row as defensive upsert', () => {
    const current: CachedShoppingListItem[] = [makeCachedItem({ id: 'item-a', product_name: 'Brot' })]
    const payload = buildPayload<ShoppingListItemRow>(
      'UPDATE',
      makeItemRow({ id: 'item-b', product_name: 'Eier' })
    )

    const result = mergeItemPayload(current, payload)
    expect(result.map((row) => row.id).sort()).toEqual(['item-a', 'item-b'])
  })

  it('deletes item by id', () => {
    const current: CachedShoppingListItem[] = [
      makeCachedItem({ id: 'item-a' }),
      makeCachedItem({ id: 'item-b' }),
    ]
    const payload = buildPayload<ShoppingListItemRow>('DELETE', {}, { id: 'item-a' })

    const result = mergeItemPayload(current, payload)
    expect(result.map((row) => row.id)).toEqual(['item-b'])
  })
})
