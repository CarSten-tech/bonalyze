/**
 * Analytics Types for Dashboard
 *
 * Type definitions for dashboard analytics data structures.
 */

import { BudgetStatus } from "@/components/dashboard/budget-widget"

/**
 * Category spending data
 */
export interface CategoryData {
  name: string
  amount: number // in cents
  percentage: number
  color: string
}

/**
 * Store/Merchant ranking data
 */
export interface StoreData {
  id: string
  name: string
  amount: number // in cents
  visitCount: number
  logoUrl?: string | null
}

/**
 * Period summary data
 */
export interface PeriodSummary {
  totalSpent: number // in cents
  receiptCount: number
  averagePerReceipt: number // in cents
}

/**
 * Comparison data between current and previous period
 */
export interface ComparisonData {
  previousPeriodLabel: string
  totalSpentChange: number | null // percentage change
  receiptCountChange: number | null // percentage change
}

/**
 * Complete dashboard analytics data
 */
/**
 * Complete dashboard analytics data
 */
export interface DashboardAnalytics {
  // Current period data
  current: PeriodSummary
  // Comparison with previous period
  comparison: ComparisonData
  // Category breakdown
  categories: CategoryData[]
  // Top stores ranking
  topStores: StoreData[]
  // Period information
  periodLabel: string
  // Budget status
  budgetStatus: BudgetStatus | null
}

/**
 * Analytics loading state
 */
export interface AnalyticsState {
  data: DashboardAnalytics | null
  isLoading: boolean
  error: string | null
}

/**
 * Category color mapping
 * Predefined colors for common categories
 */
export const CATEGORY_COLORS: Record<string, string> = {
  'Lebensmittel': '#22c55e', // green-500
  'Haushalt': '#3b82f6',     // blue-500
  'Getraenke': '#a855f7',    // purple-500
  'Hygiene': '#f97316',      // orange-500
  'Elektronik': '#06b6d4',   // cyan-500
  'Kleidung': '#ec4899',     // pink-500
  'Freizeit': '#eab308',     // yellow-500
  'Sonstiges': '#6b7280',    // gray-500
}

/**
 * Get color for a category
 */
export function getCategoryColor(category: string, index: number): string {
  if (CATEGORY_COLORS[category]) {
    return CATEGORY_COLORS[category]
  }
  // Fallback colors for unknown categories
  const fallbackColors = [
    '#8b5cf6', '#14b8a6', '#f43f5e', '#84cc16',
    '#0ea5e9', '#d946ef', '#f59e0b', '#64748b',
  ]
  return fallbackColors[index % fallbackColors.length]
}
