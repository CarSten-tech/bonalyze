'use client'

import { useState, useRef, useCallback } from 'react'
import { searchFoods, type FoodSearchResult } from '@/lib/open-food-facts'

export function useFoodSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FoodSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cacheRef = useRef<Map<string, FoodSearchResult[]>>(new Map())

  const search = useCallback((term: string) => {
    setQuery(term)

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    if (!term || term.length < 2) {
      setResults([])
      setIsSearching(false)
      return
    }

    const cached = cacheRef.current.get(term.toLowerCase())
    if (cached) {
      setResults(cached)
      return
    }

    setIsSearching(true)

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const data = await searchFoods(term)
        cacheRef.current.set(term.toLowerCase(), data)
        setResults(data)
        setError(null)
      } catch (err) {
        console.error('Food search error:', err)
        setError('Suche fehlgeschlagen')
        setResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)
  }, [])

  const clearSearch = useCallback(() => {
    setQuery('')
    setResults([])
    setError(null)
  }, [])

  return { query, results, isSearching, error, search, clearSearch }
}
