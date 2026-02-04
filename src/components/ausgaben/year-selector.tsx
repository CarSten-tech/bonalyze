'use client'

import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

interface YearOption {
  year: number
  receiptCount: number
  totalAmountCents: number
}

interface YearSelectorProps {
  /** Currently selected year */
  selectedYear: number
  /** Available years with data */
  years: YearOption[]
  /** Callback when year changes */
  onYearChange: (year: number) => void
  /** Loading state */
  isLoading?: boolean
  /** Additional className */
  className?: string
}

/**
 * Year Selector Component
 *
 * Dropdown to select year for expense filtering.
 * Shows only years with available data.
 */
export function YearSelector({
  selectedYear,
  years,
  onYearChange,
  isLoading = false,
  className,
}: YearSelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'text-2xl font-bold gap-1 px-0 hover:bg-transparent',
            className
          )}
          disabled={isLoading}
        >
          {selectedYear}
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[120px]">
        {years.map((option) => (
          <DropdownMenuItem
            key={option.year}
            onClick={() => onYearChange(option.year)}
            className={cn(
              'text-lg font-medium',
              option.year === selectedYear && 'bg-slate-100'
            )}
          >
            {option.year}
          </DropdownMenuItem>
        ))}
        {years.length === 0 && (
          <DropdownMenuItem disabled>
            Keine Daten
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default YearSelector
