'use client'

import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { format, addMonths, subMonths } from 'date-fns'
import { de } from 'date-fns/locale'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface MonthNavigationProps {
  /** Currently selected date (any day in the month) */
  currentDate: Date
  /** Callback when month changes */
  onMonthChange: (newDate: Date) => void
  /** Minimum date (can't navigate before this) */
  minDate?: Date
  /** Maximum date (can't navigate after this, defaults to current month) */
  maxDate?: Date
  /** Additional className */
  className?: string
}

/**
 * Month Navigation Component
 *
 * Per UI-PATTERNS-REFERENCE.md Section 2:
 * - Centered text with calendar icon
 * - Arrow buttons left/right
 * - Rounded container (rounded-xl)
 * - Background: card (white)
 * - Border: subtle gray
 */
export function MonthNavigation({
  currentDate,
  onMonthChange,
  minDate,
  maxDate = new Date(),
  className,
}: MonthNavigationProps) {
  const handlePreviousMonth = () => {
    const newDate = subMonths(currentDate, 1)
    if (!minDate || newDate >= minDate) {
      onMonthChange(newDate)
    }
  }

  const handleNextMonth = () => {
    const newDate = addMonths(currentDate, 1)
    // Check if next month would be after maxDate
    const maxMonth = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1)
    const newMonth = new Date(newDate.getFullYear(), newDate.getMonth(), 1)
    if (newMonth <= maxMonth) {
      onMonthChange(newDate)
    }
  }

  // Check if navigation buttons should be disabled
  const isPrevDisabled = minDate
    ? new Date(currentDate.getFullYear(), currentDate.getMonth(), 1) <=
      new Date(minDate.getFullYear(), minDate.getMonth(), 1)
    : false

  const isNextDisabled = (() => {
    const maxMonth = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1)
    const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    return currentMonth >= maxMonth
  })()

  // Format the month and year in German
  const formattedMonth = format(currentDate, 'MMMM yyyy', { locale: de })
  // Capitalize first letter
  const displayMonth = formattedMonth.charAt(0).toUpperCase() + formattedMonth.slice(1)

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 p-2 bg-card border border-border rounded-xl',
        className
      )}
    >
      {/* Previous Month Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handlePreviousMonth}
        disabled={isPrevDisabled}
        className="h-10 w-10 shrink-0"
        aria-label="Vorheriger Monat"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      {/* Current Month Display */}
      <div className="flex items-center gap-2 text-base font-medium">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span>{displayMonth}</span>
      </div>

      {/* Next Month Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleNextMonth}
        disabled={isNextDisabled}
        className="h-10 w-10 shrink-0"
        aria-label="Naechster Monat"
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  )
}

export default MonthNavigation
