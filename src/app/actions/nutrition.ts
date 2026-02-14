"use server"

import { createServerClient as createClient } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"
import { calculateBMR, calculateTDEE, type ActivityLevel, type Gender } from "@/lib/nutrition-utils"
import { isRateLimited } from "@/lib/rate-limit"

// --- SEARCH HELPERS & TYPES (NEU) ---

export type FoodItem = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  category: string;
  brand?: string;
  source: 'bls' | 'openfoodfacts';
};

// Berechnet den Median, um Ausreißer bei Nährwerten zu ignorieren
function getMedian(values: number[]): number {
  if (values.length === 0) return 0;
  values.sort((a, b) => a - b);
  const half = Math.floor(values.length / 2);
  if (values.length % 2) return values[half];
  return (values[half - 1] + values[half]) / 2.0;
}

// Normalisiert Produktnamen für besseres Clustering (z.B. "Rewe Bio Tomaten" -> "tomaten")
function normalizeName(name: string): string {
  return name.toLowerCase()
    .replace(/\b(bio|eco|organic|natur|premium|kl\.|klasse|choice|selection|beste|wahl|eigenmarke|original|frische|genuss)\b/g, '')
    .replace(/\b(rewe|edeka|aldi|lidl|ja!|gut&günstig|k-classic|milbona|baleares|spanische|italienische|deutsche|penny|netto)\b/g, '')
    .replace(/[^a-zäöüß0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Word-based match: Checks if ALL words of the search term appear
 * somewhere in the product name (order-independent).
 * "milch" matches "Alpenmilch", "Vollmilch 3,5%", etc.
 */
function wordMatch(productName: string, searchTerm: string): boolean {
  const nameLower = productName.toLowerCase();
  const searchWords = searchTerm.toLowerCase().split(/\s+/).filter(w => w.length > 1);
  if (searchWords.length === 0) return false;
  return searchWords.every(word => nameLower.includes(word));
}

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

  return data
}

export async function deleteNutritionLog(logId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("nutrition_logs")
    .delete()
    .eq("id", logId)

  if (error) throw new Error(error.message)
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

// --- Recent Food Items (for meal entry page) ---

export async function getRecentFoodItems(
  householdId: string,
  userId: string,
  mealType: string,
  limit = 20
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("nutrition_logs")
    .select("item_name, calories_kcal, protein_g, carbs_g, fat_g")
    .eq("household_id", householdId)
    .eq("user_id", userId)
    .eq("meal_type", mealType)
    .not("item_name", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)

  // Deduplicate by item_name
  const seen = new Set<string>()
  return (data || []).filter((item) => {
    if (!item.item_name || seen.has(item.item_name)) return false
    seen.add(item.item_name)
    return true
  })
}

// --- Local Food Database Search (BLS) ---

import type { Tables } from '@/types/database.types'
import { serverCache, createCacheKey } from '@/lib/cache'

/** Exported type for nutrition library items */
export type NutritionLibraryRow = Tables<'nutrition_library'>

export interface NutritionLibraryItem {
  id: string
  bls_code: string
  name: string
  category: string | null
  calories: number
  protein: number
  carbs: number
  fat: number
}

const BLS_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

export interface SearchResult<T> {
  items: T[]
  count: number
}

/**
 * Searches the local BLS nutrition library database using the 'search_food' RPC.
 * This is a highly performant server-side search.
 * Includes rate limiting to prevent RPC abuse and parallel OFF search with smart clustering.
 */
export async function searchNutritionLibrary(query: string, page: number = 0) {
  console.time(`[Search] Total:${query}`);
  console.time(`[Search] CreateClient:${query}`);
  const supabase = await createClient(); 
  console.timeEnd(`[Search] CreateClient:${query}`);
  const ITEMS_PER_PAGE = 20;

  console.time(`[Search] Auth:${query}`);
  const { data: { user } } = await supabase.auth.getUser();
  console.timeEnd(`[Search] Auth:${query}`);
  if (user) {
    if (isRateLimited(`search:${user.id}`, 30, 60000)) {
      throw new Error('Zu viele Suchanfragen. Bitte versuche es in einer Minute erneut.')
    }
  }

  // Check cache first
  const cacheKey = createCacheKey('combined-search', query.toLowerCase(), page)
  const cached = serverCache.get<{ success: boolean, data: FoodItem[] }>(cacheKey)
  if (cached) {
    console.log(`[Search] Cache hit for: ${query}`);
    return cached;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout for OFF

  try {
    console.time(`[Search] BLS:${query}`);
    console.time(`[Search] OFF:${query}`);
    // 1. Parallel-Abfrage: BLS (Lokal via RPC) + OFF (API Deutschland)
    const [blsResult, offResult] = await Promise.allSettled([
      // A) Suche in deiner lokalen Datenbank (BLS)
      supabase.rpc('search_food', {
        search_term: query,
        items_per_page: ITEMS_PER_PAGE,
        page_number: page
      }).then(res => {
        console.timeEnd(`[Search] BLS:${query}`);
        return res;
      }),
      
      // B) OpenFoodFacts: weltweite Suche mit Germany-Tag, nur Seite 1, nur wichtige Felder
      // Wir laden 50 Items, um genug Daten für intelligentes Clustering zu haben
      fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=50&page=1&tagtype_0=countries&tag_contains_0=contains&tag_0=germany&fields=code,product_name,nutriments,brands`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Bonalyze/1.0 (Nutrition Tracker; contact@bonalyze.de)' },
        next: { revalidate: 3600 } // Cache für 1 Stunde
      })
      .then(res => res.json())
      .then(json => {
        console.timeEnd(`[Search] OFF:${query}`);
        return json;
      })
      .finally(() => clearTimeout(timeoutId))
    ]);

    let finalResults: FoodItem[] = [];

    // --- TEIL A: BLS Ergebnisse verarbeiten ---
    if (blsResult.status === 'fulfilled' && blsResult.value.data) {
      finalResults = blsResult.value.data.map((item: any) => ({
        id: item.id.toString(),
        name: item.name,
        calories: item.calories,
        protein: item.protein || 0,
        carbs: item.carbs || 0,
        fat: item.fat || 0,
        category: item.category || 'Allgemein',
        source: 'bls'
      }));
    }

    // --- TEIL B: OpenFoodFacts "Smart Clustering" ---
    // Logik: Wir laden OFF-Daten NUR, wenn wir auf Seite 0 sind (ganz oben).
    // Das verhindert Duplikate beim Infinite Scroll.
    if (page === 0 && offResult.status === 'fulfilled' && (offResult.value as any).products) {
      const products = (offResult.value as any).products;
      const clusters = new Map<string, any[]>();
      const unmatchedProducts: any[] = [];

      products.forEach((p: any) => {
        // Validierung: Muss Name & Kalorien haben
        if (!p.product_name || !p.nutriments || p.nutriments['energy-kcal_100g'] === undefined) return;
        // Kalorien müssen realistisch sein (> 0)
        if (Number(p.nutriments['energy-kcal_100g']) <= 0) return;
        
        const cleanName = normalizeName(p.product_name);
        
        // Wörter-basierter Match: Jedes Suchwort muss im Produktnamen vorkommen
        if (wordMatch(p.product_name, query)) {
          // Cluster nach normalisiertem Namen
          if (!clusters.has(cleanName)) clusters.set(cleanName, []);
          clusters.get(cleanName)?.push(p);
        } else {
          // Produkte die den OFF-API-Match haben aber nicht unseren Wort-Filter:
          // als Einzelprodukte aufnehmen (Fallback)
          unmatchedProducts.push(p);
        }
      });

      const clusteredItems: FoodItem[] = [];
      
      clusters.forEach((items, cleanKey) => {
        // Median berechnen (gegen Ausreißer bei User-Eingaben)
        const calories = items.map((i: any) => Number(i.nutriments['energy-kcal_100g']));
        const proteins = items.map((i: any) => Number(i.nutriments.proteins_100g || 0));
        const carbs = items.map((i: any) => Number(i.nutriments.carbohydrates_100g || 0));
        const fats = items.map((i: any) => Number(i.nutriments.fat_100g || 0));
        
        // Den kürzesten (meist generischsten) Namen für die Anzeige wählen
        const bestName = items.sort((a: any, b: any) => a.product_name.length - b.product_name.length)[0].product_name;

        clusteredItems.push({
          id: `off_cluster_${cleanKey.replace(/\s/g, '_')}`,
          name: bestName, 
          calories: Math.round(getMedian(calories)),
          protein: Math.round(getMedian(proteins) * 10) / 10,
          carbs: Math.round(getMedian(carbs) * 10) / 10,
          fat: Math.round(getMedian(fats) * 10) / 10,
          category: 'Extern (Geprüft)',
          brand: items.length > 1 ? `Ø aus ${items.length} Produkten` : (items[0].brands || 'OpenFoodFacts'),
          source: 'openfoodfacts'
        });
      });

      // Sortieren nach Popularität (Anzahl der Produkte im Cluster)
      clusteredItems.sort((a, b) => {
         const countA = a.brand?.match(/\d+/)?.[0] ? parseInt(a.brand?.match(/\d+/)?.[0]!) : 1;
         const countB = b.brand?.match(/\d+/)?.[0] ? parseInt(b.brand?.match(/\d+/)?.[0]!) : 1;
         return countB - countA;
      });

      // Fallback: Einzelne OFF-Produkte die den API-Match haben aber nicht den Wort-Filter
      // (z.B. Markenprodukte wie "Nutella" die der OFF-API kennt)
      const individualItems: FoodItem[] = unmatchedProducts.slice(0, 5).map((p: any) => ({
        id: `off_${p.code || crypto.randomUUID()}`,
        name: p.product_name,
        calories: Math.round(Number(p.nutriments['energy-kcal_100g'])),
        protein: Math.round(Number(p.nutriments.proteins_100g || 0) * 10) / 10,
        carbs: Math.round(Number(p.nutriments.carbohydrates_100g || 0) * 10) / 10,
        fat: Math.round(Number(p.nutriments.fat_100g || 0) * 10) / 10,
        category: 'Online-Suche',
        brand: p.brands || 'OpenFoodFacts',
        source: 'openfoodfacts' as const
      }));

      // Füge geclusterte + einzelne OFF-Ergebnisse VOR die BLS Ergebnisse ein
      const offResults = [...clusteredItems.slice(0, 5), ...individualItems];
      console.log(`[Search] OFF: ${clusteredItems.length} clusters, ${individualItems.length} individual, ${products.length} raw products`);
      finalResults = [...offResults, ...finalResults];
    } else if (page === 0 && offResult.status === 'rejected') {
      console.warn('[Search] OFF request failed/timed out, showing BLS only:', offResult.reason);
    }

    const result = { success: true, data: finalResults };
    serverCache.set(cacheKey, result, 5 * 60 * 1000); // 5 minutes cache
    return result;

  } catch (error) {
    console.error('Search Error:', error);
    return { success: false, data: [] };
  } finally {
    console.timeEnd(`[Search] Total:${query}`);
  }
}

/**
 * Fetches a single product by barcode from Open Food Facts.
 * Used for direct barcode scanning.
 */
export async function getProductByBarcode(barcode: string): Promise<NutritionLibraryItem | null> {
  const cacheKey = createCacheKey('off-barcode', barcode)
  const cached = serverCache.get<NutritionLibraryItem>(cacheKey)
  if (cached) return cached

  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
      {
        headers: {
          'User-Agent': 'Bonalyze/1.0 (Nutrition Tracker; contact@bonalyze.de)',
        },
        next: { revalidate: 3600 } // Next.js native fetch cache (1 hour)
      }
    )

    if (!response.ok) return null

    const data = await response.json()
    if (!data.product) return null

    const p = data.product
    
    // Normalize to our internal format
    const item: NutritionLibraryItem = {
      id: `off-${p.code || barcode}`,
      bls_code: p.code || barcode,
      name: p.product_name || 'Unbekanntes Produkt',
      category: p.categories_tags?.[0]?.replace('en:', '') || null,
      calories: Math.round(p.nutriments?.['energy-kcal_100g'] || 0),
      protein: Math.round((p.nutriments?.['proteins_100g'] || 0) * 10) / 10,
      fat: Math.round((p.nutriments?.['fat_100g'] || 0) * 10) / 10,
      carbs: Math.round((p.nutriments?.['carbohydrates_100g'] || 0) * 10) / 10,
    }

    serverCache.set(cacheKey, item, 60 * 60 * 1000) // 1 hour memory cache
    return item
  } catch (err) {
    console.error('[getProductByBarcode] API error:', err)
    return null
  }
}

/** Maps raw database rows to normalized NutritionLibraryItem format */
function mapNutritionLibraryRows(
  rows: Pick<NutritionLibraryRow, 'id' | 'bls_code' | 'name' | 'category' | 'calories' | 'protein' | 'carbs' | 'fat'>[] | null
): NutritionLibraryItem[] {
  if (!rows) return []
  
  return rows.map((item) => ({
    id: item.id,
    bls_code: item.bls_code,
    name: item.name,
    category: item.category,
    calories: item.calories ?? 0,
    protein: Number(item.protein) || 0,
    carbs: Number(item.carbs) || 0,
    fat: Number(item.fat) || 0,
  }))
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
