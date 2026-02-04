'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface InsightCardProps {
  /** Title of the insight */
  title: string
  /** Description text */
  description: string
  /** Optional label (e.g., store name) */
  label?: string
  /** Icon component to show top-right */
  icon?: React.ReactNode
  /** Border color variant */
  variant?: 'primary' | 'success' | 'warning' | 'info'
  /** Click handler */
  onClick?: () => void
  /** Loading state */
  isLoading?: boolean
  /** Additional className */
  className?: string
}

/**
 * Insight Card Component
 *
 * Per UI-PATTERNS-REFERENCE.md Section 5:
 * - Blue/Teal vertical line left (border-l-4 border-primary)
 * - Title: font-semibold
 * - Description: text-muted-foreground
 * - Store-Label: text-xs, uppercase, primary color
 * - Optional: Icon right top
 */
export function InsightCard({
  title,
  description,
  label,
  icon,
  variant = 'primary',
  onClick,
  isLoading = false,
  className,
}: InsightCardProps) {
  if (isLoading) {
    return (
      <Card className={cn('rounded-2xl border-l-4 border-l-muted border-0 shadow-elevation-1 bg-white', className)}>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start gap-3">
            <Skeleton className="h-6 w-6 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Border color variants
  const borderColors = {
    primary: 'border-l-primary',
    success: 'border-l-teal-400',
    warning: 'border-l-amber-500',
    info: 'border-l-blue-500',
  }

  const labelColors = {
    primary: 'text-primary',
    success: 'text-teal-600',
    warning: 'text-amber-600',
    info: 'text-blue-600',
  }

  const iconColors = {
    primary: 'text-primary',
    success: 'text-teal-500',
    warning: 'text-amber-500',
    info: 'text-blue-500',
  }

  return (
    <Card
      className={cn(
        'rounded-2xl border-l-4 border-0 shadow-elevation-1 bg-white',
        borderColors[variant],
        onClick && 'cursor-pointer hover:bg-slate-50 transition-colors',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon on the left */}
          {icon && (
            <div className={cn('shrink-0 mt-0.5', iconColors[variant])}>
              {icon}
            </div>
          )}

          <div className="flex-1 min-w-0">
            {/* Title */}
            <h3 className="font-semibold text-foreground">{title}</h3>

            {/* Description */}
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              {description}
            </p>

            {/* Label */}
            {label && (
              <p
                className={cn(
                  'text-xs uppercase tracking-wider font-medium mt-2',
                  labelColors[variant]
                )}
              >
                {label}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Section Header Component
 *
 * Per UI-PATTERNS-REFERENCE.md Section 4:
 * - Emoji + Title left (text-lg, font-semibold)
 * - Action-Link right (text-xs, primary color, uppercase)
 */
interface SectionHeaderProps {
  /** Title text */
  title: string
  /** Optional emoji/icon prefix */
  icon?: React.ReactNode
  /** Action link text */
  actionLabel?: string
  /** Action link handler */
  onAction?: () => void
  /** Additional className */
  className?: string
}

export function SectionHeader({
  title,
  icon,
  actionLabel,
  onAction,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div className="flex items-center gap-2">
        {icon && <span className="text-lg">{icon}</span>}
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="text-xs uppercase tracking-wider font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
        >
          {actionLabel}
          <span className="text-[10px]">&gt;</span>
        </button>
      )}
    </div>
  )
}

export default InsightCard
