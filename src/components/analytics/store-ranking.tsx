'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Store, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/components/common/currency'
import { StoreData } from '@/types/analytics'
import { cn } from '@/lib/utils'

interface StoreRankingProps {
  /** Store data array (already sorted by amount) */
  data: StoreData[]
  /** Loading state */
  isLoading?: boolean
  /** Enable click to filter receipts */
  clickable?: boolean
  /** Additional className */
  className?: string
}

/**
 * Store Ranking Component
 *
 * Shows top stores by spending with:
 * - Ranked list (1-5)
 * - Store name, total amount, visit count
 * - Click-to-filter functionality
 */
export function StoreRanking({
  data,
  isLoading = false,
  clickable = true,
  className,
}: StoreRankingProps) {
  const router = useRouter()

  const handleStoreClick = useCallback(
    (storeId: string) => {
      if (clickable) {
        router.push(`/dashboard/receipts?merchant=${storeId}`)
      }
    },
    [router, clickable]
  )

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Top Stores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-md"
            >
              <Skeleton className="h-5 w-5 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Top Stores</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Keine Store-Daten vorhanden
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Top Stores</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {data.map((store, index) => (
          <StoreRankingItem
            key={store.id}
            rank={index + 1}
            store={store}
            onClick={() => handleStoreClick(store.id)}
            clickable={clickable}
          />
        ))}
      </CardContent>
    </Card>
  )
}

/**
 * Store Ranking Item
 */
interface StoreRankingItemProps {
  rank: number
  store: StoreData
  onClick?: () => void
  clickable?: boolean
}

function StoreRankingItem({
  rank,
  store,
  onClick,
  clickable,
}: StoreRankingItemProps) {
  // Rank badge colors
  const getRankColor = (rank: number): string => {
    switch (rank) {
      case 1:
        return 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
      case 2:
        return 'bg-muted-foreground/20 text-muted-foreground dark:text-muted-foreground'
      case 3:
        return 'bg-orange-500/20 text-orange-600 dark:text-orange-400'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      className={cn(
        'flex items-center gap-3 w-full p-3 rounded-md text-left transition-colors',
        clickable && 'hover:bg-muted cursor-pointer',
        !clickable && 'cursor-default'
      )}
    >
      {/* Rank badge */}
      <span
        className={cn(
          'h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
          getRankColor(rank)
        )}
      >
        {rank}
      </span>

      {/* Store icon or logo */}
      <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
        <Store className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Store info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{store.name}</p>
        <p className="text-xs text-muted-foreground">
          {store.visitCount} {store.visitCount === 1 ? 'Einkauf' : 'Einkäufe'}
        </p>
      </div>

      {/* Amount */}
      <span className="text-sm font-medium tabular-nums">
        {formatCurrency(store.amount, { inCents: true })}
      </span>

      {/* Arrow indicator */}
      {clickable && (
        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      )}
    </button>
  )
}

/**
 * Compact Store List
 * Shows stores in a simpler format
 */
interface CompactStoreListProps {
  data: StoreData[]
  isLoading?: boolean
  limit?: number
  className?: string
}

export function CompactStoreList({
  data,
  isLoading = false,
  limit = 3,
  className,
}: CompactStoreListProps) {
  if (isLoading) {
    return (
      <div className={cn('space-y-2', className)}>
        {Array.from({ length: limit }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-3 w-20" />
            <div className="flex-1" />
            <Skeleton className="h-3 w-14" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      {data.slice(0, limit).map((store, index) => (
        <div key={store.id} className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground w-4">{index + 1}.</span>
          <span className="truncate flex-1">{store.name}</span>
          <span className="text-muted-foreground tabular-nums">
            {formatCurrency(store.amount, { inCents: true })}
          </span>
        </div>
      ))}
    </div>
  )
}
