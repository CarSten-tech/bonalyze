"use client"

import { cn } from "@/lib/utils"
import {
  format,
  isToday,
  isYesterday,
  isThisWeek,
  isThisYear,
  parseISO,
} from "date-fns"
import { de } from "date-fns/locale"

/**
 * RelativeDate Component
 *
 * Per DESIGN-UX-BLUEPRINT.md Section 3 (Data Display Conventions):
 *
 * Dates:
 * - Heute, 14:32         ← Today
 * - Gestern              ← Yesterday
 * - Mo, 28. Januar       ← This week
 * - 28. Januar 2025      ← Older dates
 * - Januar 2025          ← Month headers
 */

interface RelativeDateProps {
  /** Date as ISO string or Date object */
  date: string | Date
  /** Show time for today's dates */
  showTime?: boolean
  /** Format variant */
  variant?: "default" | "short" | "month" | "full"
  /** Additional className */
  className?: string
}

export function RelativeDate({
  date,
  showTime = true,
  variant = "default",
  className,
}: RelativeDateProps) {
  const dateObj = typeof date === "string" ? parseISO(date) : date

  const formattedDate = formatRelativeDate(dateObj, { showTime, variant })

  return <span className={cn("text-muted-foreground", className)}>{formattedDate}</span>
}

/**
 * Utility function to format dates in German relative style
 */
export function formatRelativeDate(
  date: Date,
  options?: {
    showTime?: boolean
    variant?: "default" | "short" | "month" | "full"
  }
): string {
  const { showTime = true, variant = "default" } = options || {}

  // Month header format
  if (variant === "month") {
    return format(date, "MMMM yyyy", { locale: de })
  }

  // Full date format
  if (variant === "full") {
    return format(date, "EEEE, d. MMMM yyyy", { locale: de })
  }

  // Short format (just date, no relative)
  if (variant === "short") {
    if (isThisYear(date)) {
      return format(date, "d. MMM", { locale: de })
    }
    return format(date, "d. MMM yyyy", { locale: de })
  }

  // Default relative format
  if (isToday(date)) {
    return showTime ? `Heute, ${format(date, "HH:mm")}` : "Heute"
  }

  if (isYesterday(date)) {
    return "Gestern"
  }

  if (isThisWeek(date, { locale: de })) {
    return format(date, "EEE, d. MMMM", { locale: de })
  }

  if (isThisYear(date)) {
    return format(date, "d. MMMM", { locale: de })
  }

  return format(date, "d. MMMM yyyy", { locale: de })
}

/**
 * Format a date range for display (e.g., settlement periods)
 */
export function formatDateRange(startDate: Date, endDate: Date): string {
  const sameMonth =
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getFullYear() === endDate.getFullYear()

  if (sameMonth) {
    return format(startDate, "MMMM yyyy", { locale: de })
  }

  const sameYear = startDate.getFullYear() === endDate.getFullYear()

  if (sameYear) {
    return `${format(startDate, "MMM", { locale: de })} - ${format(endDate, "MMM yyyy", { locale: de })}`
  }

  return `${format(startDate, "MMM yyyy", { locale: de })} - ${format(endDate, "MMM yyyy", { locale: de })}`
}

/**
 * Get localized month names for dropdowns
 */
export function getMonthOptions(
  count: number = 12
): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> = []
  const now = new Date()

  for (let i = 0; i < count; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    options.push({
      value: format(date, "yyyy-MM"),
      label: format(date, "MMMM yyyy", { locale: de }),
    })
  }

  return options
}

/**
 * DateDisplay for receipt items showing purchase date
 */
interface DateDisplayProps {
  date: string | Date
  className?: string
}

export function DateDisplay({ date, className }: DateDisplayProps) {
  const dateObj = typeof date === "string" ? parseISO(date) : date

  return (
    <time
      dateTime={dateObj.toISOString()}
      className={cn("text-sm text-muted-foreground", className)}
    >
      {formatRelativeDate(dateObj)}
    </time>
  )
}

export default RelativeDate
