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
    .select('*, last_changed_by_profile:profiles!last_changed_by(display_name)')
    .eq('shopping_list_id', listId)
    .order('created_at', { ascending: true })

  if (error || !items) {
    logger.error('Error fetching list items', error)
    return []
  }

  // 2. Extract names for matching
  const uncheckedItems = items.filter(i => !i.is_checked)
  const namesToMatch = uncheckedItems.map(i => i.product_name)

  // 3. Fetch offers (public data) and standard prices (via authenticated client)
  let offerMatches: Record<string, ShoppingListOfferHint[]> = {}
  const standardPriceMatches: Record<string, { merchant_name: string; price_cents: number; product_name?: string }[]> = {}

  if (namesToMatch.length > 0) {
    try {
      offerMatches = await getShoppingListOfferMatches(namesToMatch)

      // Parallel or batched lookup for standard prices
      // Since namesToMatch can be long, we simply iterate and do small queries
      await Promise.all(namesToMatch.map(async (name) => {
        const keyword = name
          .trim()
          .split(/[\\s,./()\\-]+/)
          .filter(w => w.length >= 3)
          .slice(0, 1)[0]
          
        if (!keyword) return

        const { data: stdPrices } = await supabase
          .from('standard_prices')
          .select(`
            product_name,
            price_cents,
            merchants(name)
          `)
          .ilike('product_name', `%${keyword}%`)
          .limit(5)
          .order('price_cents', { ascending: true })

        if (stdPrices && stdPrices.length > 0) {
          if (!standardPriceMatches[name]) {
            standardPriceMatches[name] = []
          }
          const seenMerchants = new Set<string>()
          for (const row of stdPrices) {
            const merchantName = (row.merchants as unknown as {name: string})?.name || 'Unknown'
            if (!seenMerchants.has(merchantName)) {
              seenMerchants.add(merchantName)
              standardPriceMatches[name].push({
                merchant_name: merchantName,
                price_cents: row.price_cents,
                product_name: row.product_name
              })
            }
          }
        }
      }))
    } catch (err) {
      logger.error('Error fetching offers or standard prices', err)
    }
  }

  // 4. Merge offers and standard prices into items
  const enrichedItems: ShoppingListItem[] = items.map(item => {
    const enriched = { ...item } as unknown as ShoppingListItem

    if (!item.is_checked) {
      if (offerMatches[item.product_name]) {
        enriched.offerHints = offerMatches[item.product_name]
      }
      if (standardPriceMatches[item.product_name]) {
        enriched.standardPrices = standardPriceMatches[item.product_name]
      }
    }
    return enriched
  })

  return enrichedItems
}
