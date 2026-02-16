import { useState, useCallback } from 'react'
import type { ShoppingListItem } from '@/types/shopping'

export function useItemDuplicateCheck(currentItems: ShoppingListItem[]) {
  const [duplicateWarning, setDuplicateWarning] = useState<{
    originalName: string,
    matchName: string,
    onConfirm: () => void,
    onCancel: () => void
  } | null>(null)

  const checkDuplicate = useCallback((name: string, onProceed: () => void) => {
    // 1. Normalize name (lowercase, trim)
    const normalized = name.toLowerCase().trim()
    
    // 2. Find fuzzy matches
    const match = currentItems.find(item => {
      const itemNorm = item.product_name.toLowerCase().trim()
      
      // Exact match
      if (itemNorm === normalized) return true
      
      // Substring match (e.g. "Duplo" in "Ferrero Duplo")
      if (itemNorm.includes(normalized) || normalized.includes(itemNorm)) return true
      
      return false
    })

    if (match) {
      // 3. Set warning state
      setDuplicateWarning({
        originalName: name,
        matchName: match.product_name,
        onConfirm: () => {
          setDuplicateWarning(null)
          onProceed()
        },
        onCancel: () => {
          setDuplicateWarning(null)
        }
      })
    } else {
      // No duplicate, proceed immediately
      onProceed()
    }
  }, [currentItems])

  return { duplicateWarning, checkDuplicate }
}
