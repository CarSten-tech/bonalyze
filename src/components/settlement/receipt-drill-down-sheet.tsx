'use client'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCents } from '@/lib/settlement-utils'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { Receipt, ChevronRight, Store } from 'lucide-react'
import type { ReceiptsByPerson, SettlementReceipt } from '@/types/settlement'

interface ReceiptDrillDownSheetProps {
  receiptsByPerson: ReceiptsByPerson[]
  totalAmount: number
  periodLabel: string
  isLoading?: boolean
  children?: React.ReactNode
}

export function ReceiptDrillDownSheet({
  receiptsByPerson,
  totalAmount,
  periodLabel,
  isLoading = false,
  children,
}: ReceiptDrillDownSheetProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        {children || (
          <Button variant="outline" className="w-full">
            <Receipt className="h-4 w-4 mr-2" />
            Kassenbons anzeigen
            <ChevronRight className="h-4 w-4 ml-auto" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-xl">
        <SheetHeader className="text-left">
          <SheetTitle>Kassenbons - {periodLabel}</SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-4 mt-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : receiptsByPerson.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Keine Kassenbons in diesem Zeitraum
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[calc(85vh-8rem)] mt-4">
            <div className="space-y-6 pb-8">
              {/* Summary */}
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Gesamt</p>
                <p className="text-2xl font-bold">{formatCents(totalAmount)}</p>
              </div>

              {/* Grouped by Person */}
              {receiptsByPerson.map((personGroup) => (
                <PersonReceiptGroup
                  key={personGroup.userId}
                  group={personGroup}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  )
}

interface PersonReceiptGroupProps {
  group: ReceiptsByPerson
}

function PersonReceiptGroup({ group }: PersonReceiptGroupProps) {
  const initials = group.displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div>
      {/* Person Header */}
      <div className="flex items-center gap-3 mb-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-medium">{group.displayName}</p>
          <p className="text-sm text-muted-foreground">
            {group.receipts.length}{' '}
            {group.receipts.length === 1 ? 'Kassenbon' : 'Kassenbons'}
          </p>
        </div>
        <div className="text-right">
          <p className="font-semibold">{formatCents(group.totalPaid)}</p>
        </div>
      </div>

      {/* Receipt List */}
      <div className="space-y-2 pl-11">
        {group.receipts.map((receipt) => (
          <ReceiptItem key={receipt.id} receipt={receipt} />
        ))}
      </div>
    </div>
  )
}

interface ReceiptItemProps {
  receipt: SettlementReceipt
}

function ReceiptItem({ receipt }: ReceiptItemProps) {
  const dateFormatted = format(parseISO(receipt.date), 'dd.MM.yyyy', {
    locale: de,
  })

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-background border">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
        <Store className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {receipt.merchantName || 'Unbekannter Laden'}
        </p>
        <p className="text-xs text-muted-foreground">{dateFormatted}</p>
      </div>
      <p className="text-sm font-semibold">
        {formatCents(receipt.totalAmountCents)}
      </p>
    </div>
  )
}
