import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase-admin'
import { normalizeCompareName, type ParsedProductInput } from './parser'

export interface AlexaLink {
  alexa_user_id: string
  user_id: string
  household_id: string
  shopping_list_id: string
  is_active: boolean
}

interface LinkCodeRecord {
  id: string
  user_id: string
  household_id: string
  shopping_list_id: string
  expires_at: string
  used_at: string | null
}

interface ShoppingListItemRow {
  id: string
  product_name: string
  quantity: number | null
  unit: string | null
  is_checked: boolean
  created_at: string
}

const CODE_TTL_MINUTES = 10

function codeSalt(): string {
  return process.env.ALEXA_LINK_CODE_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || 'bonalyze-alexa-default-salt'
}

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(`${code}:${codeSalt()}`).digest('hex')
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
  const supabase = createAdminClient() as any
  const { data, error } = await supabase
    .from('alexa_user_links' as never)
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
    linkedAt: (data as { created_at: string }).created_at,
    householdId: (data as { household_id: string }).household_id,
    shoppingListId: (data as { shopping_list_id: string }).shopping_list_id,
  }
}

export async function createAlexaLinkCodeForUser(userId: string) {
  const supabase = createAdminClient() as any

  const { data: membership, error: membershipError } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (membershipError) throw membershipError
  if (!membership?.household_id) {
    throw new Error('User has no household membership.')
  }

  const householdId = membership.household_id

  const { data: list, error: listError } = await supabase
    .from('shopping_lists')
    .select('id')
    .eq('household_id', householdId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (listError) throw listError
  if (!list?.id) {
    throw new Error('Household has no shopping list.')
  }

  const { code, codeHash, expiresAt } = createLinkCode()

  await supabase
    .from('alexa_link_codes' as never)
    .delete()
    .eq('user_id', userId)
    .is('used_at', null)

  const { error: insertError } = await supabase
    .from('alexa_link_codes' as never)
    .insert({
      user_id: userId,
      household_id: householdId,
      shopping_list_id: list.id,
      code_hash: codeHash,
      expires_at: expiresAt,
    })

  if (insertError) throw insertError

  return {
    code,
    expiresAt,
    householdId,
    shoppingListId: list.id,
  }
}

export async function consumeLinkCode(alexaUserId: string, code: string, locale?: string) {
  const supabase = createAdminClient() as any
  const codeHash = hashCode(code)

  const { data: codeRecord, error: codeError } = await supabase
    .from('alexa_link_codes' as never)
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
    .from('alexa_user_links' as never)
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
    .from('alexa_link_codes' as never)
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
  const supabase = createAdminClient() as any
  const { data, error } = await supabase
    .from('alexa_user_links' as never)
    .select('alexa_user_id, user_id, household_id, shopping_list_id, is_active')
    .eq('alexa_user_id', alexaUserId)
    .eq('is_active', true)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return data as AlexaLink
}

export async function touchAlexaLink(alexaUserId: string) {
  const supabase = createAdminClient() as any
  await supabase
    .from('alexa_user_links' as never)
    .update({ last_seen_at: new Date().toISOString() })
    .eq('alexa_user_id', alexaUserId)
}

export async function readShoppingList(listId: string): Promise<ShoppingListItemRow[]> {
  const supabase = createAdminClient() as any
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

export async function addProductsToList(listId: string, products: ParsedProductInput[]) {
  if (products.length === 0) return { addedCount: 0, updatedCount: 0 }

  const supabase = createAdminClient() as any
  const currentItems = await readShoppingList(listId)
  const byName = mergeItemsByName(currentItems)

  let addedCount = 0
  let updatedCount = 0

  for (const product of products) {
    const key = normalizeCompareName(product.productName)
    const matches = byName.get(key) || []
    const firstMatch = matches[0]

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
      continue
    }

    const { error: insertError } = await supabase
      .from('shopping_list_items')
      .insert({
        shopping_list_id: listId,
        product_name: product.productName,
        quantity: product.quantity ?? 1,
        unit: product.unit,
        is_checked: false,
      })

    if (insertError) throw insertError
    addedCount += 1
  }

  return { addedCount, updatedCount }
}

export async function removeProductsFromList(listId: string, products: ParsedProductInput[]) {
  if (products.length === 0) return { removedCount: 0 }

  const supabase = createAdminClient() as any
  const currentItems = await readShoppingList(listId)
  const byName = mergeItemsByName(currentItems)

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

  return { removedCount }
}

export async function setQuantitiesOnList(listId: string, products: ParsedProductInput[]) {
  if (products.length === 0) return { changedCount: 0 }

  const supabase = createAdminClient() as any
  const currentItems = await readShoppingList(listId)
  const byName = mergeItemsByName(currentItems)

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

  return { changedCount }
}
