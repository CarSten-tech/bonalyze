"use client"

import { cn } from "@/lib/utils"
import { BottomNav } from "./bottom-nav"
import { ReactNode } from "react"

/**
 * PageLayout Component
 *
 * Wrapper component that provides:
 * - Safe area handling for iOS (notch, home indicator)
 * - Fixed header slot
 * - Scrollable content area with proper padding
 * - Bottom navigation
 *
 * Per DESIGN-UX-BLUEPRINT.md Section 3:
 * - Status bar: 44pt iOS safe area
 * - Header: 56pt
 * - Content: Scrollable with 16pt padding
 * - Bottom nav: 84pt (including safe area)
 */

interface PageLayoutProps {
  children: ReactNode
  /** Custom header component (PageHeader) */
  header?: ReactNode
  /** Hide bottom navigation (e.g., for full-screen modals) */
  hideNav?: boolean
  /** Additional className for the content area */
  className?: string
  /** Callback when scan from camera is triggered */
  onScanFromCamera?: () => void
  /** Callback when scan from gallery is triggered */
  onScanFromGallery?: () => void
}

export function PageLayout({
  children,
  header,
  hideNav = false,
  className,
  onScanFromCamera,
  onScanFromGallery,
}: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Safe area for status bar */}
      <div className="safe-top" />

      {/* Header slot */}
      {header && (
        <header className="sticky top-0 z-40 bg-background border-b border-border">
          {header}
        </header>
      )}

      {/* Main scrollable content */}
      <main
        className={cn(
          "flex-1 overflow-y-auto",
          "px-md py-md",
          // Add padding for bottom nav when visible
          !hideNav && "pb-bottom-nav",
          className
        )}
      >
        {children}
      </main>

      {/* Bottom Navigation */}
      {!hideNav && (
        <BottomNav
          onScanFromCamera={onScanFromCamera}
          onScanFromGallery={onScanFromGallery}
        />
      )}
    </div>
  )
}

/**
 * PageContent Component
 *
 * A simpler wrapper for page content without header/nav.
 * Useful for nested layouts or specific sections.
 */
interface PageContentProps {
  children: ReactNode
  className?: string
}

export function PageContent({ children, className }: PageContentProps) {
  return (
    <div className={cn("flex flex-col gap-lg", className)}>
      {children}
    </div>
  )
}

/**
 * PageSection Component
 *
 * Groups related content with consistent spacing.
 */
interface PageSectionProps {
  children: ReactNode
  /** Optional section title */
  title?: string
  /** "Alle anzeigen" link */
  viewAllHref?: string
  className?: string
}

export function PageSection({
  children,
  title,
  viewAllHref,
  className,
}: PageSectionProps) {
  return (
    <section className={cn("flex flex-col gap-md", className)}>
      {(title || viewAllHref) && (
        <div className="flex items-center justify-between">
          {title && (
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          )}
          {viewAllHref && (
            <a
              href={viewAllHref}
              className="text-sm text-primary hover:underline"
            >
              Alle anzeigen
            </a>
          )}
        </div>
      )}
      {children}
    </section>
  )
}

export default PageLayout
