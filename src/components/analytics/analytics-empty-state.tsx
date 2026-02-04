'use client'

import { useRouter } from 'next/navigation'
import { PieChart, Receipt, TrendingUp, Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface AnalyticsEmptyStateProps {
  /** Whether there's no data at all (new user) or just for the selected period */
  variant: 'no_data' | 'no_period_data'
  /** Current period label (e.g., "Januar 2025") */
  periodLabel?: string
  /** Additional className */
  className?: string
}

/**
 * Empty State for Analytics Dashboard
 *
 * Handles two scenarios:
 * 1. New user with no receipts at all -> Prompt to scan first receipt
 * 2. No data for selected period -> Suggest changing period or scanning
 */
export function AnalyticsEmptyState({
  variant,
  periodLabel,
  className,
}: AnalyticsEmptyStateProps) {
  const router = useRouter()

  const handleScanReceipt = () => {
    router.push('/dashboard/receipts/new')
  }

  if (variant === 'no_data') {
    return (
      <Card className={cn('border-dashed', className)}>
        <CardContent className="py-12">
          <div className="flex flex-col items-center text-center space-y-4">
            {/* Icon */}
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <PieChart className="h-8 w-8 text-muted-foreground" />
            </div>

            {/* Title */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Starte deine Ausgabenanalyse</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Scanne deinen ersten Kassenbon und erhalte Einblicke in deine Ausgaben nach Kategorie und Store.
              </p>
            </div>

            {/* Features preview */}
            <div className="grid grid-cols-3 gap-4 py-4 w-full max-w-sm">
              <FeaturePreview
                icon={TrendingUp}
                label="Trends"
              />
              <FeaturePreview
                icon={PieChart}
                label="Kategorien"
              />
              <FeaturePreview
                icon={Receipt}
                label="Stores"
              />
            </div>

            {/* CTA */}
            <Button onClick={handleScanReceipt} size="lg" className="gap-2">
              <Camera className="h-4 w-4" />
              Ersten Kassenbon scannen
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // No data for selected period
  return (
    <Card className={cn('border-dashed', className)}>
      <CardContent className="py-12">
        <div className="flex flex-col items-center text-center space-y-4">
          {/* Icon */}
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <Receipt className="h-8 w-8 text-muted-foreground" />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Keine Daten für diesen Zeitraum</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {periodLabel
                ? `Es gibt keine Kassenbons im Zeitraum "${periodLabel}".`
                : 'Es gibt keine Kassenbons in diesem Zeitraum.'}
              {' '}Wähle einen anderen Zeitraum oder erfasse einen neuen Einkauf.
            </p>
          </div>

          {/* CTA */}
          <Button onClick={handleScanReceipt} variant="outline" className="gap-2">
            <Camera className="h-4 w-4" />
            Kassenbon erfassen
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Feature Preview Item
 */
interface FeaturePreviewProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
}

function FeaturePreview({ icon: Icon, label }: FeaturePreviewProps) {
  return (
    <div className="flex flex-col items-center gap-1 text-muted-foreground">
      <div className="h-10 w-10 rounded-md bg-muted/50 flex items-center justify-center">
        <Icon className="h-5 w-5" />
      </div>
      <span className="text-xs">{label}</span>
    </div>
  )
}

/**
 * Loading State for Analytics Dashboard
 * Full-page loading skeleton
 */
export function AnalyticsLoadingState({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6 animate-pulse', className)}>
      {/* Period selector skeleton */}
      <div className="h-10 bg-muted rounded-md w-full max-w-md" />

      {/* KPI card skeleton */}
      <div className="h-48 bg-muted rounded-lg" />

      {/* Two column layout skeleton */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="h-80 bg-muted rounded-lg" />
        <div className="h-80 bg-muted rounded-lg" />
      </div>
    </div>
  )
}

/**
 * Error State for Analytics Dashboard
 */
interface AnalyticsErrorStateProps {
  message?: string
  onRetry?: () => void
  className?: string
}

export function AnalyticsErrorState({
  message = 'Fehler beim Laden der Analytics',
  onRetry,
  className,
}: AnalyticsErrorStateProps) {
  return (
    <Card className={cn('border-destructive/50', className)}>
      <CardContent className="py-12">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <PieChart className="h-8 w-8 text-destructive" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Fehler beim Laden</h3>
            <p className="text-sm text-muted-foreground max-w-sm">{message}</p>
          </div>

          {onRetry && (
            <Button onClick={onRetry} variant="outline">
              Erneut versuchen
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
