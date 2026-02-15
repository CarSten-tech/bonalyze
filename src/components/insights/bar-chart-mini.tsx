'use client'

import { cn } from '@/lib/utils'

interface BarData {
  /** Label for the bar (e.g., "MO", "DI") */
  label: string
  /** Value as percentage (0-100) */
  value: number
  /** Whether this bar is highlighted */
  isHighlighted?: boolean
}

interface BarChartMiniProps {
  /** Array of bar data */
  data: BarData[]
  /** Additional className */
  className?: string
}

/**
 * Mini Bar Chart Component
 *
 * A simple horizontal bar chart for displaying day-of-week data
 * like "Günstigste Einkaufstage" in the Smart Insights page.
 *
 * Design: Per mockup - vertical bars with labels below
 */
export function BarChartMini({ data, className }: BarChartMiniProps) {
  // Find the max value to scale bars proportionally
  const maxValue = Math.max(...data.map((d) => d.value), 1)

  return (
    <div className={cn('flex items-end justify-between gap-2 h-16', className)}>
      {data.map((bar) => {
        const heightPercent = (bar.value / maxValue) * 100

        return (
          <div key={bar.label} className="flex flex-col items-center gap-1 flex-1">
            {/* Bar */}
            <div
              className={cn(
                'w-full max-w-[24px] rounded-t transition-all duration-300',
                bar.isHighlighted
                  ? 'bg-primary'
                  : 'bg-muted'
              )}
              style={{ height: `${Math.max(heightPercent, 8)}%` }}
            />
            {/* Label */}
            <span
              className={cn(
                'text-[10px] font-medium uppercase',
                bar.isHighlighted
                  ? 'text-foreground'
                  : 'text-muted-foreground'
              )}
            >
              {bar.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default BarChartMini
