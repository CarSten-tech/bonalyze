'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

// Helper to render value with small currency symbol
const MetricValue = ({ value, className, currencyClassName }: { value: string; className?: string, currencyClassName?: string }) => {
  // Simple heuristic: if value ends with EUR or €, split it
  const match = value.match(/^(.+?)\s*(EUR|€)$/)
  
  if (match) {
    const [_, number, currency] = match
    return (
      <div className={cn("flex items-baseline gap-1", className)}>
        <span className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
          {number}
        </span>
        <span className={cn("text-sm font-medium text-foreground", currencyClassName)}>
          EUR
        </span>
      </div>
    )
  }

  // Fallback for non-currency values (e.g. "45 Stk.")
  return (
    <div className={cn("text-3xl font-bold tabular-nums tracking-tight text-foreground", className)}>
      {value}
    </div>
  )
}

interface MiniKPICardProps {
  label: string
  value: string
  progress?: number
  dots?: {
    filled: number
    total: number
  }
  isLoading?: boolean
  className?: string
}

export function MiniKPICard({
  label,
  value,
  progress,
  dots,
  isLoading = false,
  className,
}: MiniKPICardProps) {
  if (isLoading) {
    return (
      <Card className={cn('rounded-xl shadow-sm border-0', className)}>
        <CardContent className="p-5 space-y-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-2 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('rounded-xl shadow-sm border-0 bg-white h-full', className)}>
      <CardContent className="p-5 flex flex-col justify-between h-full min-h-[140px]">
        <div className="space-y-2">
          {/* Header */}
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
            {label}
          </p>

          {/* Body */}
          <MetricValue value={value} />
        </div>

        {/* Footer: Progress or Dots */}
        <div className="pt-4">
          {progress !== undefined && (
            <Progress
              value={Math.min(progress, 100)}
              className="h-1.5 bg-slate-100 [&>div]:bg-primary"
            />
          )}

          {dots && (
            <div className="flex gap-1.5">
              {Array.from({ length: dots.total }).map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    'w-2.5 h-2.5 rounded-full transition-colors',
                    i < dots.filled ? 'bg-primary' : 'bg-slate-200'
                  )}
                />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface HeroKPICardProps {
  label: string
  value: string
  trend?: number | null
  trendLabel?: string
  icon?: React.ReactNode
  isLoading?: boolean
  className?: string
}

export function HeroKPICard({
  label,
  value,
  trend,
  trendLabel = 'vs. Vormonat',
  icon,
  isLoading = false,
  className,
}: HeroKPICardProps) {
  if (isLoading) {
    return (
      <Card className={cn('rounded-xl shadow-sm border-0', className)}>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start justify-between">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-4 w-24" />
        </CardContent>
      </Card>
    )
  }

  // Determine trend styling
  const isDown = trend !== null && trend !== undefined && trend < 0
  const isUp = trend !== null && trend !== undefined && trend > 0

  // For spending: down (negative) = good (green), up (positive) = bad (red) - wait, context matters.
  // Assuming "Total Spending": Lower is usually better for budget.
  const trendColor = isDown
    ? 'text-emerald-600 bg-emerald-50'
    : isUp
    ? 'text-rose-600 bg-rose-50'
    : 'text-gray-500 bg-gray-50'

  const trendArrow = isDown ? '↘' : isUp ? '↗' : '→'
  const trendSign = isUp ? '+' : ''

  return (
    <Card className={cn('rounded-xl shadow-sm border-0 bg-gradient-to-br from-white via-white to-slate-50', className)}>
      <CardContent className="p-8">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <p className="text-sm text-muted-foreground font-semibold uppercase tracking-wider">
              {label}
            </p>
            {icon && (
              <div className="p-2.5 rounded-xl bg-slate-100/50 text-slate-500">
                {React.isValidElement(icon) ? React.cloneElement(icon, { className: "w-6 h-6" } as any) : icon}
              </div>
            )}
          </div>

          {/* Main Value */}
          <div>
            <MetricValue 
              value={value} 
              className="text-5xl sm:text-6xl font-bold tracking-tighter text-foreground"
              currencyClassName="text-2xl sm:text-3xl font-medium text-muted-foreground ml-2"
            />
          </div>

          {/* Footer / Trend */}
          {trend !== null && trend !== undefined && (
            <div className="flex items-center gap-3">
              <span className={cn('px-2.5 py-1 rounded-full text-sm font-bold flex items-center gap-1.5', trendColor)}>
                {trendArrow} {trendSign}{Math.abs(trend).toFixed(0)}%
              </span>
              <span className="text-sm text-muted-foreground font-medium">{trendLabel}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default MiniKPICard
