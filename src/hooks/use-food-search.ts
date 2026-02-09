'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { searchFoods, type FoodSearchResult } from '@/lib/open-food-facts'
import { searchNutritionLibrary, type NutritionLibraryItem } from '@/app/actions/nutrition'

// ============================================================================
// Types
// ============================================================================

export interface UnifiedFoodResult {
  id: string
  name: string
  brand: string
  calories: number
  protein: number
  carbs: number
  fat: number
  servingSize: string
  source: 'local' | 'openfoodfacts'
  category?: string | null
}

type SearchState = 'idle' | 'searching' | 'success' | 'error'

interface SearchStateData {
  state: SearchState
  results: UnifiedFoodResult[]
  error: string | null
  totalCount: number
  hasMore: boolean
}

// ============================================================================
// Constants
// ============================================================================

const DEBOUNCE_MS = 300
const MIN_QUERY_LENGTH = 2
const PAGE_SIZE = 20

// ============================================================================
// Cache (module-level singleton)
// ============================================================================

const searchCache = new Map<string, { results: UnifiedFoodResult[], totalCount: number }>()
const MAX_CACHE_SIZE = 50

function getCacheKey(query: string): string {
  return query.toLowerCase().trim()
}

function getFromCache(query: string): { results: UnifiedFoodResult[], totalCount: number } | undefined {
  return searchCache.get(getCacheKey(query))
}

function setCache(query: string, data: { results: UnifiedFoodResult[], totalCount: number }): void {
  const key = getCacheKey(query)
  
  // LRU eviction
  if (searchCache.size >= MAX_CACHE_SIZE) {
    const firstKey = searchCache.keys().next().value
    if (firstKey) searchCache.delete(firstKey)
  }
  
  searchCache.set(key, data)
}

// ============================================================================
// Mappers & Sorters
// ============================================================================

function mapBLSToUnified(items: NutritionLibraryItem[]): UnifiedFoodResult[] {
  return items.map((item) => ({
    id: `bls-${item.id}`,
    name: item.name,
    brand: 'BLS',
    calories: item.calories,
    protein: item.protein,
    carbs: item.carbs,
    fat: item.fat,
    servingSize: '100g',
    source: 'local' as const,
    category: item.category,
  }))
}

function mapOFFToUnified(items: FoodSearchResult[]): UnifiedFoodResult[] {
  return items.map((item) => ({
    id: `off-${item.id}`,
    name: item.name,
    brand: item.brand || 'Open Food Facts',
    calories: item.calories,
    protein: item.protein,
    carbs: item.carbs,
    fat: item.fat,
    servingSize: item.servingSize || '100g',
    source: 'openfoodfacts' as const,
  }))
}

/**
 * Smart Sorting:
 * 1. Prioritize exact matches (case-insensitive)
 * 2. Prioritize shorter names (ingredients like "Haferflocken" vs "Haferflockensuppe")
 * 3. Alphabetical order
 */
function smartSort(items: UnifiedFoodResult[], query: string): UnifiedFoodResult[] {
  const lowerQuery = query.toLowerCase()
  
  return [...items].sort((a, b) => {
    const nameA = a.name.toLowerCase()
    const nameB = b.name.toLowerCase()

    // 1. Exact match priority
    if (nameA === lowerQuery && nameB !== lowerQuery) return -1
    if (nameB === lowerQuery && nameA !== lowerQuery) return 1

    // 2. Length priority (shorter is likely base ingredient)
    // Only apply if length diff is significant or prevents "Haferflocken" vs "Haferflocken Bio" issues
    // Actually, simply sorting by length first is robust for the user requirement
    if (nameA.length !== nameB.length) {
      return nameA.length - nameB.length
    }

    // 3. Alphabetical
    return nameA.localeCompare(nameB)
  })
}

// ============================================================================
// Hook
// ============================================================================

