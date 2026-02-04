"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

/**
 * LoadingState Components
 *
 * Per DESIGN-UX-BLUEPRINT.md Section 3 (Loading States):
 *
 * Skeleton Pattern (preferred):
 * - Show layout structure with animated pulse
 * - Use shadcn/ui Skeleton component
 * - Match dimensions of real content
 *
 * Spinner Pattern (for actions):
 * - Button loading: Spinner replaces icon, text stays
 * - Full-screen: Only for >2s operations (receipt scan)
 * - Show progress text: "Analysiere Kassenbon..."
 */

/* =============================================================================
   SKELETON PATTERNS
   ============================================================================= */

interface LoadingStateProps {
  className?: string
}

/** Loading state for a single list row (Receipt, Store, etc.) */
export function ListRowSkeleton({ className }: LoadingStateProps) {
  return (
    <div className={cn("flex items-center gap-md py-sm", className)}>
      {/* Icon placeholder */}
      <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
      {/* Text content */}
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      {/* Amount placeholder */}
      <Skeleton className="h-4 w-16" />
    </div>
  )
}

/** Loading state for multiple list rows */
export function ListSkeleton({
  count = 5,
  className,
}: LoadingStateProps & { count?: number }) {
  return (
    <div className={cn("space-y-sm", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <ListRowSkeleton key={i} />
      ))}
    </div>
  )
}

/** Loading state for a KPI card */
export function KPICardSkeleton({ className }: LoadingStateProps) {
  return (
    <div
      className={cn(
        "p-md rounded-lg border bg-card",
        "flex flex-col items-center justify-center text-center",
        className
      )}
    >
      <Skeleton className="h-8 w-32 mb-sm" />
      <Skeleton className="h-4 w-24 mb-md" />
      <Skeleton className="h-3 w-20" />
    </div>
  )
}

/** Loading state for category chart */
export function ChartSkeleton({ className }: LoadingStateProps) {
  return (
    <div className={cn("p-md rounded-lg border bg-card", className)}>
      {/* Chart title */}
      <Skeleton className="h-5 w-32 mb-md" />
      {/* Donut chart placeholder */}
      <div className="flex justify-center mb-md">
        <Skeleton className="w-48 h-48 rounded-full" />
      </div>
      {/* Legend */}
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="w-3 h-3 rounded-full" />
            <Skeleton className="h-3 w-20" />
            <div className="flex-1" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Loading state for receipt detail */
export function ReceiptDetailSkeleton({ className }: LoadingStateProps) {
  return (
    <div className={cn("space-y-lg", className)}>
      {/* Header info */}
      <div className="space-y-sm">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>
      {/* Items list */}
      <div className="space-y-sm">
        <Skeleton className="h-5 w-20 mb-sm" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-2">
            <div className="space-y-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
      {/* Total */}
      <div className="border-t pt-md">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-6 w-24" />
        </div>
      </div>
    </div>
  )
}

/** Loading state for dashboard */
export function DashboardSkeleton({ className }: LoadingStateProps) {
  return (
    <div className={cn("space-y-lg", className)}>
      {/* KPI Card */}
      <KPICardSkeleton />
      {/* Category Chart */}
      <ChartSkeleton />
      {/* Top Stores */}
      <div>
        <Skeleton className="h-5 w-24 mb-md" />
        <ListSkeleton count={3} />
      </div>
    </div>
  )
}

/** Loading state for settlement */
export function SettlementSkeleton({ className }: LoadingStateProps) {
  return (
    <div className={cn("space-y-lg", className)}>
      {/* Month selector */}
      <Skeleton className="h-10 w-40" />
      {/* Overview card */}
      <div className="p-md rounded-lg border bg-card space-y-sm">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>
      {/* Person cards */}
      <div className="space-y-md">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="p-md rounded-lg border bg-card">
            <div className="flex items-center gap-md mb-md">
              <Skeleton className="w-10 h-10 rounded-full" />
              <Skeleton className="h-5 w-24" />
            </div>
            <div className="grid grid-cols-3 gap-sm">
              <div className="space-y-1">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* =============================================================================
   SPINNER PATTERNS
   ============================================================================= */

interface SpinnerProps {
  /** Size of the spinner */
  size?: "sm" | "md" | "lg"
  /** Text to display below spinner */
  text?: string
  className?: string
}

/** Inline spinner (for buttons, etc.) */
export function Spinner({ size = "md", className }: Omit<SpinnerProps, "text">) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  }

  return (
    <Loader2
      className={cn("animate-spin text-current", sizeClasses[size], className)}
    />
  )
}

/** Full-screen loading overlay (for long operations like receipt scanning) */
export function FullScreenLoader({ text = "Laden...", className }: SpinnerProps) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50",
        "flex flex-col items-center justify-center",
        "bg-background/80 backdrop-blur-sm",
        className
      )}
    >
      <Loader2 className="w-10 h-10 animate-spin text-primary mb-md" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  )
}

/** Processing state for receipt scanning */
export function ReceiptProcessingLoader({ className }: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center",
        "py-xl px-md text-center",
        "min-h-[400px]",
        className
      )}
    >
      <div className="relative mb-lg">
        {/* Pulsing circle background */}
        <div className="absolute inset-0 bg-primary/10 rounded-full animate-pulse" />
        {/* Spinner */}
        <div className="w-20 h-20 flex items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-sm">
        Analysiere Kassenbon...
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        Die KI erkennt Produkte und Preise. Das dauert nur einen Moment.
      </p>
    </div>
  )
}

// Export individual components, no default export needed
// All components are exported individually above
