'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCents, formatPeriodRange } from '@/lib/settlement-utils'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { Check, Clock } from 'lucide-react'
import type { SettlementWithDetails } from '@/types/settlement'

interface SettlementHistoryCardProps {
  settlement: SettlementWithDetails
  onClick?: () => void
}

export function SettlementHistoryCard({
  settlement,
  onClick,
}: SettlementHistoryCardProps) {
  const {
    periodLabel,
    totalAmountCents,
    transferSummary,
    isSettled,
    settledAt,
    periodStart,
    periodEnd,
  } = settlement

  return (
    <Card
      className={onClick ? 'cursor-pointer hover:bg-muted/50 transition-colors' : ''}
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Header: Period + Status */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <h3 className="font-semibold">{periodLabel}</h3>
            <p className="text-xs text-muted-foreground">
              {formatPeriodRange(periodStart, periodEnd)}
            </p>
          </div>
          <Badge
            variant={isSettled ? 'default' : 'secondary'}
            className={
              isSettled
                ? 'bg-green-100 text-green-800 hover:bg-green-100'
                : ''
            }
          >
            {isSettled ? (
              <>
                <Check className="h-3 w-3 mr-1" />
                Erledigt
              </>
            ) : (
              <>
                <Clock className="h-3 w-3 mr-1" />
                Offen
              </>
            )}
          </Badge>
        </div>

        {/* Amount */}
        <div className="mb-2">
          <p className="text-2xl font-bold">{formatCents(totalAmountCents)}</p>
          <p className="text-sm text-muted-foreground">Gesamtausgaben</p>
        </div>

        {/* Transfer Summary */}
        <div className="pt-2 border-t">
          <p className="text-sm text-muted-foreground truncate">
            {transferSummary}
          </p>
          {isSettled && settledAt && (
            <p className="text-xs text-muted-foreground mt-1">
              Erledigt am{' '}
              {format(parseISO(settledAt), 'dd.MM.yyyy', { locale: de })}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Skeleton loader for settlement history cards
 */
export function SettlementHistoryCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="space-y-1">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-3 w-36" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-8 w-24 mb-2" />
        <Skeleton className="h-4 w-40" />
      </CardContent>
    </Card>
  )
}
