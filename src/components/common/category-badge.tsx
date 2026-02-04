"use client"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

/**
 * CategoryBadge Component
 *
 * Per DESIGN-UX-BLUEPRINT.md Section 3 (Data Display Conventions):
 *
 * Categories with emoji prefix for visual scanning:
 * - Lebensmittel
 * - Haushalt
 * - Getraenke
 * - Sonstiges
 *
 * Section 6 (Category Colors):
 * - Sage green - Lebensmittel
 * - Dusty blue - Haushalt
 * - Warm terra - Getraenke
 * - Soft plum - Sonstiges
 */

/** Category types supported by the app */
export type CategoryType =
  | "lebensmittel"
  | "haushalt"
  | "getraenke"
  | "drogerie"
  | "sonstiges"

/** Category configuration with emoji and color */
interface CategoryConfig {
  emoji: string
  label: string
  /** Tailwind color class for background */
  bgClass: string
  /** Tailwind color class for text */
  textClass: string
  /** CSS variable for chart color */
  chartColor: string
}

/** Category configurations */
const CATEGORIES: Record<CategoryType, CategoryConfig> = {
  lebensmittel: {
    emoji: "🥦",
    label: "Lebensmittel",
    bgClass: "bg-chart-1/10",
    textClass: "text-chart-1",
    chartColor: "hsl(var(--chart-1))",
  },
  haushalt: {
    emoji: "🧴",
    label: "Haushalt",
    bgClass: "bg-chart-2/10",
    textClass: "text-chart-2",
    chartColor: "hsl(var(--chart-2))",
  },
  getraenke: {
    emoji: "🍷",
    label: "Getraenke",
    bgClass: "bg-chart-3/10",
    textClass: "text-chart-3",
    chartColor: "hsl(var(--chart-3))",
  },
  drogerie: {
    emoji: "💄",
    label: "Drogerie",
    bgClass: "bg-chart-5/10",
    textClass: "text-chart-5",
    chartColor: "hsl(var(--chart-5))",
  },
  sonstiges: {
    emoji: "📦",
    label: "Sonstiges",
    bgClass: "bg-chart-4/10",
    textClass: "text-chart-4",
    chartColor: "hsl(var(--chart-4))",
  },
}

interface CategoryBadgeProps {
  /** Category identifier */
  category: CategoryType | string
  /** Show emoji prefix */
  showEmoji?: boolean
  /** Size variant */
  size?: "sm" | "default" | "lg"
  /** Additional className */
  className?: string
}

export function CategoryBadge({
  category,
  showEmoji = true,
  size = "default",
  className,
}: CategoryBadgeProps) {
  // Get category config, fallback to "sonstiges" for unknown categories
  const categoryKey = category.toLowerCase() as CategoryType
  const config = CATEGORIES[categoryKey] || CATEGORIES.sonstiges

  // Size classes
  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    default: "text-sm px-2 py-1",
    lg: "text-base px-3 py-1.5",
  }

  return (
    <Badge
      variant="secondary"
      className={cn(
        config.bgClass,
        config.textClass,
        "border-0 font-medium",
        sizeClasses[size],
        className
      )}
    >
      {showEmoji && <span className="mr-1">{config.emoji}</span>}
      {config.label}
    </Badge>
  )
}

/**
 * Get category configuration by category key
 */
export function getCategoryConfig(category: CategoryType | string): CategoryConfig {
  const categoryKey = category.toLowerCase() as CategoryType
  return CATEGORIES[categoryKey] || CATEGORIES.sonstiges
}

/**
 * Get all available categories for dropdowns/filters
 */
export function getAllCategories(): Array<{
  value: CategoryType
  label: string
  emoji: string
}> {
  return Object.entries(CATEGORIES).map(([key, config]) => ({
    value: key as CategoryType,
    label: config.label,
    emoji: config.emoji,
  }))
}

/**
 * CategoryDot - Small colored dot for chart legends
 */
interface CategoryDotProps {
  category: CategoryType | string
  size?: "sm" | "md" | "lg"
  className?: string
}

export function CategoryDot({ category, size = "md", className }: CategoryDotProps) {
  const config = getCategoryConfig(category)

  const sizeClasses = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4",
  }

  return (
    <span
      className={cn(
        "rounded-full inline-block flex-shrink-0",
        sizeClasses[size],
        className
      )}
      style={{ backgroundColor: config.chartColor }}
    />
  )
}

/**
 * CategoryLabel - Category name with dot (for legends)
 */
interface CategoryLabelProps {
  category: CategoryType | string
  showDot?: boolean
  showEmoji?: boolean
  className?: string
}

export function CategoryLabel({
  category,
  showDot = true,
  showEmoji = false,
  className,
}: CategoryLabelProps) {
  const config = getCategoryConfig(category)

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {showDot && <CategoryDot category={category} size="sm" />}
      {showEmoji && <span>{config.emoji}</span>}
      <span className="text-sm">{config.label}</span>
    </span>
  )
}

export default CategoryBadge
