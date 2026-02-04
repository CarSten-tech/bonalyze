/**
 * Date Range Utilities for Dashboard Analytics
 *
 * Provides date range calculation for different period presets
 * and comparison period computation.
 */

import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  subWeeks,
  subMonths,
  subQuarters,
  subYears,
  subDays,
  differenceInDays,
  format,
  isValid,
  parseISO,
} from 'date-fns'
import { de } from 'date-fns/locale'

/**
 * Period presets for dashboard analytics
 */
export type PeriodPreset =
  | 'this_week'
  | 'this_month'
  | 'this_quarter'
  | 'this_year'
  | 'last_30_days'
  | 'last_60_days'
  | 'last_90_days'
  | 'custom'

/**
 * Date range with start and end dates as ISO strings
 */
export interface DateRange {
  startDate: string // ISO date string (YYYY-MM-DD)
  endDate: string   // ISO date string (YYYY-MM-DD)
}

/**
 * Extended date range with label for display
 */
export interface DateRangeWithLabel extends DateRange {
  label: string
}

/**
 * Dashboard period configuration
 */
export interface PeriodConfig {
  preset: PeriodPreset
  customRange?: DateRange
}

/**
 * Get the date range for a given period preset
 */
export function getDateRange(preset: PeriodPreset, customRange?: DateRange): DateRangeWithLabel {
  const now = new Date()
  let start: Date
  let end: Date
  let label: string

  switch (preset) {
    case 'this_week':
      start = startOfWeek(now, { weekStartsOn: 1 }) // Monday
      end = endOfWeek(now, { weekStartsOn: 1 })
      label = `KW ${format(now, 'w', { locale: de })}, ${format(now, 'yyyy')}`
      break

    case 'this_month':
      start = startOfMonth(now)
      end = endOfMonth(now)
      label = format(now, 'MMMM yyyy', { locale: de })
      break

    case 'this_quarter':
      start = startOfQuarter(now)
      end = endOfQuarter(now)
      label = `Q${Math.ceil((now.getMonth() + 1) / 3)} ${format(now, 'yyyy')}`
      break

    case 'this_year':
      start = startOfYear(now)
      end = endOfYear(now)
      label = format(now, 'yyyy')
      break

    case 'last_30_days':
      start = subDays(now, 30)
      end = now
      label = 'Letzte 30 Tage'
      break

    case 'last_60_days':
      start = subDays(now, 60)
      end = now
      label = 'Letzte 60 Tage'
      break

    case 'last_90_days':
      start = subDays(now, 90)
      end = now
      label = 'Letzte 90 Tage'
      break

    case 'custom':
      if (customRange) {
        start = parseISO(customRange.startDate)
        end = parseISO(customRange.endDate)
        if (!isValid(start) || !isValid(end)) {
          // Fallback to this month if invalid
          start = startOfMonth(now)
          end = endOfMonth(now)
          label = format(now, 'MMMM yyyy', { locale: de })
        } else {
          label = `${format(start, 'dd.MM.yyyy')} - ${format(end, 'dd.MM.yyyy')}`
        }
      } else {
        // Fallback to this month
        start = startOfMonth(now)
        end = endOfMonth(now)
        label = format(now, 'MMMM yyyy', { locale: de })
      }
      break

    default:
      start = startOfMonth(now)
      end = endOfMonth(now)
      label = format(now, 'MMMM yyyy', { locale: de })
  }

  return {
    startDate: format(start, 'yyyy-MM-dd'),
    endDate: format(end, 'yyyy-MM-dd'),
    label,
  }
}

/**
 * Get the comparison period (previous period of same duration)
 */
