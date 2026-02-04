'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCents } from '@/lib/settlement-utils'
import { Users, Calculator } from 'lucide-react'

interface SettlementOverviewCardProps {
  totalSpent: number // in cents
  fairShare: number // in cents
  memberCount: number
  receiptCount: number
  periodLabel: string
  isLoading?: boolean
}

export function SettlementOverviewCard({
  totalSpent,
  fairShare,
  memberCount,
  receiptCount,
  periodLabel,
  isLoading = false,
}: SettlementOverviewCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-40" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-muted-foreground">
          {periodLabel}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Spent */}
        <div>
          <p className="text-sm text-muted-foreground">Gesamtausgaben</p>
          <p className="text-3xl font-bold tracking-tight">
            {formatCents(totalSpent)}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Fair Share */}
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Calculator className="h-4 w-4" />
              <span className="text-xs">Fair Share</span>
            </div>
            <p className="text-lg font-semibold">{formatCents(fairShare)}</p>
            <p className="text-xs text-muted-foreground">pro Person</p>
          </div>

          {/* Member Count */}
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs">Haushalt</span>
            </div>
            <p className="text-lg font-semibold">{memberCount}</p>
            <p className="text-xs text-muted-foreground">
              {memberCount === 1 ? 'Person' : 'Personen'}, {receiptCount}{' '}
              {receiptCount === 1 ? 'Bon' : 'Bons'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
