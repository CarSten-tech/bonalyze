'use server'

import { createServerClient as createClient } from '@/lib/supabase-server'

export async function getSupplyRange(householdId: string, daysLookback = 30) {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_supply_range', {
    p_household_id: householdId,
    p_days_lookback: daysLookback,
  })

  if (error) throw new Error(error.message)

  const row = data?.[0]
  if (!row) return null

  return {
    totalCaloriesPurchased: row.total_calories_purchased || 0,
    totalProteinG: Number(row.total_protein_g) || 0,
    totalCarbsG: Number(row.total_carbs_g) || 0,
    totalFatG: Number(row.total_fat_g) || 0,
    dailyHouseholdBurn: row.daily_household_burn || 0,
    coverageDays: Number(row.coverage_days) || 0,
    memberCount: row.member_count || 0,
    foodItemCount: row.food_item_count || 0,
    hasProfiles: (row.member_count || 0) > 0,
  }
}
