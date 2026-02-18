'use client'

import { useRouter } from 'next/navigation'
import { Package } from 'lucide-react'
import Link from 'next/link'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useSupplyRange } from '@/hooks/use-supply-range'
import { cn } from '@/lib/utils'

export function SupplyRangeWidget() {
  const router = useRouter()
  const { data, isLoading } = useSupplyRange()

  if (isLoading) {
    return (
      <Card className="rounded-xl shadow-sm border-0 bg-card">
        <CardContent className="p-5 space-y-3">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-1.5 w-full" />
        </CardContent>
      </Card>
    )
  }

  // No profiles configured
  if (!data || !data.hasProfiles) {
    return (
      <Card className="rounded-xl shadow-sm border-0 bg-card relative overflow-hidden group">
        <CardContent className="p-5 flex flex-col justify-center items-center h-full text-center space-y-3 min-h-[140px]">
          <div className="bg-muted p-3 rounded-full group-hover:bg-muted/80 transition-colors">
            <Package className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Versorgungsreichweite</p>
            <p className="text-xs text-muted-foreground">
              Richte Ernährungs-Profile ein, um die Reichweite zu berechnen.
            </p>
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs w-full" asChild>
            <Link href="/settings/nutrition">
              Profile einrichten
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const days = data.coverageDays
  const formattedDays = days.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

  // Color logic based on coverage days
  let progressColor = 'bg-emerald-500'
  let textColor = 'text-emerald-600'
  if (days < 1) {
    progressColor = 'bg-destructive'
    textColor = 'text-destructive'
  } else if (days < 3) {
    progressColor = 'bg-orange-500'
    textColor = 'text-orange-600'
  } else if (days < 7) {
    progressColor = 'bg-blue-500'
    textColor = 'text-blue-600'
  }

  // Progress bar: max out at 14 days (100%)
  const progressPercent = Math.min(Math.round((days / 14) * 100), 100)

  return (
    <Card
      onClick={() => router.push('/dashboard/ernaehrung')}
      className="rounded-xl shadow-sm border-0 bg-card cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99] transition-transform"
    >
      <CardContent className="p-5 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Versorgungsreichweite
          </p>
          <div className="p-2 rounded-xl bg-muted/50 text-muted-foreground">
            <Package className="w-5 h-5" />
          </div>
        </div>

        {/* Main Value */}
        <div className="flex items-baseline gap-1.5">
          <span className={cn('text-3xl font-bold tabular-nums tracking-tight', textColor)}>
            +{formattedDays}
          </span>
          <span className={cn('text-sm font-medium', textColor)}>
            Tage
          </span>
        </div>

        {/* Subtitle */}
        <p className="text-xs text-muted-foreground">
          Basierend auf {data.foodItemCount} Lebensmittel-Artikel{data.foodItemCount !== 1 ? 'n' : ''} &middot; {data.memberCount} {data.memberCount === 1 ? 'Person' : 'Personen'}
        </p>

        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={cn('h-full transition-all duration-500 rounded-full', progressColor)}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </CardContent>
    </Card>
  )
}
