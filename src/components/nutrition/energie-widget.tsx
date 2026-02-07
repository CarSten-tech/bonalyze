'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface EnergieWidgetProps {
  consumed: number
  target: number
  protein: { current: number; target: number }
  carbs: { current: number; target: number }
  fat: { current: number; target: number }
  isLoading?: boolean
}

// SVG Circular Progress Ring
function CircularProgress({
  percentage,
  remaining,
  size = 160,
  strokeWidth = 12,
}: {
  percentage: number
  remaining: number
  size?: number
  strokeWidth?: number
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clampedPercent = Math.min(percentage, 100)
  const offset = circumference - (clampedPercent / 100) * circumference
  const center = size / 2

  // Color based on percentage consumed
  let strokeColor = 'hsl(174, 42%, 40%)' // primary teal
  if (percentage > 100) strokeColor = 'hsl(0, 55%, 50%)' // destructive red
  else if (percentage > 85) strokeColor = 'hsl(38, 92%, 50%)' // warning amber

  const formattedRemaining = remaining.toLocaleString('de-DE')

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="hsl(220, 13%, 95%)"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums tracking-tight text-foreground">
          {formattedRemaining}
        </span>
        <span className="text-xs text-muted-foreground font-medium">
          kcal uebrig
        </span>
      </div>
    </div>
  )
}

// Macro progress bar
function MacroBar({
  label,
  current,
  target,
  color,
}: {
  label: string
  current: number
  target: number
  color: string
}) {
  const percentage = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          {label}
        </span>
        <span className="text-xs font-medium text-gray-600 tabular-nums">
          {current}g
        </span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

export function EnergieWidget({
  consumed,
  target,
  protein,
  carbs,
  fat,
  isLoading = false,
}: EnergieWidgetProps) {
  if (isLoading) {
    return (
      <Card className="rounded-xl shadow-sm border-0 bg-white">
        <CardContent className="p-5 space-y-4">
          <Skeleton className="h-3 w-20" />
          <div className="flex justify-center">
            <Skeleton className="h-40 w-40 rounded-full" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const remaining = Math.max(0, target - consumed)
  const percentage = target > 0 ? Math.round((consumed / target) * 100) : 0

  return (
    <Card className="rounded-xl shadow-sm border-0 bg-white">
      <CardContent className="p-5 space-y-5">
        {/* Header */}
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
          Energie
        </p>

        {/* Circular Progress */}
        <div className="flex justify-center">
          <CircularProgress percentage={percentage} remaining={remaining} />
        </div>

        {/* Macros */}
        <div className="space-y-3">
          <MacroBar
            label="Kohlenh."
            current={carbs.current}
            target={carbs.target}
            color="bg-amber-500"
          />
          <MacroBar
            label="Eiweiss"
            current={protein.current}
            target={protein.target}
            color="bg-primary"
          />
          <MacroBar
            label="Fett"
            current={fat.current}
            target={fat.target}
            color="bg-rose-400"
          />
        </div>
      </CardContent>
    </Card>
  )
}
