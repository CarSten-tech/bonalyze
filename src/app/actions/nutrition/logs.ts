'use server'

import { createServerClient as createClient } from '@/lib/supabase-server'
import { addNutritionLogSchema, formatValidationMessage, uuidSchema } from '@/lib/validations'
import { writeAuditLog } from '@/lib/audit-log'

export async function addNutritionLog(logData: {
  household_id: string
  meal_type: string
  item_name?: string
  calories_kcal?: number
  protein_g?: number
  carbs_g?: number
  fat_g?: number
  activity_name?: string
  burned_calories_kcal?: number
  duration_minutes?: number
  fluid_ml?: number
  receipt_item_id?: string
  is_from_suggestion?: boolean
  log_date?: string
  group_id?: string
  group_name?: string
}) {
  const parsed = addNutritionLogSchema.safeParse(logData)
  if (!parsed.success) {
    throw new Error(formatValidationMessage(parsed.error))
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht eingeloggt')

  const { data, error } = await supabase
    .from('nutrition_logs')
    .insert({
      household_id: logData.household_id,
      user_id: user.id,
      log_date: logData.log_date || new Date().toISOString().split('T')[0],
      meal_type: logData.meal_type,
      item_name: logData.item_name,
      calories_kcal: logData.calories_kcal || 0,
      protein_g: logData.protein_g || 0,
      carbs_g: logData.carbs_g || 0,
      fat_g: logData.fat_g || 0,
      activity_name: logData.activity_name,
      burned_calories_kcal: logData.burned_calories_kcal || 0,
      duration_minutes: logData.duration_minutes,
      fluid_ml: logData.fluid_ml || 0,
      receipt_item_id: logData.receipt_item_id,
      is_from_suggestion: logData.is_from_suggestion || false,
      group_id: logData.group_id,
      group_name: logData.group_name,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  await writeAuditLog({
    householdId: logData.household_id,
    actorUserId: user.id,
    action: 'create',
    entityType: 'nutrition_log',
    entityId: data.id,
    details: {
      mealType: logData.meal_type,
      itemName: logData.item_name ?? null,
      calories: logData.calories_kcal ?? 0,
    },
  })

  return data
}

export async function deleteNutritionLog(logId: string) {
  const parsed = uuidSchema.safeParse(logId)
  if (!parsed.success) throw new Error('Ungueltige Log-ID')

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht eingeloggt')

  const { data: existingLog } = await supabase
    .from('nutrition_logs')
    .select('id, household_id, meal_type, item_name')
    .eq('id', logId)
    .maybeSingle()

  const { error } = await supabase.from('nutrition_logs').delete().eq('id', logId)

  if (error) throw new Error(error.message)

  if (existingLog) {
    await writeAuditLog({
      householdId: existingLog.household_id,
      actorUserId: user.id,
      action: 'delete',
      entityType: 'nutrition_log',
      entityId: existingLog.id,
      details: {
        mealType: existingLog.meal_type,
        itemName: existingLog.item_name,
      },
    })
  }
}

export async function getDailyNutritionSummary(householdId: string, userId: string, date: string) {
  const supabase = await createClient()

  const { data: logs, error } = await supabase
    .from('nutrition_logs')
    .select('*')
    .eq('household_id', householdId)
    .eq('user_id', userId)
    .eq('log_date', date)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)

  const { data: memberData } = await supabase
    .from('household_members')
    .select('id')
    .eq('household_id', householdId)
    .eq('user_id', userId)
    .single()

  let targets = {
    calories: 2000,
    protein: 75,
    carbs: 250,
    fat: 65,
    water: 2500,
  }

  if (memberData) {
    const { data: profile } = await supabase
      .from('member_nutrition_profiles')
      .select('*')
      .eq('household_member_id', memberData.id)
      .single()

    if (profile) {
      targets = {
        calories: profile.target_calories_kcal || profile.tdee_kcal || 2000,
        protein: profile.target_protein_g || Math.round((profile.tdee_kcal * 0.25) / 4),
        carbs: profile.target_carbs_g || Math.round((profile.tdee_kcal * 0.5) / 4),
        fat: profile.target_fat_g || Math.round((profile.tdee_kcal * 0.25) / 9),
        water: profile.target_water_ml || 2500,
      }
    }
  }

  const foodLogs = logs?.filter((l) => ['fruehstueck', 'mittagessen', 'abendessen', 'snacks'].includes(l.meal_type)) || []
  const activityLogs = logs?.filter((l) => l.meal_type === 'activity') || []
  const fluidLogs = logs?.filter((l) => l.meal_type === 'fluid') || []

  const totalCalories = foodLogs.reduce((sum, l) => sum + (l.calories_kcal || 0), 0)
  const totalProtein = foodLogs.reduce((sum, l) => sum + Number(l.protein_g || 0), 0)
  const totalCarbs = foodLogs.reduce((sum, l) => sum + Number(l.carbs_g || 0), 0)
  const totalFat = foodLogs.reduce((sum, l) => sum + Number(l.fat_g || 0), 0)
  const totalBurned = activityLogs.reduce((sum, l) => sum + (l.burned_calories_kcal || 0), 0)
  const totalFluid = fluidLogs.reduce((sum, l) => sum + (l.fluid_ml || 0), 0)

  const meals: Record<string, typeof foodLogs> = {
    fruehstueck: [],
    mittagessen: [],
    abendessen: [],
    snacks: [],
  }

  foodLogs.forEach((log) => {
    if (meals[log.meal_type]) {
      meals[log.meal_type].push(log)
    }
  })

  return {
    date,
    targets,
    consumption: {
      calories: totalCalories,
      protein: Math.round(totalProtein),
      carbs: Math.round(totalCarbs),
      fat: Math.round(totalFat),
    },
    activity: {
      totalBurned,
      count: activityLogs.length,
      logs: activityLogs,
    },
    fluid: {
      totalMl: totalFluid,
      logs: fluidLogs,
    },
    meals,
    allLogs: logs || [],
  }
}

export async function getRecentFoodItems(householdId: string, userId: string, mealType: string, limit = 20) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('nutrition_logs')
    .select('item_name, calories_kcal, protein_g, carbs_g, fat_g')
    .eq('household_id', householdId)
    .eq('user_id', userId)
    .eq('meal_type', mealType)
    .not('item_name', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)

  const seen = new Set<string>()
  return (data || []).filter((item) => {
    if (!item.item_name || seen.has(item.item_name)) return false
    seen.add(item.item_name)
    return true
  })
}
