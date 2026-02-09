'use client'

import { addNutritionLog, deleteNutritionLog } from '@/app/actions/nutrition'

// Registry of actions that can be synced
// Keys must be stable strings
export const SYNC_ACTIONS = {
  'ADD_NUTRITION_LOG': addNutritionLog,
  'DELETE_NUTRITION_LOG': deleteNutritionLog,
} as const

export type SyncActionType = keyof typeof SYNC_ACTIONS
