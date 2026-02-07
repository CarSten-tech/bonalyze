// Activity level multipliers for TDEE calculation (Harris-Benedict refined)
const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
} as const

export type ActivityLevel = keyof typeof ACTIVITY_MULTIPLIERS
export type Gender = 'male' | 'female'

/**
 * Mifflin-St Jeor BMR Formula
 * Male:   10 * weight(kg) + 6.25 * height(cm) - 5 * age(y) + 5
 * Female: 10 * weight(kg) + 6.25 * height(cm) - 5 * age(y) - 161
 */
export function calculateBMR(
  weight_kg: number,
  height_cm: number,
  age_years: number,
  gender: Gender
): number {
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age_years
  return Math.round(gender === 'male' ? base + 5 : base - 161)
}

export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel])
}

// Default macro split: 50% carbs, 25% protein, 25% fat
export function getDefaultMacroTargets(tdee: number) {
  return {
    protein_g: Math.round((tdee * 0.25) / 4), // 4 kcal per gram protein
    carbs_g: Math.round((tdee * 0.50) / 4),   // 4 kcal per gram carbs
    fat_g: Math.round((tdee * 0.25) / 9),     // 9 kcal per gram fat
  }
}

// German labels
export const ACTIVITY_LEVEL_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sitzend (wenig Bewegung)',
  light: 'Leicht aktiv (1-3x/Woche)',
  moderate: 'Moderat aktiv (3-5x/Woche)',
  active: 'Aktiv (6-7x/Woche)',
  very_active: 'Sehr aktiv (Schwerstarbeit)',
}

export const GENDER_LABELS: Record<Gender, string> = {
  male: 'Maennlich',
  female: 'Weiblich',
}

export const MEAL_TYPE_LABELS: Record<string, string> = {
  fruehstueck: 'Fruehstueck',
  mittagessen: 'Mittagessen',
  abendessen: 'Abendessen',
  snacks: 'Snacks',
}

export const MEAL_TYPE_ICONS: Record<string, string> = {
  fruehstueck: 'coffee',
  mittagessen: 'utensils',
  abendessen: 'moon',
  snacks: 'cookie',
}
