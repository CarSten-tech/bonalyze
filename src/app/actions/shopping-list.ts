'use server'

import { createServerClient as createClient } from '@/lib/supabase-server'
import { getShoppingListOfferMatches } from './offers'
import { logger } from '@/lib/logger'
import type { ShoppingListItem } from '@/types/shopping'
import type { ShoppingListOfferHint } from './offers'

/**
 * Fetches shopping list items with offer hints.
 * Uses the authenticated user's Supabase client so RLS policies
 * enforce that only household members can read list items.
 */
export async function getShoppingListItemsWithOffers(listId: string): Promise<ShoppingListItem[]> {
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    logger.warn('getShoppingListItemsWithOffers called without auth')
    return []
  }

  // 1. Fetch items (RLS ensures only household members can access)
  const { data: items, error } = await supabase
    .from('shopping_list_items')
    .select('*')
    .eq('shopping_list_id', listId)
    .order('created_at', { ascending: true })

  if (error || !items) {
    logger.error('Error fetching list items', error)
    return []
  }

  // 2. Extract names for matching
  const uncheckedItems = items.filter(i => !i.is_checked)
  const namesToMatch = uncheckedItems.map(i => i.product_name)

  // 3. Fetch offers (public data, no auth needed)
  let offerMatches: Record<string, ShoppingListOfferHint[]> = {}
  if (namesToMatch.length > 0) {
    try {
      offerMatches = await getShoppingListOfferMatches(namesToMatch)
    } catch (err) {
      logger.error('Error fetching offers', err)
    }
  }

  // 4. Merge offers into items
  const enrichedItems: ShoppingListItem[] = items.map(item => {
    const enriched = { ...item } as ShoppingListItem

    if (!item.is_checked && offerMatches[item.product_name]) {
      enriched.offerHints = offerMatches[item.product_name]
    }
    return enriched
  })

  return enrichedItems
}
