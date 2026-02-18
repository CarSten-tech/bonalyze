'use server'

import { createServerClient as createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { calculateBMR, calculateTDEE, type ActivityLevel, type Gender } from '@/lib/nutrition-utils'
import { formatValidationMessage, memberNutritionProfileSchema } from '@/lib/validations'

export async function upsertMemberNutritionProfile(
  householdMemberId: string,
  data: {
    age_years: number
    weight_kg: number
    height_cm: number
    gender: Gender
    activity_level: ActivityLevel
    target_calories_kcal?: number | null
    target_protein_g?: number | null
    target_carbs_g?: number | null
    target_fat_g?: number | null
    target_water_ml?: number | null
  }
) {
  const parsed = memberNutritionProfileSchema.safeParse({ householdMemberId, data })
  if (!parsed.success) {
    throw new Error(formatValidationMessage(parsed.error))
  }

  const supabase = await createClient()

  const bmr = calculateBMR(data.weight_kg, data.height_cm, data.age_years, data.gender)
  const tdee = calculateTDEE(bmr, data.activity_level)

  const { data: profile, error } = await supabase
    .from('member_nutrition_profiles')
    .upsert(
      {
        household_member_id: householdMemberId,
        age_years: data.age_years,
        weight_kg: data.weight_kg,
        height_cm: data.height_cm,
        gender: data.gender,
        activity_level: data.activity_level,
        bmr_kcal: bmr,
        tdee_kcal: tdee,
        target_calories_kcal: data.target_calories_kcal ?? null,
        target_protein_g: data.target_protein_g ?? null,
        target_carbs_g: data.target_carbs_g ?? null,
        target_fat_g: data.target_fat_g ?? null,
        target_water_ml: data.target_water_ml ?? 2500,
      },
      { onConflict: 'household_member_id' }
    )
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
  revalidatePath('/settings')
  return profile
}

export async function getHouseholdNutritionProfiles(householdId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('household_members')
    .select(`
      id,
      user_id,
      role,
      profiles:profiles(display_name, avatar_url),
      member_nutrition_profiles(*)
    `)
    .eq('household_id', householdId)

  if (error) throw new Error(error.message)
  return data
}
