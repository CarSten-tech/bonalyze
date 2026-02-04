'use client'

import { ShoppingCart, Store, Receipt, ShoppingBag, Package } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/components/common/currency'
import { formatRelativeDate } from '@/components/common/relative-date'

interface ReceiptListItemProps {
  /** Receipt ID */
  id: string
  /** Store name */
  storeName: string
  /** Purchase date */
  date: Date | string
  /** Number of items */
  itemCount: number
  /** Total amount in cents */
  totalAmount: number
  /** Store icon/logo (optional) */
  storeIcon?: React.ReactNode
  /** Click handler */
  onClick?: () => void
  /** Additional className */
  className?: string
}

/**
 * Receipt List Item Component
 *
 * Per UI-PATTERNS-REFERENCE.md Section 6:
 * - Store-Icon/Logo left (in rounded container with brand colors)
 * - Store-Name: font-semibold
 * - Meta: text-sm, muted (Date + Item count)
 * - Amount: right-aligned, font-semibold
 * - Minimum Touch Target: 56px height
 */
export function ReceiptListItem({
  storeName,
  date,
  itemCount,
  totalAmount,
  storeIcon,
  onClick,
  className,
}: ReceiptListItemProps) {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const formattedDate = formatRelativeDate(dateObj, { showTime: false, variant: 'short' })

  // Get store-specific styling
  const storeStyle = getStoreStyle(storeName)

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3',
        'hover:bg-slate-50 transition-colors',
        'min-h-[64px] text-left',
        className
      )}
    >
      {/* Store Icon with brand color */}
      <div
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
          storeStyle.bgColor
        )}
      >
        {storeIcon || (
          <storeStyle.icon className={cn('h-5 w-5', storeStyle.iconColor)} />
        )}
      </div>

      {/* Store Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground truncate">{storeName}</p>
        <p className="text-sm text-muted-foreground">
          {formattedDate} • {itemCount} {itemCount === 1 ? 'Artikel' : 'Artikel'}
        </p>
      </div>

      {/* Amount */}
      <p className="text-base font-semibold tabular-nums shrink-0">
        {formatCurrency(totalAmount, { inCents: true })}
      </p>
    </button>
  )
}

/**
 * Receipt List Item Skeleton for loading state
 */
export function ReceiptListItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 min-h-[56px]">
      <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-4 w-16" />
    </div>
  )
}

interface StoreStyle {
  bgColor: string
  iconColor: string
  icon: React.ComponentType<{ className?: string }>
}

/**
 * Get store-specific styling (colors, icon) based on store name
 */
function getStoreStyle(storeName: string): StoreStyle {
  const normalized = storeName.toLowerCase().trim()

  // Store-specific brand colors and icons
  const storeStyles: Record<string, StoreStyle> = {
    lidl: {
      bgColor: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      icon: Receipt,
    },
    aldi: {
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-600',
      icon: ShoppingCart,
    },
    rewe: {
      bgColor: 'bg-teal-100',
      iconColor: 'text-teal-600',
      icon: Package,
    },
    edeka: {
      bgColor: 'bg-amber-100',
      iconColor: 'text-amber-600',
      icon: ShoppingBag,
    },
    kaufland: {
      bgColor: 'bg-red-100',
      iconColor: 'text-red-600',
      icon: ShoppingCart,
    },
    dm: {
      bgColor: 'bg-pink-100',
      iconColor: 'text-pink-600',
      icon: Package,
    },
    rossmann: {
      bgColor: 'bg-rose-100',
      iconColor: 'text-rose-600',
      icon: Package,
    },
    netto: {
      bgColor: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      icon: ShoppingCart,
    },
    penny: {
      bgColor: 'bg-orange-100',
      iconColor: 'text-orange-600',
      icon: ShoppingCart,
    },
  }

  for (const [key, style] of Object.entries(storeStyles)) {
    if (normalized.includes(key)) {
      return style
    }
  }

  // Default styling
  return {
    bgColor: 'bg-slate-100',
    iconColor: 'text-slate-600',
    icon: Store,
  }
}

/**
 * Get store icon based on store name (for backwards compatibility)
 */
export function getStoreIcon(storeName: string): React.ReactNode {
  const style = getStoreStyle(storeName)
  return <style.icon className={cn('h-5 w-5', style.iconColor)} />
}

export default ReceiptListItem
