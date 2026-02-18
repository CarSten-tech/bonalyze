import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase-admin'
import { normalizeCompareName, type ParsedProductInput } from './parser'
import { logger } from '@/lib/logger'
import type { Database } from '@/types/database.types'
import { assertUserHouseholdPermission } from '@/lib/household-roles'
import { writeAuditLog } from '@/lib/audit-log'

export interface AlexaLink {
  alexa_user_id: string
  user_id: string
  household_id: string
  shopping_list_id: string
  is_active: boolean
}

type LinkCodeRecord = Pick<
  Database['public']['Tables']['alexa_link_codes']['Row'],
  'id' | 'user_id' | 'household_id' | 'shopping_list_id' | 'expires_at' | 'used_at'
>
type ShoppingListItemRow = Pick<
  Database['public']['Tables']['shopping_list_items']['Row'],
  'id' | 'product_name' | 'quantity' | 'unit' | 'is_checked' | 'created_at'
>
type ShoppingListRow = Pick<
  Database['public']['Tables']['shopping_lists']['Row'],
  'id' | 'name' | 'household_id'
>

const CODE_TTL_MINUTES = 10
const MISSING_TABLE_CODE = '42P01'

function createAlexaAdminClient() {
  return createAdminClient()
}

function codeSalt(): string {
  return process.env.ALEXA_LINK_CODE_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || 'bonalyze-alexa-default-salt'
}

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(`${code}:${codeSalt()}`).digest('hex')
}

function normalizeListName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

function stripForCompare(name: string): string {
  return name.replace(/[^a-zA-Z0-9äöüß]/gi, '').toLowerCase()
}

export function createLinkCode() {
  const code = String(Math.floor(100000 + Math.random() * 900000))
  return {
    code,
    codeHash: hashCode(code),
    expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60_000).toISOString(),
  }
}

export async function getAlexaLinkStatus(userId: string) {
  const supabase = createAlexaAdminClient()
  const { data, error } = await supabase
    .from('alexa_user_links')
    .select('created_at, household_id, shopping_list_id, is_active')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()

  if (error) throw error

  if (!data) {
    return { isLinked: false as const }
  }

  return {
    isLinked: true as const,
    linkedAt: data.created_at,
    householdId: data.household_id,
    shoppingListId: data.shopping_list_id,
  }
}

