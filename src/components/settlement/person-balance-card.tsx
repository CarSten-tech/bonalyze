'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCents } from '@/lib/settlement-utils'
import { cn } from '@/lib/utils'
import type { PersonBalance } from '@/types/settlement'

interface PersonBalanceCardProps {
  person: PersonBalance
  onClick?: () => void
  isLoading?: boolean
}

export function PersonBalanceCard({
  person,
  onClick,
  isLoading = false,
}: PersonBalanceCardProps) {
  const { displayName, paid, fairShare, balance } = person

  // Get initials from display name
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  // Determine balance status
  const hasCredit = balance > 0
  const hasDebt = balance < 0
  const isBalanced = balance === 0

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className={cn(
        'transition-colors',
        onClick && 'cursor-pointer hover:bg-muted/50'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{displayName}</p>
            <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
              <p>
                Bezahlt: <span className="font-medium">{formatCents(paid)}</span>
              </p>
              <p>
                Fair Share:{' '}
                <span className="font-medium">{formatCents(fairShare)}</span>
              </p>
            </div>
          </div>

          {/* Balance Badge */}
          <Badge
            variant={isBalanced ? 'secondary' : hasCredit ? 'default' : 'destructive'}
            className={cn(
              'whitespace-nowrap',
              hasCredit && 'bg-green-100 text-green-800 hover:bg-green-100',
              hasDebt && 'bg-red-100 text-red-800 hover:bg-red-100'
            )}
          >
            {hasCredit && '+'}
            {formatCents(balance)}
          </Badge>
        </div>

        {/* Balance Text */}
        <div className="mt-3 pt-3 border-t">
          <p
            className={cn(
              'text-sm font-medium',
              hasCredit && 'text-green-600',
              hasDebt && 'text-red-600',
              isBalanced && 'text-muted-foreground'
            )}
          >
            {isBalanced && 'Ausgeglichen'}
            {hasCredit && `Bekommt ${formatCents(balance)}`}
            {hasDebt && `Schuldet ${formatCents(Math.abs(balance))}`}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Skeleton loader for person balance cards
 */
export function PersonBalanceCardSkeleton() {
  return <PersonBalanceCard person={{} as PersonBalance} isLoading />
}
