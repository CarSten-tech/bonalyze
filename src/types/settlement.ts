/**
 * Settlement Types
 *
 * Types for household expense settlement calculations
 */

/**
 * A person's balance in the settlement
 */
export interface PersonBalance {
  userId: string
  displayName: string
  avatarUrl: string | null
  paid: number // Amount paid in cents
  fairShare: number // Amount they should have paid in cents
  balance: number // paid - fairShare (positive = owes less/credit, negative = owes more/debt)
}

/**
 * A transfer between two people
 */
export interface Transfer {
  fromUserId: string
  fromDisplayName: string
  toUserId: string
  toDisplayName: string
  amount: number // Amount to transfer in cents
}

/**
 * Result of settlement calculation
 */
export interface SettlementResult {
  period: {
    start: string // ISO date string
    end: string // ISO date string
    label: string
  }
  totalSpent: number // Total amount spent in cents
  fairShare: number // Fair share per person in cents
  memberCount: number
  personBalances: PersonBalance[]
  transfers: Transfer[]
  receiptCount: number
}

/**
 * A receipt with payer information for settlement
 */
export interface SettlementReceipt {
  id: string
  date: string
  totalAmountCents: number
  merchantName: string | null
  paidByUserId: string
  paidByDisplayName: string
}

/**
 * Receipts grouped by person who paid
 */
export interface ReceiptsByPerson {
  userId: string
  displayName: string
  avatarUrl: string | null
  totalPaid: number // in cents
  receipts: SettlementReceipt[]
}

/**
 * A settlement record stored in the database
 */
export interface Settlement {
  id: string
  householdId: string
  periodStart: string
  periodEnd: string
  totalAmountCents: number
  settledAt: string | null // null = open
  createdAt: string
}

/**
 * A settlement transfer record stored in the database
 */
export interface SettlementTransfer {
  id: string
  settlementId: string
  fromUserId: string
  toUserId: string
  amountCents: number
}

/**
 * Settlement with computed display data
 */
export interface SettlementWithDetails extends Settlement {
  periodLabel: string
  transferSummary: string
  isSettled: boolean
}

/**
 * Month option for the period selector
 */
export interface MonthOption {
  value: string // Format: 'YYYY-MM'
  label: string // Format: 'Januar 2025'
  start: string // ISO date string
  end: string // ISO date string
}
