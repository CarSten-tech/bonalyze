'use server'

import { createServerClient as createClient } from '@/lib/supabase-server'
import { addNutritionLog } from './logs'

export async function getSmartSuggestions(householdId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: recentItems, error } = await supabase
    .from('receipt_items')
    .select(`
      id,
      product_name,
      estimated_calories_kcal,
      estimated_protein_g,
      estimated_carbs_g,
      estimated_fat_g,
      is_food_item,
      receipts!inner(
        date,
        household_id,
        merchants(name)
      )
    `)
    .eq('receipts.household_id', householdId)
    .eq('is_food_item', true)
    .not('estimated_calories_kcal', 'is', null)
    .gt('estimated_calories_kcal', 0)
    .order('created_at', { ascending: false, referencedTable: 'receipts' })
    .limit(20)

  if (error || !recentItems?.length) return null

  const { data: loggedItemIds } = await supabase
    .from('nutrition_logs')
    .select('receipt_item_id')
    .eq('household_id', householdId)
    .eq('user_id', user.id)
    .not('receipt_item_id', 'is', null)

  const loggedIds = new Set(loggedItemIds?.map((l) => l.receipt_item_id) || [])

  const { data: dismissedIds } = await supabase
    .from('nutrition_logs')
    .select('receipt_item_id')
    .eq('household_id', householdId)
    .eq('suggestion_dismissed', true)
    .not('receipt_item_id', 'is', null)

  const dismissed = new Set(dismissedIds?.map((l) => l.receipt_item_id) || [])

  const unloggedItems = recentItems.filter((item) => !loggedIds.has(item.id) && !dismissed.has(item.id))
  if (unloggedItems.length === 0) return null

  const item = unloggedItems[0]
  const receipt = item.receipts as { date: string; household_id: string; merchants: { name: string } | null }

  const hour = new Date().getHours()
  let suggestedMealType = 'snacks'
  if (hour < 11) suggestedMealType = 'fruehstueck'
  else if (hour < 15) suggestedMealType = 'mittagessen'
  else if (hour < 21) suggestedMealType = 'abendessen'

  return {
    receiptItemId: item.id,
    productName: item.product_name,
    estimatedCalories: item.estimated_calories_kcal || 0,
    estimatedProtein: Number(item.estimated_protein_g) || 0,
    estimatedCarbs: Number(item.estimated_carbs_g) || 0,
    estimatedFat: Number(item.estimated_fat_g) || 0,
    merchantName: receipt.merchants?.name || 'Unbekannt',
    receiptDate: receipt.date,
    suggestedMealType,
  }
}

export async function logFromSuggestion(householdId: string, receiptItemId: string, mealType: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht eingeloggt')

  const { data: item, error: itemError } = await supabase
    .from('receipt_items')
    .select('product_name, estimated_calories_kcal, estimated_protein_g, estimated_carbs_g, estimated_fat_g')
    .eq('id', receiptItemId)
    .single()

  if (itemError || !item) throw new Error('Artikel nicht gefunden')

  return addNutritionLog({
    household_id: householdId,
    meal_type: mealType,
    item_name: item.product_name,
    calories_kcal: item.estimated_calories_kcal || 0,
    protein_g: Number(item.estimated_protein_g) || 0,
    carbs_g: Number(item.estimated_carbs_g) || 0,
    fat_g: Number(item.estimated_fat_g) || 0,
    receipt_item_id: receiptItemId,
    is_from_suggestion: true,
  })
}

export async function dismissSuggestion(householdId: string, receiptItemId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht eingeloggt')

  const { error } = await supabase.from('nutrition_logs').insert({
    household_id: householdId,
    user_id: user.id,
    meal_type: 'snacks',
    receipt_item_id: receiptItemId,
    suggestion_dismissed: true,
    calories_kcal: 0,
  })

  if (error) throw new Error(error.message)
}
