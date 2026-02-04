'use client'

import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TipListItemProps {
  /** Icon component or emoji */
  icon: React.ReactNode
  /** Title of the tip */
  title: string
  /** Description text */
  description: string
  /** Background color class for icon circle */
  iconBgColor?: string
  /** Icon color class */
  iconColor?: string
  /** Click handler */
  onClick?: () => void
  /** Additional className */
  className?: string
}

/**
 * Tip List Item Component
 *
 * Used in "Konkrete Tipps" section of Smart Insights page.
 * Shows an icon in a colored circle, title, description, and chevron.
 */
export function TipListItem({
  icon,
  title,
  description,
  iconBgColor = 'bg-slate-100',
  iconColor = 'text-slate-600',
  onClick,
  className,
}: TipListItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 w-full p-4 text-left',
        'bg-white rounded-2xl shadow-elevation-1',
        'transition-colors hover:bg-slate-50',
        className
      )}
    >
      {/* Icon Circle */}
      <div
        className={cn(
          'flex items-center justify-center w-10 h-10 rounded-full shrink-0',
          iconBgColor,
          iconColor
        )}
      >
        {icon}
      </div>

      {/* Text Content */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-foreground">{title}</h4>
        <p className="text-sm text-muted-foreground truncate">{description}</p>
      </div>

      {/* Chevron */}
      <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
    </button>
  )
}

export default TipListItem