export async function createAlexaLinkCodeForUser(userId: string) {
  const supabase = createAlexaAdminClient()

  const { data: membership, error: membershipError } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (membershipError) throw membershipError
  if (!membership?.household_id) {
    throw new Error('Du bist keinem Haushalt zugeordnet.')
  }

  const householdId = membership.household_id

  let { data: list, error: listError } = await supabase
    .from('shopping_lists')
    .select('id, name, household_id')
    .eq('household_id', householdId)
    .eq('name', 'Einkaufsliste')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (listError) throw listError

  if (!list?.id) {
    const fallbackQuery = await supabase
      .from('shopping_lists')
      .select('id, name, household_id')
      .eq('household_id', householdId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    list = fallbackQuery.data
    listError = fallbackQuery.error
  }

  if (listError) throw listError
  if (!list?.id) {
    const { data: createdList, error: createListError } = await supabase
      .from('shopping_lists')
      .insert({
        household_id: householdId,
        name: 'Einkaufsliste',
        is_completed: false,
        created_by: userId,
      })
      .select('id')
      .single()

    if (createListError || !createdList?.id) {
      throw new Error('Es konnte keine Einkaufsliste fuer den Haushalt angelegt werden.')
    }

    const fallbackListId = createdList.id
    const { code, codeHash, expiresAt } = createLinkCode()

    await supabase
      .from('alexa_link_codes')
      .delete()
      .eq('user_id', userId)
      .is('used_at', null)

    const { error: insertFallbackError } = await supabase
      .from('alexa_link_codes')
      .insert({
        user_id: userId,
        household_id: householdId,
        shopping_list_id: fallbackListId,
        code_hash: codeHash,
        expires_at: expiresAt,
      })

    if (insertFallbackError) {
      if (insertFallbackError.code === MISSING_TABLE_CODE) {
        throw new Error('Alexa Tabellen fehlen. Bitte Migration 018_alexa_shopping_integration.sql in Supabase ausfuehren.')
      }
      throw insertFallbackError
    }

    return {
      code,
      expiresAt,
      householdId,
      shoppingListId: fallbackListId,
    }
  }

  const selectedList = list as ShoppingListRow
  const { code, codeHash, expiresAt } = createLinkCode()

  await supabase
    .from('alexa_link_codes')
    .delete()
    .eq('user_id', userId)
    .is('used_at', null)

  const { error: insertError } = await supabase
    .from('alexa_link_codes')
    .insert({
      user_id: userId,
      household_id: householdId,
      shopping_list_id: selectedList.id,
      code_hash: codeHash,
      expires_at: expiresAt,
    })

  if (insertError) {
    if (insertError.code === MISSING_TABLE_CODE) {
      throw new Error('Alexa Tabellen fehlen. Bitte Migration 018_alexa_shopping_integration.sql in Supabase ausfuehren.')
    }
    throw insertError
  }

  return {
    code,
    expiresAt,
    householdId,
    shoppingListId: selectedList.id,
  }
}

export async function getShoppingListsForHousehold(householdId: string): Promise<ShoppingListRow[]> {
  const supabase = createAlexaAdminClient()
  const { data, error } = await supabase
    .from('shopping_lists')
    .select('id, name, household_id')
    .eq('household_id', householdId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data || []) as ShoppingListRow[]
}

export async function findShoppingListByName(householdId: string, name: string): Promise<ShoppingListRow | null> {
  const normalized = normalizeListName(name).toLowerCase()
  const lists = await getShoppingListsForHousehold(householdId)

  const exact = lists.find((list) => list.name.trim().toLowerCase() === normalized)
  if (exact) return exact

  const partial = lists.find((list) => list.name.trim().toLowerCase().includes(normalized))
  if (partial) return partial

  // Fuzzy match: strip punctuation/spaces for cases like "d. m." -> "dm" matching "DM"
  const stripped = stripForCompare(name)
  if (stripped.length > 0) {
    const fuzzy = lists.find((list) => stripForCompare(list.name) === stripped)
    if (fuzzy) return fuzzy
  }

  return null
}

export async function createShoppingListForHousehold(
  userId: string,
  householdId: string,
  name: string
): Promise<ShoppingListRow> {
  const permission = await assertUserHouseholdPermission(userId, householdId, 'shopping.create_list')
  if (!permission.allowed) {
    throw new Error('Keine Berechtigung zum Anlegen neuer Listen.')
  }

  const supabase = createAlexaAdminClient()
  const normalizedName = normalizeListName(name)

  const existing = await findShoppingListByName(householdId, normalizedName)
  if (existing) return existing

  const { data, error } = await supabase
    .from('shopping_lists')
    .insert({
      household_id: householdId,
      created_by: userId,
      name: normalizedName,
      is_completed: false,
    })
    .select('id, name, household_id')
    .single()

  if (error) throw error
  await writeAuditLog({
    householdId,
    actorUserId: userId,
    action: 'create',
    entityType: 'shopping_list',
    entityId: data.id,
    details: {
      name: normalizedName,
      source: 'alexa',
    },
  })
  return data as ShoppingListRow
}

export async function setActiveAlexaShoppingList(alexaUserId: string, shoppingListId: string) {
  const supabase = createAlexaAdminClient()
  const { error } = await supabase
    .from('alexa_user_links')
    .update({
      shopping_list_id: shoppingListId,
      last_seen_at: new Date().toISOString(),
    })
    .eq('alexa_user_id', alexaUserId)
    .eq('is_active', true)

  if (error) throw error
}

export async function getShoppingListById(listId: string): Promise<ShoppingListRow | null> {
  const supabase = createAlexaAdminClient()
  const { data, error } = await supabase
    .from('shopping_lists')
    .select('id, name, household_id')
    .eq('id', listId)
    .maybeSingle()
  if (error) throw error
  return (data as ShoppingListRow | null) || null
}

export async function consumeLinkCode(alexaUserId: string, code: string, locale?: string) {
  const supabase = createAlexaAdminClient()
  const codeHash = hashCode(code)

  const { data: codeRecord, error: codeError } = await supabase
    .from('alexa_link_codes')
    .select('id, user_id, household_id, shopping_list_id, expires_at, used_at')
    .eq('code_hash', codeHash)
    .is('used_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (codeError) throw codeError
  if (!codeRecord) return null

  const typedCodeRecord = codeRecord as LinkCodeRecord

  if (new Date(typedCodeRecord.expires_at).getTime() < Date.now()) {
    return null
  }

  const { error: upsertError } = await supabase
    .from('alexa_user_links')
    .upsert(
      {
        alexa_user_id: alexaUserId,
        user_id: typedCodeRecord.user_id,
        household_id: typedCodeRecord.household_id,
        shopping_list_id: typedCodeRecord.shopping_list_id,
        locale: locale || 'de-DE',
        is_active: true,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'alexa_user_id' }
    )

  if (upsertError) throw upsertError

  const { error: updateCodeError } = await supabase
    .from('alexa_link_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('id', typedCodeRecord.id)

  if (updateCodeError) throw updateCodeError

  return {
    userId: typedCodeRecord.user_id,
    householdId: typedCodeRecord.household_id,
    shoppingListId: typedCodeRecord.shopping_list_id,
  }
}

export async function getAlexaLinkByAlexaUserId(alexaUserId: string): Promise<AlexaLink | null> {
  const supabase = createAlexaAdminClient()
  const { data, error } = await supabase
    .from('alexa_user_links')
    .select('alexa_user_id, user_id, household_id, shopping_list_id, is_active')
    .eq('alexa_user_id', alexaUserId)
    .eq('is_active', true)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return data as AlexaLink
}

export async function touchAlexaLink(alexaUserId: string) {
  const supabase = createAlexaAdminClient()
  await supabase
    .from('alexa_user_links')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('alexa_user_id', alexaUserId)
}

export async function readShoppingList(listId: string): Promise<ShoppingListItemRow[]> {
  const supabase = createAlexaAdminClient()
  const { data, error } = await supabase
    .from('shopping_list_items')
    .select('id, product_name, quantity, unit, is_checked, created_at')
    .eq('shopping_list_id', listId)
    .eq('is_checked', false)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data || []) as ShoppingListItemRow[]
}

function mergeItemsByName(items: ShoppingListItemRow[]) {
  const bucket = new Map<string, ShoppingListItemRow[]>()

  for (const item of items) {
    const key = normalizeCompareName(item.product_name)
    const existing = bucket.get(key) || []
    existing.push(item)
    bucket.set(key, existing)
  }

  return bucket
}

import { notifyShoppingListUpdate } from '@/lib/notification-service'

export async function addProductsToList(listId: string, products: ParsedProductInput[], actorUserId?: string) {
  if (products.length === 0) return { addedCount: 0, updatedCount: 0 }

  const supabase = createAlexaAdminClient()
  const currentItems = await readShoppingList(listId)
  const byName = mergeItemsByName(currentItems)

  // Get householdId for notifications (optimization: fetch once)
  let householdId: string | null = null
  const { data: list } = await supabase.from('shopping_lists').select('household_id').eq('id', listId).single()
  if (list) householdId = list.household_id

  let addedCount = 0
  let updatedCount = 0

  for (const product of products) {
    const key = normalizeCompareName(product.productName)
    const matches = byName.get(key) || []
    const firstMatch = matches[0]

    let isNew = false

    if (firstMatch) {
      const currentQty = firstMatch.quantity || 0
      const increment = product.quantity ?? 1
      const nextQuantity = currentQty + increment

      const { error } = await supabase
        .from('shopping_list_items')
        .update({
          quantity: nextQuantity,
          unit: product.unit || firstMatch.unit,
          updated_at: new Date().toISOString(),
        })
        .eq('id', firstMatch.id)

      if (error) throw error
      updatedCount += 1
    } else {
      const { error: insertError } = await supabase
        .from('shopping_list_items')
        .insert({
          shopping_list_id: listId,
          product_name: product.productName,
          quantity: product.quantity ?? 1,
          unit: product.unit,
          is_checked: false,
          created_by: actorUserId // Track creator if column exists? If not, ignore.
        })

      if (insertError) throw insertError
      addedCount += 1
      isNew = true
    }

    // Notify
    if (householdId && isNew && actorUserId) {
        // Fire and forget notification
        notifyShoppingListUpdate(householdId, listId, product.productName, actorUserId).catch(err => {
            logger.error('Failed to notify Alexa update', err)
        })
    }
  }

  if (householdId && actorUserId && (addedCount > 0 || updatedCount > 0)) {
    await writeAuditLog({
      householdId,
      actorUserId,
      action: 'update',
      entityType: 'shopping_list',
      entityId: listId,
      details: {
        source: 'alexa',
        addedCount,
        updatedCount,
        products: products.map((product) => ({
          name: product.productName,
          quantity: product.quantity,
          unit: product.unit,
        })),
      },
    })
  }

  return { addedCount, updatedCount }
}

export async function removeProductsFromList(listId: string, products: ParsedProductInput[], actorUserId?: string) {
  if (products.length === 0) return { removedCount: 0 }

  const supabase = createAlexaAdminClient()
  const currentItems = await readShoppingList(listId)
  const byName = mergeItemsByName(currentItems)
  let householdId: string | null = null
  const { data: list } = await supabase.from('shopping_lists').select('household_id').eq('id', listId).single()
  if (list) householdId = list.household_id

  let removedCount = 0

  for (const product of products) {
    const key = normalizeCompareName(product.productName)
    const matches = byName.get(key) || []

    for (const match of matches) {
      const { error } = await supabase.from('shopping_list_items').delete().eq('id', match.id)
      if (error) throw error
      removedCount += 1
    }
  }

  if (householdId && actorUserId && removedCount > 0) {
    await writeAuditLog({
      householdId,
      actorUserId,
      action: 'update',
      entityType: 'shopping_list',
      entityId: listId,
      details: {
        source: 'alexa',
        removedCount,
        removedProducts: products.map((product) => product.productName),
      },
    })
  }

  return { removedCount }
}

export async function setQuantitiesOnList(listId: string, products: ParsedProductInput[], actorUserId?: string) {
  if (products.length === 0) return { changedCount: 0 }

  const supabase = createAlexaAdminClient()
  const currentItems = await readShoppingList(listId)
  const byName = mergeItemsByName(currentItems)
  let householdId: string | null = null
  const { data: list } = await supabase.from('shopping_lists').select('household_id').eq('id', listId).single()
  if (list) householdId = list.household_id

  let changedCount = 0

  for (const product of products) {
    const key = normalizeCompareName(product.productName)
    const matches = byName.get(key) || []
    const quantity = product.quantity

    if (quantity === null) continue

    if (matches.length > 0) {
      const target = matches[0]

      if (quantity <= 0) {
        const { error } = await supabase.from('shopping_list_items').delete().eq('id', target.id)
        if (error) throw error
        changedCount += 1
        continue
      }

      const { error } = await supabase
        .from('shopping_list_items')
        .update({ quantity, unit: product.unit || target.unit, updated_at: new Date().toISOString() })
        .eq('id', target.id)

      if (error) throw error
      changedCount += 1
      continue
    }

    if (quantity > 0) {
      const { error } = await supabase
        .from('shopping_list_items')
        .insert({
          shopping_list_id: listId,
          product_name: product.productName,
          quantity,
          unit: product.unit,
          is_checked: false,
        })

      if (error) throw error
      changedCount += 1
    }
  }

  if (householdId && actorUserId && changedCount > 0) {
    await writeAuditLog({
      householdId,
      actorUserId,
      action: 'update',
      entityType: 'shopping_list',
      entityId: listId,
      details: {
        source: 'alexa',
        changedCount,
        quantities: products.map((product) => ({
          name: product.productName,
          quantity: product.quantity,
          unit: product.unit,
        })),
      },
    })
  }

  return { changedCount }
}
