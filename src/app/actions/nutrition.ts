"use server"

import { createServerClient as createClient } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"
import { calculateBMR, calculateTDEE, type ActivityLevel, type Gender } from "@/lib/nutrition-utils"

// --- Member Nutrition Profile ---

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
  const supabase = await createClient()

  // Compute BMR and TDEE
  const bmr = calculateBMR(data.weight_kg, data.height_cm, data.age_years, data.gender)
  const tdee = calculateTDEE(bmr, data.activity_level)

  const { data: profile, error } = await supabase
    .from("member_nutrition_profiles")
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
      { onConflict: "household_member_id" }
    )
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath("/dashboard")
  revalidatePath("/settings")
  return profile
}

export async function getHouseholdNutritionProfiles(householdId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("household_members")
    .select(`
      id,
      user_id,
      role,
      profiles:profiles(display_name, avatar_url),
      member_nutrition_profiles(*)
    `)
    .eq("household_id", householdId)

  if (error) throw new Error(error.message)
  return data
}

// --- Nutrition Logs ---

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
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Nicht eingeloggt")

  const { data, error } = await supabase
    .from("nutrition_logs")
    .insert({
      household_id: logData.household_id,
      user_id: user.id,
      log_date: logData.log_date || new Date().toISOString().split("T")[0],
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
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/ernaehrung")
  return data
}

export async function deleteNutritionLog(logId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("nutrition_logs")
    .delete()
    .eq("id", logId)

  if (error) throw new Error(error.message)

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/ernaehrung")
}

export async function getDailyNutritionSummary(
  householdId: string,
  userId: string,
  date: string
) {
  const supabase = await createClient()

  const { data: logs, error } = await supabase
    .from("nutrition_logs")
    .select("*")
    .eq("household_id", householdId)
    .eq("user_id", userId)
    .eq("log_date", date)
    .order("created_at", { ascending: true })

  if (error) throw new Error(error.message)

  // Get user's nutrition profile for targets
  const { data: memberData } = await supabase
    .from("household_members")
    .select("id")
    .eq("household_id", householdId)
    .eq("user_id", userId)
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
      .from("member_nutrition_profiles")
      .select("*")
      .eq("household_member_id", memberData.id)
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

  // Aggregate by type
  const foodLogs = logs?.filter(l => ['fruehstueck', 'mittagessen', 'abendessen', 'snacks'].includes(l.meal_type)) || []
  const activityLogs = logs?.filter(l => l.meal_type === 'activity') || []
  const fluidLogs = logs?.filter(l => l.meal_type === 'fluid') || []

  const totalCalories = foodLogs.reduce((sum, l) => sum + (l.calories_kcal || 0), 0)
  const totalProtein = foodLogs.reduce((sum, l) => sum + Number(l.protein_g || 0), 0)
  const totalCarbs = foodLogs.reduce((sum, l) => sum + Number(l.carbs_g || 0), 0)
  const totalFat = foodLogs.reduce((sum, l) => sum + Number(l.fat_g || 0), 0)
  const totalBurned = activityLogs.reduce((sum, l) => sum + (l.burned_calories_kcal || 0), 0)
  const totalFluid = fluidLogs.reduce((sum, l) => sum + (l.fluid_ml || 0), 0)

  // Group food by meal type
  const meals: Record<string, typeof foodLogs> = {
    fruehstueck: [],
    mittagessen: [],
    abendessen: [],
    snacks: [],
  }
  foodLogs.forEach(log => {
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

// --- Supply Range ---

export async function getSupplyRange(householdId: string, daysLookback = 30) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .rpc("get_supply_range", {
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

// --- Smart Suggestions ---

export async function getSmartSuggestions(householdId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Find recent food items from receipts that haven't been logged yet
  const { data: recentItems, error } = await supabase
    .from("receipt_items")
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
    .eq("receipts.household_id", householdId)
    .eq("is_food_item", true)
    .not("estimated_calories_kcal", "is", null)
    .gt("estimated_calories_kcal", 0)
    .order("created_at", { ascending: false, referencedTable: "receipts" })
    .limit(20)

  if (error || !recentItems?.length) return null

  // Filter out items already logged or dismissed
  const { data: loggedItemIds } = await supabase
    .from("nutrition_logs")
    .select("receipt_item_id")
    .eq("household_id", householdId)
    .eq("user_id", user.id)
    .not("receipt_item_id", "is", null)

  const loggedIds = new Set(loggedItemIds?.map(l => l.receipt_item_id) || [])

  // Also filter dismissed suggestions
  const { data: dismissedIds } = await supabase
    .from("nutrition_logs")
    .select("receipt_item_id")
    .eq("household_id", householdId)
    .eq("suggestion_dismissed", true)
    .not("receipt_item_id", "is", null)

  const dismissed = new Set(dismissedIds?.map(l => l.receipt_item_id) || [])

  const unloggedItems = recentItems.filter(
    item => !loggedIds.has(item.id) && !dismissed.has(item.id)
  )

  if (unloggedItems.length === 0) return null

  const item = unloggedItems[0]
  const receipt = item.receipts as { date: string; household_id: string; merchants: { name: string } | null }

  // Heuristic for meal type based on current time
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

export async function logFromSuggestion(
  householdId: string,
  receiptItemId: string,
  mealType: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Nicht eingeloggt")

  // Get the receipt item data
  const { data: item, error: itemError } = await supabase
    .from("receipt_items")
    .select("product_name, estimated_calories_kcal, estimated_protein_g, estimated_carbs_g, estimated_fat_g")
    .eq("id", receiptItemId)
    .single()

  if (itemError || !item) throw new Error("Artikel nicht gefunden")

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

export async function dismissSuggestion(
  householdId: string,
  receiptItemId: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Nicht eingeloggt")

  // Create a dismissed log entry
  const { error } = await supabase
    .from("nutrition_logs")
    .insert({
      household_id: householdId,
      user_id: user.id,
      meal_type: "snacks",
      receipt_item_id: receiptItemId,
      suggestion_dismissed: true,
      calories_kcal: 0,
    })

  if (error) throw new Error(error.message)
}
