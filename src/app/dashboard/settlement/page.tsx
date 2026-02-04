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

  // Handle marking as settled
  const handleMarkAsSettled = async () => {
    const success = await markAsSettled()
    setShowConfirmDialog(false)

    if (success) {
      toast.success('Abrechnung gespeichert', {
        description: `Die Abrechnung für ${selectedMonth.label} wurde als erledigt markiert.`,
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
            Bitte waehle einen Haushalt aus.
          </p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <Header selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
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
        <Header selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
        <SettlementEmptyState variant="no_receipts" periodLabel={selectedMonth.label} />
      </div>
    )
  }

  // Single member check
  if (settlement.memberCount < 2) {
    return (
      <div className="space-y-6">
        <Header selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
        <SettlementEmptyState variant="single_member" />
      </div>
    )
  }

  // No receipts in period
  if (settlement.receiptCount === 0) {
    return (
      <div className="space-y-6">
        <Header selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
        <SettlementEmptyState variant="no_receipts" periodLabel={selectedMonth.label} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with month selector */}
      <Header selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />

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
        <TransferCard transfers={settlement.transfers} />
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
              disabled={isMarkingSettled || settlement.transfers.length === 0}
            >
              {isMarkingSettled ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Wird gespeichert...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Als erledigt markieren
                </>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Abrechnung abschliessen?</AlertDialogTitle>
              <AlertDialogDescription>
                Damit bestätigst du, dass alle Überweisungen für{' '}
                {selectedMonth.label} durchgefuehrt wurden. Diese Abrechnung
                wird in der Historie gespeichert.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction onClick={handleMarkAsSettled}>
                Ja, abschliessen
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
