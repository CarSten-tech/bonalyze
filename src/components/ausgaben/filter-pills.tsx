'use client'

import { cn } from '@/lib/utils'

export type FilterType = 'alle' | 'eigen' | 'auslage' | 'zweck'

interface FilterPillsProps {
  /** Currently active filter */
  activeFilter: FilterType
  /** Callback when filter changes */
  onFilterChange: (filter: FilterType) => void
  /** Additional className */
  className?: string
}

const filters: { value: FilterType; label: string }[] = [
  { value: 'alle', label: 'Alle' },
  { value: 'eigen', label: 'Eigen' },
  { value: 'auslage', label: 'Auslage' },
  { value: 'zweck', label: 'Zweck' },
]

/**
 * Filter Pills Component
 *
 * Horizontal filter tabs for payment type filtering.
 * - Alle: All expenses
 * - Eigen: Self-paid
 * - Auslage: Paid for others
 * - Zweck: Special purpose
 */
export function FilterPills({
  activeFilter,
  onFilterChange,
  className,
}: FilterPillsProps) {
  return (
    <div className={cn('flex gap-2', className)}>
      {filters.map((filter) => {
        const isActive = activeFilter === filter.value

        return (
          <button
            key={filter.value}
            type="button"
            onClick={() => onFilterChange(filter.value)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium transition-colors',
              'min-h-touch',
              isActive
                ? 'bg-foreground text-background'
                : 'bg-muted text-muted-foreground hover:bg-muted'
            )}
          >
            {filter.label}
          </button>
        )
      })}
    </div>
  )
}

export default FilterPills
