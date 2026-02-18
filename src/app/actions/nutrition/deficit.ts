'use server'

import { createServerClient as createClient } from '@/lib/supabase-server'

/**
 * Calculates calorie deficit stats for a member:
 * Daily: (TDEE + Activity) - Intake
 * Total: Cumulative deficit over all tracked days
 */
export async function getNutritionDeficitStats(householdId: string, userId: string, date: string) {
  const supabase = await createClient()

  const { data: memberData } = await supabase
    .from('household_members')
    .select('id')
    .eq('household_id', householdId)
    .eq('user_id', userId)
    .single()

  let tdee = 2000
  if (memberData) {
    const { data: profile } = await supabase
      .from('member_nutrition_profiles')
      .select('target_calories_kcal, tdee_kcal')
      .eq('household_member_id', memberData.id)
      .single()

    if (profile) {
      tdee = profile.target_calories_kcal || profile.tdee_kcal || 2000
    }
  }

  const { data: dailyLogs } = await supabase
    .from('nutrition_logs')
    .select('calories_kcal, burned_calories_kcal, meal_type')
    .eq('household_id', householdId)
    .eq('user_id', userId)
    .eq('log_date', date)
    .is('suggestion_dismissed', false)

  const dailyIntake =
    dailyLogs
      ?.filter((l) => !['activity', 'fluid'].includes(l.meal_type))
      .reduce((sum, l) => sum + (l.calories_kcal || 0), 0) || 0

  const dailyActivity =
    dailyLogs
      ?.filter((l) => l.meal_type === 'activity')
      .reduce((sum, l) => sum + (l.burned_calories_kcal || 0), 0) || 0

  const dailyDeficit = tdee + dailyActivity - dailyIntake

  const { data: allLogs } = await supabase
    .from('nutrition_logs')
    .select('calories_kcal, burned_calories_kcal, log_date, meal_type')
    .eq('household_id', householdId)
    .eq('user_id', userId)
    .is('suggestion_dismissed', false)

  if (!allLogs || allLogs.length === 0) {
    return {
      dailyDeficit,
      totalDeficit: dailyDeficit,
      tdee,
      daysTracked: 1,
    }
  }

  const trackedDays =
    new Set(allLogs.filter((l) => !['activity', 'fluid'].includes(l.meal_type)).map((l) => l.log_date)).size || 1

  const totalIntake = allLogs
    .filter((l) => !['activity', 'fluid'].includes(l.meal_type))
    .reduce((sum, l) => sum + (l.calories_kcal || 0), 0)

  const totalActivity = allLogs
    .filter((l) => l.meal_type === 'activity')
    .reduce((sum, l) => sum + (l.burned_calories_kcal || 0), 0)

  const totalDeficit = tdee * trackedDays + totalActivity - totalIntake

  return {
    dailyDeficit,
    totalDeficit,
    tdee,
    daysTracked: trackedDays,
  }
}
