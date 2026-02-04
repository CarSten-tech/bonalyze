'use client'

import { TrendingUp, TrendingDown, Minus, ShoppingCart } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/components/common/currency'
import { cn } from '@/lib/utils'

interface AnalyticsKPICardProps {
  /** Total amount spent in cents */
  totalSpent: number
  /** Number of receipts/purchases */
  receiptCount: number
  /** Label for the current period (e.g., "Januar 2025") */
  periodLabel: string
  /** Percentage change vs previous period (null if N/A) */
  percentageChange: number | null
  /** Label for the comparison period (e.g., "Dezember") */
  comparisonLabel: string
  /** Loading state */
  isLoading?: boolean
}

/**
 * Main KPI Card for Dashboard
 *
 * Shows:
 * - Total spending amount (large, prominent)
 * - Period label
 * - Trend indicator (percentage vs previous period)
 * - Number of purchases
 */
export function AnalyticsKPICard({
  totalSpent,
  receiptCount,
  periodLabel,
  percentageChange,
  comparisonLabel,
  isLoading = false,
}: AnalyticsKPICardProps) {
  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6 text-center space-y-4">
          <Skeleton className="h-4 w-32 mx-auto" />
          <Skeleton className="h-12 w-48 mx-auto" />
          <Skeleton className="h-4 w-40 mx-auto" />
          <div className="flex justify-center gap-4">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-24" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Determine trend direction and styling
  const isUp = percentageChange !== null && percentageChange > 0
  const isDown = percentageChange !== null && percentageChange < 0
  const isNeutral = percentageChange === null || percentageChange === 0

  // For spending: up = bad (red), down = good (green)
  const trendColor = isUp
    ? 'text-destructive'
    : isDown
    ? 'text-green-600 dark:text-green-400'
    : 'text-muted-foreground'

  const TrendIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus

  const formatChange = (change: number | null): string => {
    if (change === null) return 'Keine Vorperiode'
    const sign = change >= 0 ? '+' : ''
    return `${sign}${change.toFixed(1)}%`
  }

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardContent className="p-6 text-center space-y-3">
        {/* Period Label */}
        <p className="text-sm text-muted-foreground">
          Ausgaben im {periodLabel}
        </p>

        {/* Main Amount */}
        <p className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
          {formatCurrency(totalSpent, { inCents: true })}
        </p>

        {/* Trend Indicator */}
        <div className={cn('flex items-center justify-center gap-1', trendColor)}>
          <TrendIcon className="h-4 w-4" />
          <span className="text-sm font-medium">
            {formatChange(percentageChange)}
          </span>
          <span className="text-sm text-muted-foreground">
            vs. {comparisonLabel}
          </span>
        </div>

        {/* Receipt Count */}
        <div className="flex items-center justify-center gap-2 text-muted-foreground pt-2">
          <ShoppingCart className="h-4 w-4" />
          <span className="text-sm">
            {receiptCount} {receiptCount === 1 ? 'Einkauf' : 'Einkäufe'}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Compact KPI Stats Row
 * Shows additional KPIs in a horizontal layout
 */
interface KPIStatProps {
  label: string
  value: string
  sublabel?: string
  isLoading?: boolean
}

export function KPIStat({ label, value, sublabel, isLoading = false }: KPIStatProps) {
  if (isLoading) {
    return (
      <div className="text-center space-y-1">
        <Skeleton className="h-3 w-16 mx-auto" />
        <Skeleton className="h-6 w-20 mx-auto" />
        {sublabel && <Skeleton className="h-3 w-12 mx-auto" />}
      </div>
    )
  }

  return (
    <div className="text-center space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
      {sublabel && (
        <p className="text-xs text-muted-foreground">{sublabel}</p>
      )}
    </div>
  )
}
