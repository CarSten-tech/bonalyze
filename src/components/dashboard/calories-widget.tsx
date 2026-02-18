'use client'

import { useRouter } from 'next/navigation'
import { Zap } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useNutritionData } from '@/hooks/use-nutrition-data'

function CircularProgress({
  percentage,
  size = 80,
  strokeWidth = 8,
}: {
  percentage: number
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

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="hsl(220, 13%, 15%)"
          strokeWidth={strokeWidth}
        />
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
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs font-bold text-foreground tracking-tight">
          {Math.round(percentage)}%
        </span>
      </div>
    </div>
  )
}

export function CaloriesWidget() {
  const router = useRouter()
  const today = new Date()
  const { data, isLoading } = useNutritionData(today)

  if (isLoading) {
    return (
      <Card className="rounded-xl shadow-sm border-0 bg-card">
        <CardContent className="p-5 flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-32" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const consumed = data?.consumption.calories || 0
  const target = data?.targets.calories || 2000
  const percentage = target > 0 ? (consumed / target) * 100 : 0
  const remaining = Math.max(0, target - consumed)

  return (
    <Card
      onClick={() => router.push('/dashboard/ernaehrung')}
      className="rounded-xl shadow-sm border-0 bg-card cursor-pointer hover:shadow-md transition-all active:scale-[0.99]"
    >
      <CardContent className="p-5">
        <div className="flex items-center gap-5">
          <CircularProgress 
            percentage={percentage} 
          />
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider font-bold text-[10px]">
              <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span>Kalorien heute</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-foreground tabular-nums">
                {consumed.toLocaleString('de-DE')}
              </span>
              <span className="text-sm font-bold text-muted-foreground">/ {target.toLocaleString('de-DE')}</span>
            </div>
            <p className="text-[11px] text-muted-foreground font-medium">
              {remaining > 0 
                ? `${remaining.toLocaleString('de-DE')} kcal übrig` 
                : 'Tagesziel erreicht! 🚀'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
