'use server'

import {
  upsertMemberNutritionProfile as upsertMemberNutritionProfileAction,
  getHouseholdNutritionProfiles as getHouseholdNutritionProfilesAction,
} from './nutrition/profile'
import {
  addNutritionLog as addNutritionLogAction,
  deleteNutritionLog as deleteNutritionLogAction,
  getDailyNutritionSummary as getDailyNutritionSummaryAction,
  getRecentFoodItems as getRecentFoodItemsAction,
} from './nutrition/logs'
import {
  searchNutritionLibrary as searchNutritionLibraryAction,
  getProductByBarcode as getProductByBarcodeAction,
} from './nutrition/search'
import { getSupplyRange as getSupplyRangeAction } from './nutrition/supply'
import {
  getSmartSuggestions as getSmartSuggestionsAction,
  logFromSuggestion as logFromSuggestionAction,
  dismissSuggestion as dismissSuggestionAction,
} from './nutrition/suggestions'
import { getNutritionDeficitStats as getNutritionDeficitStatsAction } from './nutrition/deficit'

export async function upsertMemberNutritionProfile(...args: Parameters<typeof upsertMemberNutritionProfileAction>) {
  return upsertMemberNutritionProfileAction(...args)
}

export async function getHouseholdNutritionProfiles(...args: Parameters<typeof getHouseholdNutritionProfilesAction>) {
  return getHouseholdNutritionProfilesAction(...args)
}

export async function addNutritionLog(...args: Parameters<typeof addNutritionLogAction>) {
  return addNutritionLogAction(...args)
}

export async function deleteNutritionLog(...args: Parameters<typeof deleteNutritionLogAction>) {
  return deleteNutritionLogAction(...args)
}

export async function getDailyNutritionSummary(...args: Parameters<typeof getDailyNutritionSummaryAction>) {
  return getDailyNutritionSummaryAction(...args)
}

export async function getRecentFoodItems(...args: Parameters<typeof getRecentFoodItemsAction>) {
  return getRecentFoodItemsAction(...args)
}

export async function searchNutritionLibrary(...args: Parameters<typeof searchNutritionLibraryAction>) {
  return searchNutritionLibraryAction(...args)
}

export async function getProductByBarcode(...args: Parameters<typeof getProductByBarcodeAction>) {
  return getProductByBarcodeAction(...args)
}

export async function getSupplyRange(...args: Parameters<typeof getSupplyRangeAction>) {
  return getSupplyRangeAction(...args)
}

export async function getSmartSuggestions(...args: Parameters<typeof getSmartSuggestionsAction>) {
  return getSmartSuggestionsAction(...args)
}

export async function logFromSuggestion(...args: Parameters<typeof logFromSuggestionAction>) {
  return logFromSuggestionAction(...args)
}

export async function dismissSuggestion(...args: Parameters<typeof dismissSuggestionAction>) {
  return dismissSuggestionAction(...args)
}

export async function getNutritionDeficitStats(...args: Parameters<typeof getNutritionDeficitStatsAction>) {
  return getNutritionDeficitStatsAction(...args)
}

export type { NutritionLibraryItem, SearchResult } from './nutrition/search'
export type { FoodItem } from './nutrition/shared'
