"use client"

import { ReactNode } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Filter, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useState } from "react"

/**
 * PageHeader Component Variants
 *
 * Per DESIGN-UX-BLUEPRINT.md Section 3:
 *
 * 1. DashboardHeader: Household switcher + user avatar
 * 2. ListHeader: Title + optional filter + search bar
 * 3. DetailHeader: Back button + title + optional action
 */

/* =============================================================================
   DASHBOARD HEADER
   Used on: /dashboard (Home)
   Shows: Household name with dropdown + User avatar
   ============================================================================= */

interface DashboardHeaderProps {
  householdName: string
  userInitials: string
  userAvatarUrl?: string
  onHouseholdClick?: () => void
  onAvatarClick?: () => void
}

export function DashboardHeader({
  householdName,
  userInitials,
  userAvatarUrl,
  onHouseholdClick,
  onAvatarClick,
}: DashboardHeaderProps) {
  return (
    <div className="flex items-center justify-between h-header px-md">
      {/* Household Switcher */}
      <button
        onClick={onHouseholdClick}
        className="flex items-center gap-2 min-h-touch"
      >
        <span className="text-lg">🏠</span>
        <span className="font-semibold text-foreground">{householdName}</span>
        <ChevronLeft className="w-4 h-4 text-muted-foreground rotate-[-90deg]" />
      </button>

      {/* User Avatar */}
      <button onClick={onAvatarClick} className="min-h-touch min-w-touch flex items-center justify-center">
        <Avatar className="w-9 h-9">
          <AvatarImage src={userAvatarUrl} alt="Profil" />
          <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
            {userInitials}
          </AvatarFallback>
        </Avatar>
      </button>
    </div>
  )
}

/* =============================================================================
   LIST HEADER
   Used on: /receipts, /settlement (list screens)
   Shows: Title + optional filter button + search input
   ============================================================================= */

interface ListHeaderProps {
  title: string
  /** Search placeholder text */
  searchPlaceholder?: string
  /** Controlled search value */
  searchValue?: string
  /** Search change handler */
  onSearchChange?: (value: string) => void
  /** Show filter button */
  showFilter?: boolean
  /** Filter click handler */
  onFilterClick?: () => void
  /** Is filter currently active */
  filterActive?: boolean
}

export function ListHeader({
  title,
  searchPlaceholder = "Suchen...",
  searchValue,
  onSearchChange,
  showFilter = false,
  onFilterClick,
  filterActive = false,
}: ListHeaderProps) {
  const [localSearch, setLocalSearch] = useState(searchValue || "")
  const searchInputValue = searchValue !== undefined ? searchValue : localSearch

  const handleSearchChange = (value: string) => {
    if (searchValue === undefined) {
      setLocalSearch(value)
    }
    onSearchChange?.(value)
  }

  const handleClearSearch = () => {
    handleSearchChange("")
  }

  return (
    <div className="flex flex-col gap-sm px-md py-sm">
      {/* Title Row */}
      <div className="flex items-center justify-between h-10">
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        {showFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onFilterClick}
            className={cn(
              "min-h-touch min-w-touch",
              filterActive && "text-primary"
            )}
          >
            <Filter className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          placeholder={searchPlaceholder}
          value={searchInputValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9 pr-9 h-11 bg-muted border-0"
        />
        {searchInputValue && (
          <button
            onClick={handleClearSearch}
            aria-label="Suche löschen"
            className="absolute right-3 top-1/2 -translate-y-1/2 min-h-touch min-w-touch flex items-center justify-center"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  )
}

/* =============================================================================
   DETAIL HEADER
   Used on: /receipts/[id], /settings/household, etc.
   Shows: Back button + centered title + optional action
   ============================================================================= */

interface DetailHeaderProps {
  title: string
  /** Back button click handler. If not provided, uses router.back() */
  onBack?: () => void
  /** Right-side action */
  action?: ReactNode
  /** Custom back label (default: just icon) */
  backLabel?: string
}

export function DetailHeader({
  title,
  onBack,
  action,
  backLabel,
}: DetailHeaderProps) {
  const router = useRouter()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      router.back()
    }
  }

  return (
    <div className="flex items-center justify-between h-header px-md">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleBack}
        className="min-h-touch -ml-2 gap-1"
      >
        <ChevronLeft className="w-5 h-5" />
        {backLabel && <span>{backLabel}</span>}
      </Button>

      {/* Centered Title */}
      <h1 className="absolute left-1/2 -translate-x-1/2 font-semibold text-foreground">
        {title}
      </h1>

      {/* Action Slot */}
      <div className="min-w-touch min-h-touch flex items-center justify-end">
        {action}
      </div>
    </div>
  )
}

/* =============================================================================
   SIMPLE HEADER
   Used for basic pages without complex functionality
   Shows: Just a title, optionally with an action
   ============================================================================= */

interface SimpleHeaderProps {
  title: string
  action?: ReactNode
}

export function SimpleHeader({ title, action }: SimpleHeaderProps) {
  return (
    <div className="flex items-center justify-between h-header px-md">
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      {action && (
        <div className="min-w-touch min-h-touch flex items-center justify-end">
          {action}
        </div>
      )}
    </div>
  )
}

// Export individual header components via named exports
// All header variants are exported individually above
