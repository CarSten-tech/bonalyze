'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { searchNutritionLibrary, type FoodItem } from '@/app/actions/nutrition'

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

function mapFoodItemToUnified(items: FoodItem[]): UnifiedFoodResult[] {
  return items.map((item) => ({
    id: item.source === 'bls' ? `bls-${item.id}` : item.id,
    name: item.name,
    brand: item.brand || (item.source === 'bls' ? 'BLS' : 'Open Food Facts'),
    calories: item.calories,
    protein: item.protein,
    carbs: item.carbs,
    fat: item.fat,
    servingSize: '100g',
    source: item.source === 'bls' ? 'local' as const : 'openfoodfacts' as const,
    category: item.category,
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
        // Optimized Search (Server Action) - now includes BLS + OFF
        const result = await searchNutritionLibrary(term, 0)
        
        if (!result.success || requestId !== currentRequestIdRef.current) return

        const unifiedResults = mapFoodItemToUnified(result.data)
        const sortedResults = smartSort(unifiedResults, term)

        // Determine hasMore: if we got >= PAGE_SIZE results, there might be more on page 1
        const hasMoreMatches = unifiedResults.length >= PAGE_SIZE

        setSearchState({
          state: 'success',
          results: sortedResults,
          error: null,
          totalCount: unifiedResults.length, // approximation
          hasMore: hasMoreMatches
        })

        // Cache result
        setCache(term, { results: sortedResults, totalCount: unifiedResults.length })

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
      const result = await searchNutritionLibrary(query, nextPage)
      
      if (result.success && result.data.length > 0) {
        setPage(nextPage)
        const newUnified = mapFoodItemToUnified(result.data)
        const hasMoreMatches = newUnified.length >= PAGE_SIZE
        
        setSearchState(prev => {
          const newResults = [...prev.results, ...newUnified]
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
