/**
 * Settlement Calculation Utilities
 *
 * Functions for calculating household expense settlements,
 * including fair share computation and minimal transfer optimization.
 */

import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  parseISO,
} from 'date-fns'
import { de } from 'date-fns/locale'
import type {
  PersonBalance,
  Transfer,
  SettlementResult,
  MonthOption,
} from '@/types/settlement'

/**
 * Member data needed for settlement calculation
 */
interface MemberData {
  userId: string
  displayName: string
  avatarUrl: string | null
}

/**
 * Receipt data needed for settlement calculation
 */
interface ReceiptData {
  id: string
  totalAmountCents: number
  paidByUserId: string
}

/**
 * Calculate settlement result from receipts and members
 */
export function calculateSettlement(
  receipts: ReceiptData[],
  members: MemberData[],
  periodStart: string,
  periodEnd: string,
  periodLabel: string
): SettlementResult {
  // Calculate total spent
  const totalSpent = receipts.reduce((sum, r) => sum + r.totalAmountCents, 0)

  // Calculate fair share per person
  const memberCount = members.length
  const fairShare = memberCount > 0 ? Math.round(totalSpent / memberCount) : 0

  // Calculate each person's balance
  const personBalances: PersonBalance[] = members.map((member) => {
    const paid = receipts
      .filter((r) => r.paidByUserId === member.userId)
      .reduce((sum, r) => sum + r.totalAmountCents, 0)

    return {
      userId: member.userId,
      displayName: member.displayName,
      avatarUrl: member.avatarUrl,
      paid,
      fairShare,
      balance: paid - fairShare,
    }
  })

  // Calculate minimal transfers
  const transfers = calculateMinimalTransfers(personBalances)

  return {
    period: {
      start: periodStart,
      end: periodEnd,
      label: periodLabel,
    },
    totalSpent,
    fairShare,
    memberCount,
    personBalances,
    transfers,
    receiptCount: receipts.length,
  }
}

/**
 * Calculate minimal number of transfers to settle all balances
 *
 * Uses a greedy algorithm:
 * 1. Find person with highest debt (most negative balance)
 * 2. Find person with highest credit (most positive balance)
 * 3. Transfer the minimum of the two amounts
 * 4. Repeat until all balances are zero
 *
 * This produces optimal results for 2 people and near-optimal for more.
 */
export function calculateMinimalTransfers(
  personBalances: PersonBalance[]
): Transfer[] {
  // Create working copy with mutable balances
  const balances = personBalances.map((p) => ({
    ...p,
    workingBalance: p.balance,
  }))

  const transfers: Transfer[] = []
  const EPSILON = 1 // 1 cent tolerance for rounding errors

  // Continue until all balances are settled
  let iterations = 0
  const maxIterations = balances.length * balances.length // Safety limit

  while (iterations < maxIterations) {
    iterations++

    // Find person who owes the most (most negative balance)
    const debtor = balances
      .filter((p) => p.workingBalance < -EPSILON)
      .sort((a, b) => a.workingBalance - b.workingBalance)[0]

    // Find person who is owed the most (most positive balance)
    const creditor = balances
      .filter((p) => p.workingBalance > EPSILON)
      .sort((a, b) => b.workingBalance - a.workingBalance)[0]

    // If no debtor or creditor found, we're done
    if (!debtor || !creditor) {
      break
    }

    // Calculate transfer amount (minimum of debt and credit)
    const transferAmount = Math.min(
      Math.abs(debtor.workingBalance),
      creditor.workingBalance
    )

    // Create transfer
    transfers.push({
      fromUserId: debtor.userId,
      fromDisplayName: debtor.displayName,
      toUserId: creditor.userId,
      toDisplayName: creditor.displayName,
      amount: Math.round(transferAmount),
    })

    // Update working balances
    debtor.workingBalance += transferAmount
    creditor.workingBalance -= transferAmount
  }

  return transfers
}

/**
 * Format amount in cents to Euro display string
 */
export function formatCents(cents: number): string {
  const euros = cents / 100
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(euros)
}

/**
 * Format amount in cents to Euro display string without currency symbol
 */
export function formatCentsValue(cents: number): string {
  const euros = cents / 100
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(euros)
}

/**
 * Generate list of available months for settlement period selector
 *
 * Returns the current month and the previous 11 months (1 year total)
 */
export function getAvailableMonths(count: number = 12): MonthOption[] {
  const now = new Date()
  const months: MonthOption[] = []

  for (let i = 0; i < count; i++) {
    const date = subMonths(now, i)
    const start = startOfMonth(date)
    const end = endOfMonth(date)

    months.push({
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy', { locale: de }),
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd'),
    })
  }

  return months
}

/**
 * Get month option for a specific date
 */
export function getMonthOption(date: Date): MonthOption {
  const start = startOfMonth(date)
  const end = endOfMonth(date)

  return {
    value: format(date, 'yyyy-MM'),
    label: format(date, 'MMMM yyyy', { locale: de }),
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd'),
  }
}

/**
 * Get current month option
 */
export function getCurrentMonth(): MonthOption {
  return getMonthOption(new Date())
}

/**
 * Parse month value (YYYY-MM) to MonthOption
 */
export function parseMonthValue(value: string): MonthOption | null {
  try {
    const date = parseISO(`${value}-01`)
    if (isNaN(date.getTime())) return null
    return getMonthOption(date)
  } catch {
    return null
  }
}

/**
 * Format a period range for display
 */
export function formatPeriodRange(start: string, end: string): string {
  const startDate = parseISO(start)
  const endDate = parseISO(end)

  const startFormatted = format(startDate, 'dd.MM.yyyy')
  const endFormatted = format(endDate, 'dd.MM.yyyy')

  return `${startFormatted} - ${endFormatted}`
}

/**
 * Create a summary string for transfers
 * e.g., "Anna -> Max: 188,34 EUR"
 */
export function createTransferSummary(transfers: Transfer[]): string {
  if (transfers.length === 0) {
    return 'Ausgeglichen'
  }

  return transfers
    .map(
      (t) =>
        `${t.fromDisplayName} -> ${t.toDisplayName}: ${formatCents(t.amount)}`
    )
    .join(', ')
}
