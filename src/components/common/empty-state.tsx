"use client"

import { ReactNode } from "react"
import { LucideIcon, Receipt, Users, Wallet, Search, FileX } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/**
 * EmptyState Component
 *
 * Per DESIGN-UX-BLUEPRINT.md Section 3 (Empty States):
 * - Centered layout
 * - Simple illustration or icon (not photo)
 * - Headline: What's missing
 * - Subtext: What to do about it
 * - CTA button if action possible
 */

interface EmptyStateProps {
  /** Icon to display (from lucide-react) */
  icon?: LucideIcon
  /** Main headline text - what's missing */
  title: string
  /** Descriptive text - what to do about it */
  description?: string
  /** Primary action button text */
  actionLabel?: string
  /** Primary action click handler */
  onAction?: () => void
  /** Secondary action (rendered as child) */
  children?: ReactNode
  /** Additional className */
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  children,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        "py-xl px-md",
        "min-h-[300px]",
        className
      )}
    >
      {/* Icon */}
      {Icon && (
        <div className="mb-lg">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Icon className="w-8 h-8 text-muted-foreground" />
          </div>
        </div>
      )}

      {/* Title */}
      <h3 className="text-lg font-semibold text-foreground mb-sm">{title}</h3>

      {/* Description */}
      {description && (
        <p className="text-sm text-muted-foreground max-w-xs mb-lg">
          {description}
        </p>
      )}

      {/* Primary Action */}
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mb-md">
          {actionLabel}
        </Button>
      )}

      {/* Additional content (secondary actions) */}
      {children}
    </div>
  )
}

/* =============================================================================
   PRESET EMPTY STATES
   Common empty states used throughout the app
   ============================================================================= */

interface PresetEmptyStateProps {
  onAction?: () => void
  className?: string
}

/** Empty state for receipts list */
export function EmptyReceipts({ onAction, className }: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={Receipt}
      title="Noch keine Kassenbons"
      description="Scanne deinen ersten Kassenbon um loszulegen."
      actionLabel="Kassenbon scannen"
      onAction={onAction}
      className={className}
    />
  )
}

/** Empty state for settlement */
export function EmptySettlement({ className }: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={Wallet}
      title="Keine Ausgaben in diesem Zeitraum"
      description="Sobald Kassenbons gescannt werden, siehst du hier die Abrechnung."
      className={className}
    />
  )
}

/** Empty state for household members */
export function EmptyHouseholdMembers({
  onAction,
  className,
}: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={Users}
      title="Noch keine Mitglieder"
      description="Lade Personen zu deinem Haushalt ein um Ausgaben zu teilen."
      actionLabel="Mitglied einladen"
      onAction={onAction}
      className={className}
    />
  )
}

/** Empty state for search results */
export function EmptySearchResults({ className }: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={Search}
      title="Keine Ergebnisse"
      description="Versuche einen anderen Suchbegriff."
      className={className}
    />
  )
}

/** Empty state for filtered results */
export function EmptyFilterResults({
  onAction,
  className,
}: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={FileX}
      title="Keine Ergebnisse"
      description="Es gibt keine Eintraege die deinen Filterkriterien entsprechen."
      actionLabel="Filter zuruecksetzen"
      onAction={onAction}
      className={className}
    />
  )
}

export default EmptyState
