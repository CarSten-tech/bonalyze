"use client"

import { cn } from "@/lib/utils"

/**
 * Currency Component
 *
 * Per DESIGN-UX-BLUEPRINT.md Section 3 (Data Display Conventions):
 *
 * Money/Currency:
 * - 47,32 EUR    ← Standard display (comma decimal, EUR suffix)
 * - -3,50 EUR    ← Negative (discount/refund)
 * - +188,34 EUR  ← Positive balance (green)
 * - -188,34 EUR  ← Negative balance (red)
 *
 * - German locale: comma as decimal separator
 * - Always show EUR suffix (not EUR symbol alone)
 * - Use monospace or tabular figures for alignment
 */

interface CurrencyProps {
  /** Amount in cents (e.g., 4732 for 47,32 EUR) or as float (47.32) */
  amount: number
  /** Whether amount is in cents (default: false = float) */
  inCents?: boolean
  /** Show +/- sign and color for balance display */
  showSign?: boolean
  /** Show color (green for positive, red for negative) */
  colored?: boolean
  /** Currency code (default: EUR) */
  currency?: string
  /** Additional className */
  className?: string
  /** Size variant */
  size?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl"
}

export function Currency({
  amount,
  inCents = false,
  showSign = false,
  colored = false,
  currency = "EUR",
  className,
  size = "base",
}: CurrencyProps) {
  // Convert cents to euros if needed
  const amountInEuros = inCents ? amount / 100 : amount

  // Format number with German locale (comma as decimal separator)
  const formattedNumber = new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amountInEuros))

  // Determine sign
  const isPositive = amountInEuros > 0
  const isNegative = amountInEuros < 0
  const sign = showSign ? (isPositive ? "+" : isNegative ? "-" : "") : isNegative ? "-" : ""

  // Determine color
  const colorClass = colored
    ? isPositive
      ? "text-success"
      : isNegative
      ? "text-destructive"
      : "text-foreground"
    : ""

  // Size classes
  const sizeClasses = {
    xs: "text-xs",
    sm: "text-sm",
    base: "text-base",
    lg: "text-lg",
    xl: "text-xl font-semibold",
    "2xl": "text-2xl font-bold",
  }

  return (
    <span
      className={cn(
        "tabular-nums",
        sizeClasses[size],
        colorClass,
        className
      )}
    >
      {sign}
      {formattedNumber} {currency}
    </span>
  )
}

/**
 * Utility function to format currency (for non-React contexts)
 */
export function formatCurrency(
  amount: number,
  options?: {
    inCents?: boolean
    showSign?: boolean
    currency?: string
  }
): string {
  const { inCents = false, showSign = false, currency = "EUR" } = options || {}
  const amountInEuros = inCents ? amount / 100 : amount

  const formattedNumber = new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amountInEuros))

  const isPositive = amountInEuros > 0
  const isNegative = amountInEuros < 0
  const sign = showSign ? (isPositive ? "+" : isNegative ? "-" : "") : isNegative ? "-" : ""

  return `${sign}${formattedNumber} ${currency}`
}

/**
 * Compact currency display (e.g., for tight spaces)
 * Shows just the number with EUR, no extra formatting
 */
interface CompactCurrencyProps {
  amount: number
  inCents?: boolean
  className?: string
}

export function CompactCurrency({
  amount,
  inCents = false,
  className,
}: CompactCurrencyProps) {
  const amountInEuros = inCents ? amount / 100 : amount

  const formattedNumber = new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountInEuros)

  return (
    <span className={cn("tabular-nums", className)}>
      {formattedNumber} EUR
    </span>
  )
}

export default Currency
