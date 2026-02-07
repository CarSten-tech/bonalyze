'use client'

import { Droplets, Plus } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface FluidCardProps {
  totalMl: number
  targetMl?: number
  isLoading?: boolean
  onAddFluid?: (ml: number) => Promise<void>
}

export function FluidCard({
  totalMl,
  targetMl = 2500,
  isLoading = false,
  onAddFluid,
}: FluidCardProps) {
  if (isLoading) {
    return (
      <Card className="rounded-xl shadow-sm border-0 bg-white h-full">
        <CardContent className="p-5 space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-1.5 w-full" />
        </CardContent>
      </Card>
    )
  }

  const liters = (totalMl / 1000).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  const targetLiters = (targetMl / 1000).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  const percentage = targetMl > 0 ? Math.min(Math.round((totalMl / targetMl) * 100), 100) : 0

  const handleAdd = async (ml: number) => {
    if (onAddFluid) await onAddFluid(ml)
  }

  return (
    <Card className="rounded-xl shadow-sm border-0 bg-white h-full">
      <CardContent className="p-5 flex flex-col justify-between h-full min-h-[140px]">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-50">
                <Droplets className="h-4 w-4 text-blue-500" />
              </div>
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                Fluessigkeit
              </span>
            </div>
            {onAddFluid && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleAdd(250)}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
              {liters}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              / {targetLiters} L
            </span>
          </div>
        </div>

        <div className="pt-3 space-y-2">
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>

          {onAddFluid && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs flex-1"
                onClick={() => handleAdd(250)}
              >
                +250ml
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs flex-1"
                onClick={() => handleAdd(500)}
              >
                +500ml
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
