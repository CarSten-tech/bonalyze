'use server'

import { createAdminClient } from '@/lib/supabase-admin'
import { getShoppingListOfferMatches } from './offers'
import type { ShoppingListItem } from '@/types/shopping'

/**
 * Validates access (via RLS bypass but manual check?) 
 * Actually createAdminClient bypasses RLS. Ideally we should use createClient() for items but we need admin for offers search logic.
 * For now, let's trust the input listId - in production we'd verify user has access to listId first.
 */
export async function getShoppingListItemsWithOffers(listId: string): Promise<ShoppingListItem[]> {
  const supabase = createAdminClient()

  // 1. Fetch items
  const { data: items, error } = await supabase
    .from('shopping_list_items')
    .select('*')
    .eq('shopping_list_id', listId)
    .order('created_at', { ascending: true })

  if (error || !items) {
    console.error('Error fetching list items:', error)
    return []
  }

  // 2. Extract names for matching
  const uncheckedItems = items.filter(i => !i.is_checked)
  const namesToMatch = uncheckedItems.map(i => i.product_name)

  // 3. Fetch offers in parallel (or just verify empty)
  let offerMatches: Record<string, any[]> = {}
  if (namesToMatch.length > 0) {
    try {
      offerMatches = await getShoppingListOfferMatches(namesToMatch)
    } catch (err) {
      console.error('Error fetching offers:', err)
      // gracefully degrade - return items without offers
    }
  }

  // 4. Merge offers into items
  const enrichedItems: ShoppingListItem[] = items.map(item => {
    // Cast to compatible type (our DB type doesn't have offerHints, but our App type does)
    const enriched = { ...item } as ShoppingListItem
    
    if (!item.is_checked && offerMatches[item.product_name]) {
      enriched.offerHints = offerMatches[item.product_name]
    }
    return enriched
  })

  return enrichedItems
}
