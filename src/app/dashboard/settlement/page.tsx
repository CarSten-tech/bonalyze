'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2, History, CheckCircle2 } from 'lucide-react'

import { useHousehold } from '@/contexts/household-context'
import { useSettlement } from '@/hooks/use-settlement'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  SettlementOverviewCard,
  PersonBalanceCard,
  TransferCard,
  ReceiptDrillDownSheet,
  MonthSelector,
  SettlementEmptyState,
} from '@/components/settlement'
import { formatCents } from '@/lib/settlement-utils'
import type { Transfer } from '@/types/settlement'

function getTransferKey(transfer: Transfer, index: number): string {
  return `${transfer.fromUserId}:${transfer.toUserId}:${transfer.amount}:${index}`
}

export default function SettlementPage() {
  const { currentHousehold, isLoading: isHouseholdLoading } = useHousehold()
  const {
    settlement,
    receiptsByPerson,
    isLoading,
    error,
    selectedMonth,
    setSelectedMonth,
    markAsSettled,
    isMarkingSettled,
  } = useSettlement()

  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [transferPaymentOverrides, setTransferPaymentOverrides] = useState<Record<string, number>>({})

  const handleMonthChange = (month: { value: string; label: string; start: string; end: string }) => {
    setTransferPaymentOverrides({})
    setSelectedMonth(month)
  }

  const transfers = settlement?.transfers || []
  const totalTransferAmount = transfers.reduce((sum, transfer) => sum + transfer.amount, 0)
  const totalPaidAmount = transfers.reduce((sum, transfer, index) => {
    const key = getTransferKey(transfer, index)
    const paid = transferPaymentOverrides[key]
    const normalized = typeof paid === 'number' ? Math.max(0, Math.min(transfer.amount, paid)) : transfer.amount
    return sum + normalized
  }, 0)
  const remainingAmount = Math.max(0, totalTransferAmount - totalPaidAmount)

  // Handle marking as settled
  const handleMarkAsSettled = async () => {
    if (!settlement) return

    const payload = settlement.transfers.map((transfer, index) => {
      const key = getTransferKey(transfer, index)
      const paidAmount = Math.max(
        0,
        Math.min(transfer.amount, transferPaymentOverrides[key] ?? transfer.amount)
      )
      return {
        ...transfer,
        paidAmount,
      }
    })

    const success = await markAsSettled(payload)
    setShowConfirmDialog(false)

    if (success) {
      const statusLabel = remainingAmount === 0 ? 'als erledigt gespeichert' : 'als offen gespeichert'
      toast.success('Abrechnung gespeichert', {
        description: `Die Abrechnung für ${selectedMonth.label} wurde ${statusLabel}.`,
      })
    } else {
      toast.error('Fehler', {
        description: 'Die Abrechnung konnte nicht gespeichert werden.',
      })
    }
  }

  // Loading state
  if (isHouseholdLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // No household
  if (!currentHousehold) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Abrechnung</h1>
          <p className="text-muted-foreground mt-1">
            Bitte wähle einen Haushalt aus.
          </p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <Header selectedMonth={selectedMonth} onMonthChange={handleMonthChange} />
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive">
          <p>{error}</p>
        </div>
      </div>
    )
  }

  // No settlement data
  if (!settlement) {
    return (
      <div className="space-y-6">
        <Header selectedMonth={selectedMonth} onMonthChange={handleMonthChange} />
        <SettlementEmptyState variant="no_receipts" periodLabel={selectedMonth.label} />
      </div>
    )
  }

  // Single member check
  if (settlement.memberCount < 2) {
    return (
      <div className="space-y-6">
        <Header selectedMonth={selectedMonth} onMonthChange={handleMonthChange} />
        <SettlementEmptyState variant="single_member" />
      </div>
    )
  }

  // No receipts in period
  if (settlement.receiptCount === 0) {
    return (
      <div className="space-y-6">
        <Header selectedMonth={selectedMonth} onMonthChange={handleMonthChange} />
        <SettlementEmptyState variant="no_receipts" periodLabel={selectedMonth.label} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with month selector */}
      <Header selectedMonth={selectedMonth} onMonthChange={handleMonthChange} />

      {/* Overview Card */}
      <SettlementOverviewCard
        totalSpent={settlement.totalSpent}
        fairShare={settlement.fairShare}
        memberCount={settlement.memberCount}
        receiptCount={settlement.receiptCount}
        periodLabel={settlement.period.label}
      />

      {/* Person Balances Section */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Wer hat bezahlt</h2>
        <div className="space-y-3">
          {settlement.personBalances.map((person) => (
            <PersonBalanceCard key={person.userId} person={person} />
          ))}
        </div>
      </section>

      <Separator />

      {/* Transfers Section */}
      <section>
        <TransferCard
          transfers={settlement.transfers}
          editable={settlement.transfers.length > 0}
          paymentAmounts={transferPaymentOverrides}
          onPaymentChange={(transfer, index, paidAmount) => {
            setTransferPaymentOverrides((prev) => ({
              ...prev,
              [getTransferKey(transfer, index)]: paidAmount,
            }))
          }}
        />
      </section>

      <Separator />

      {/* Actions */}
      <section className="space-y-3">
        {/* Mark as Settled Button */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogTrigger asChild>
            <Button
              className="w-full"
              size="lg"
              disabled={isMarkingSettled}
            >
              {isMarkingSettled ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Wird gespeichert...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {remainingAmount === 0
                    ? 'Als erledigt speichern'
                    : `Offen speichern (${formatCents(remainingAmount)} Rest)`}
                </>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Abrechnung abschließen?</AlertDialogTitle>
              <AlertDialogDescription>
                {remainingAmount === 0
                  ? `Damit bestätigst du, dass alle Überweisungen für ${selectedMonth.label} durchgeführt wurden.`
                  : `Es bleiben ${formatCents(remainingAmount)} offen. Der Rest wird als Carry-over in der Historie geführt.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction onClick={handleMarkAsSettled}>
                Ja, abschließen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Receipt Drill-Down */}
        <ReceiptDrillDownSheet
          receiptsByPerson={receiptsByPerson}
          totalAmount={settlement.totalSpent}
          periodLabel={settlement.period.label}
        />

        {/* Link to History */}
        <Button variant="ghost" className="w-full" asChild>
          <Link href="/dashboard/settlement/history">
            <History className="h-4 w-4 mr-2" />
            Vergangene Abrechnungen
          </Link>
        </Button>
      </section>
    </div>
  )
}

// Header Component
interface HeaderProps {
  selectedMonth: { value: string; label: string; start: string; end: string }
  onMonthChange: (month: { value: string; label: string; start: string; end: string }) => void
}

function Header({ selectedMonth, onMonthChange }: HeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold">Abrechnung</h1>
        <p className="text-muted-foreground mt-1">
          Wer schuldet wem wieviel?
        </p>
      </div>
      <MonthSelector
        value={selectedMonth.value}
        onChange={onMonthChange}
        className="w-full sm:w-48"
      />
    </div>
  )
}