export function useFoodSearch() {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0) // 0-based index for RPC
  const [searchState, setSearchState] = useState<SearchStateData>({
    state: 'idle',
    results: [],
    error: null,
    totalCount: 0,
    hasMore: false,
  })

  // Refs for request management
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentRequestIdRef = useRef<number>(0)
  const abortControllerRef = useRef<AbortController | null>(null)
  const isLoadingMoreRef = useRef(false)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      if (abortControllerRef.current) abortControllerRef.current.abort()
    }
  }, [])

  const search = useCallback((term: string) => {
    setQuery(term)
    setPage(0) // Reset to page 0

    // Clear pending debounce & cancel in-flight
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    if (abortControllerRef.current) abortControllerRef.current.abort()

    // Reset for empty/short queries
    if (!term || term.length < MIN_QUERY_LENGTH) {
      setSearchState({ 
        state: 'idle', 
        results: [], 
        error: null, 
        totalCount: 0,
        hasMore: false 
      })
      return
    }

    // Check cache first (instant response)
    const cached = getFromCache(term)
    if (cached) {
      setSearchState({ 
        state: 'success', 
        results: smartSort(cached.results, term), 
        error: null, 
        totalCount: cached.totalCount,
        hasMore: cached.results.length < cached.totalCount // Approximate
      })
      return
    }

    // Start searching
    setSearchState(prev => ({ ...prev, state: 'searching', results: [], totalCount: 0 }))

    debounceTimerRef.current = setTimeout(async () => {
      const requestId = ++currentRequestIdRef.current
      abortControllerRef.current = new AbortController()

      try {
        // RPC Search (Server Action)
        const blsData = await searchNutritionLibrary(term, 0, PAGE_SIZE)
          .catch((err) => {
            console.error('Search failed', err)
            return { items: [], count: 0 }
          })

        // Check if request is still current
        if (requestId !== currentRequestIdRef.current) return

        const blsUnified = mapBLSToUnified(blsData.items)
        const sortedResults = smartSort(blsUnified, term)

        // Determine hasMore based on whether we received a full page
        // If items.length < PAGE_SIZE, we know it's the end.
        // If items.length === PAGE_SIZE, we assume there *might* be more.
        const hasMoreMatches = blsUnified.length >= PAGE_SIZE

        setSearchState({
          state: 'success',
          results: sortedResults,
          error: null,
          totalCount: blsData.count, // This might be fake 9999 or real if we fix backend later
          hasMore: hasMoreMatches
        })

        // Cache result
        setCache(term, { results: sortedResults, totalCount: blsData.count })

      } catch (err) {
        if (requestId !== currentRequestIdRef.current) return
        console.error('[useFoodSearch] Search error:', err)
        setSearchState({
          state: 'error',
          results: [],
          error: 'Suche fehlgeschlagen',
          totalCount: 0,
          hasMore: false,
        })
      }
    }, DEBOUNCE_MS)
  }, [])

  const loadMore = useCallback(async () => {
    if (isLoadingMoreRef.current || !searchState.hasMore) return
    
    isLoadingMoreRef.current = true
    const nextPage = page + 1
    
    try {
      const blsData = await searchNutritionLibrary(query, nextPage, PAGE_SIZE)
        .catch(() => ({ items: [], count: 0 }))
      
      if (blsData.items.length > 0) {
        setPage(nextPage)
        const newUnified = mapBLSToUnified(blsData.items)
        const hasMoreMatches = newUnified.length >= PAGE_SIZE
        
        setSearchState(prev => {
          // Append new results
          const newResults = [...prev.results, ...newUnified]
          // Re-sort the whole list? Or just append? 
          // Smart sort might be weird if applied to the whole list again if it reorders wildly. 
          // But strict RPC order should be respected usually. 
          // Let's just append for performance and stability, assuming RPC sorts by relevance.
          // BUT: We applied smartSort on the first page. We should probably apply smartSort to unique defaults only?
          // Actually, RPC returns sorted results. We should probably trust RPC if it's "search_food".
          // But client-side smart sort handles "exact match" nicely. 
          // Let's re-sort the combined list to be safe.
          const sortedCombined = smartSort(newResults, query)

          return {
            ...prev,
            results: sortedCombined,
            hasMore: hasMoreMatches
          }
        })
      } else {
        setSearchState(prev => ({ ...prev, hasMore: false }))
      }
    } catch (err) {
      console.error('Load more error:', err)
    } finally {
      isLoadingMoreRef.current = false
    }
  }, [page, query, searchState.hasMore])

  const clearSearch = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    if (abortControllerRef.current) abortControllerRef.current.abort()
    
    setQuery('')
    setPage(0)
    setSearchState({ state: 'idle', results: [], error: null, totalCount: 0, hasMore: false })
  }, [])

  return {
    query,
    results: searchState.results,
    isSearching: searchState.state === 'searching',
    error: searchState.error,
    totalCount: searchState.totalCount,
    hasMore: searchState.hasMore,
    search,
    loadMore,
    clearSearch,
  }
}