export function getComparisonPeriod(preset: PeriodPreset, customRange?: DateRange): DateRangeWithLabel {
  const now = new Date()
  let start: Date
  let end: Date
  let label: string

  switch (preset) {
    case 'this_week': {
      const prevWeek = subWeeks(now, 1)
      start = startOfWeek(prevWeek, { weekStartsOn: 1 })
      end = endOfWeek(prevWeek, { weekStartsOn: 1 })
      label = `KW ${format(prevWeek, 'w', { locale: de })}`
      break
    }

    case 'this_month': {
      const prevMonth = subMonths(now, 1)
      start = startOfMonth(prevMonth)
      end = endOfMonth(prevMonth)
      label = format(prevMonth, 'MMMM', { locale: de })
      break
    }

    case 'this_quarter': {
      const prevQuarter = subQuarters(now, 1)
      start = startOfQuarter(prevQuarter)
      end = endOfQuarter(prevQuarter)
      label = `Q${Math.ceil((prevQuarter.getMonth() + 1) / 3)} ${format(prevQuarter, 'yyyy')}`
      break
    }

    case 'this_year': {
      const prevYear = subYears(now, 1)
      start = startOfYear(prevYear)
      end = endOfYear(prevYear)
      label = format(prevYear, 'yyyy')
      break
    }

    case 'last_30_days': {
      start = subDays(now, 60)
      end = subDays(now, 31)
      label = 'Vorherige 30 Tage'
      break
    }

    case 'last_60_days': {
      start = subDays(now, 120)
      end = subDays(now, 61)
      label = 'Vorherige 60 Tage'
      break
    }

    case 'last_90_days': {
      start = subDays(now, 180)
      end = subDays(now, 91)
      label = 'Vorherige 90 Tage'
      break
    }

    case 'custom': {
      if (customRange) {
        const customStart = parseISO(customRange.startDate)
        const customEnd = parseISO(customRange.endDate)
        if (isValid(customStart) && isValid(customEnd)) {
          const daysDiff = differenceInDays(customEnd, customStart) + 1
          end = subDays(customStart, 1)
          start = subDays(end, daysDiff - 1)
          label = `${format(start, 'dd.MM.')} - ${format(end, 'dd.MM.')}`
        } else {
          // Fallback
          const prevMonth = subMonths(now, 1)
          start = startOfMonth(prevMonth)
          end = endOfMonth(prevMonth)
          label = format(prevMonth, 'MMMM', { locale: de })
        }
      } else {
        const prevMonth = subMonths(now, 1)
        start = startOfMonth(prevMonth)
        end = endOfMonth(prevMonth)
        label = format(prevMonth, 'MMMM', { locale: de })
      }
      break
    }

    default: {
      const prevMonth = subMonths(now, 1)
      start = startOfMonth(prevMonth)
      end = endOfMonth(prevMonth)
      label = format(prevMonth, 'MMMM', { locale: de })
    }
  }

  return {
    startDate: format(start, 'yyyy-MM-dd'),
    endDate: format(end, 'yyyy-MM-dd'),
    label,
  }
}

/**
 * Format a date range for display
 */
export function formatDateRange(startDate: string, endDate: string): string {
  const start = parseISO(startDate)
  const end = parseISO(endDate)

  if (!isValid(start) || !isValid(end)) {
    return ''
  }

  return `${format(start, 'dd.MM.yyyy')} - ${format(end, 'dd.MM.yyyy')}`
}

/**
 * Calculate percentage change between two values
 * Returns null if previous value is 0 (to avoid division by zero)
 */
export function calculatePercentageChange(current: number, previous: number): number | null {
  if (previous === 0) {
    if (current === 0) return 0
    return null // Cannot calculate percentage from 0
  }
  return ((current - previous) / previous) * 100
}

/**
 * Format percentage change for display
 */
export function formatPercentageChange(change: number | null): string {
  if (change === null) return 'N/A'
  const sign = change >= 0 ? '+' : ''
  return `${sign}${change.toFixed(1)}%`
}

/**
 * Get preset label for display
 */
export function getPeriodPresetLabel(preset: PeriodPreset): string {
  const labels: Record<PeriodPreset, string> = {
    this_week: 'Woche',
    this_month: 'Monat',
    this_quarter: 'Quartal',
    this_year: 'Jahr',
    last_30_days: '30 Tage',
    last_60_days: '60 Tage',
    last_90_days: '90 Tage',
    custom: 'Custom',
  }
  return labels[preset]
}

/**
 * Parse URL search params to get period configuration
 */
export function parsePeriodFromSearchParams(searchParams: URLSearchParams): PeriodConfig {
  const period = searchParams.get('period') as PeriodPreset | null
  const startDate = searchParams.get('start')
  const endDate = searchParams.get('end')

  if (period === 'custom' && startDate && endDate) {
    return {
      preset: 'custom',
      customRange: { startDate, endDate },
    }
  }

  if (period && ['this_week', 'this_month', 'this_quarter', 'this_year', 'last_30_days', 'last_60_days', 'last_90_days'].includes(period)) {
    return { preset: period }
  }

  // Default to this_month
  return { preset: 'this_month' }
}

/**
 * Build URL search params from period configuration
 */
export function buildPeriodSearchParams(config: PeriodConfig): string {
  const params = new URLSearchParams()
  params.set('period', config.preset)

  if (config.preset === 'custom' && config.customRange) {
    params.set('start', config.customRange.startDate)
    params.set('end', config.customRange.endDate)
  }

  return params.toString()
}
