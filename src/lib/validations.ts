import { z } from 'zod'

// ============================================================================
// Shared Validators
// ============================================================================

export const uuidSchema = z.string().uuid()

export const householdIdSchema = uuidSchema

export const paginationSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
})

// ============================================================================
// Budget Schemas
// ============================================================================

export const upsertBudgetSchema = z.object({
  householdId: uuidSchema,
  data: z.object({
    period_type: z.enum(['monthly', 'weekly']),
    total_amount_cents: z.number().int().min(0).max(100_000_00), // max 100k EUR
    categories: z.array(z.object({
      category: z.string().min(1).max(100),
      amount_cents: z.number().int().min(0),
    })).optional(),
  }),
})

// ============================================================================
// Nutrition Schemas
// ============================================================================

export const addNutritionLogSchema = z.object({
  household_id: uuidSchema,
  meal_type: z.enum(['fruehstueck', 'mittagessen', 'abendessen', 'snacks', 'fluid', 'activity']),
  item_name: z.string().max(200).optional(),
  calories_kcal: z.number().min(0).max(50000).optional(),
  protein_g: z.number().min(0).max(5000).optional(),
  carbs_g: z.number().min(0).max(5000).optional(),
  fat_g: z.number().min(0).max(5000).optional(),
  activity_name: z.string().max(200).optional(),
  burned_calories_kcal: z.number().min(0).max(50000).optional(),
  duration_minutes: z.number().min(0).max(1440).optional(),
  fluid_ml: z.number().min(0).max(50000).optional(),
  receipt_item_id: uuidSchema.optional(),
  is_from_suggestion: z.boolean().optional(),
  log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  group_id: z.string().max(100).optional(),
  group_name: z.string().max(200).optional(),
})

export const memberNutritionProfileSchema = z.object({
  householdMemberId: uuidSchema,
  data: z.object({
    age_years: z.number().int().min(1).max(150),
    weight_kg: z.number().min(1).max(500),
    height_cm: z.number().min(30).max(300),
    gender: z.enum(['male', 'female']),
    activity_level: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']),
    target_calories_kcal: z.number().min(0).max(20000).nullable().optional(),
    target_protein_g: z.number().min(0).max(1000).nullable().optional(),
    target_carbs_g: z.number().min(0).max(2000).nullable().optional(),
    target_fat_g: z.number().min(0).max(1000).nullable().optional(),
    target_water_ml: z.number().min(0).max(20000).nullable().optional(),
  }),
})

export const searchNutritionLibrarySchema = z.object({
  query: z.string().min(1).max(200).trim(),
  page: z.number().int().min(0).max(100).optional().default(0),
})

// ============================================================================
// Notification Schemas
// ============================================================================

export const saveSubscriptionSchema = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({
    auth: z.string().min(1).max(500),
    p256dh: z.string().min(1).max(500),
  }),
})

export const notificationIdSchema = uuidSchema

// ============================================================================
// Shopping List Schemas
// ============================================================================

export const shoppingListIdSchema = uuidSchema

export const searchQuerySchema = z.string().max(200).optional()
