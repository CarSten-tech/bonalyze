'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { formatCents } from '@/lib/settlement-utils'
import { ArrowRight, Check } from 'lucide-react'
import type { Transfer } from '@/types/settlement'

interface TransferCardProps {
  transfers: Transfer[]
  isLoading?: boolean
  editable?: boolean
  paymentAmounts?: Record<string, number>
  onPaymentChange?: (transfer: Transfer, index: number, paidAmount: number) => void
}

function transferKey(transfer: Transfer, index: number): string {
  return `${transfer.fromUserId}:${transfer.toUserId}:${transfer.amount}:${index}`
}

export function TransferCard({
  transfers,
  isLoading = false,
  editable = false,
  paymentAmounts = {},
  onPaymentChange,
}: TransferCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </CardContent>
      </Card>
    )
  }

  // No transfers needed - all balanced
  if (transfers.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Ausgleich</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 text-green-800">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <Check className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">Alles ausgeglichen!</p>
              <p className="text-sm text-green-600">
                Keine Ueberweisungen notwendig
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">
          {transfers.length === 1
            ? '1 Ueberweisung noetig'
            : `${transfers.length} Ueberweisungen noetig`}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {transfers.map((transfer, index) => (
          <TransferItem
            key={index}
            transfer={transfer}
            editable={editable}
            paidAmount={paymentAmounts[transferKey(transfer, index)]}
            onPaymentChange={(paidAmount) => onPaymentChange?.(transfer, index, paidAmount)}
          />
        ))}
      </CardContent>
    </Card>
  )
}

interface TransferItemProps {
  transfer: Transfer
  editable: boolean
  paidAmount?: number
  onPaymentChange?: (paidAmount: number) => void
}

function TransferItem({
  transfer,
  editable,
  paidAmount,
  onPaymentChange,
}: TransferItemProps) {
  const fromInitials = transfer.fromDisplayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const toInitials = transfer.toDisplayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const normalizedPaid = Math.max(
    0,
    Math.min(transfer.amount, typeof paidAmount === 'number' ? paidAmount : transfer.paidAmount ?? transfer.amount)
  )
  const remaining = Math.max(0, transfer.amount - normalizedPaid)

  return (
    <div className="space-y-2 rounded-lg bg-muted/50 p-3">
      <div className="flex items-center gap-3">
      {/* From Person */}
      <div className="flex items-center gap-2 min-w-0">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-red-100 text-red-800 text-xs font-medium">
            {fromInitials}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium truncate">
          {transfer.fromDisplayName}
        </span>
      </div>

      {/* Arrow and Amount */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-bold text-primary">
          {formatCents(transfer.amount)}
        </span>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* To Person */}
      <div className="flex items-center gap-2 min-w-0">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-green-100 text-green-800 text-xs font-medium">
            {toInitials}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium truncate">
          {transfer.toDisplayName}
        </span>
      </div>
      </div>
      {editable && (
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            {remaining > 0 ? `Rest: ${formatCents(remaining)}` : 'Komplett bezahlt'}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Bezahlt</span>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              max={transfer.amount / 100}
              step="0.01"
              className="h-8 w-28 text-right"
              value={(normalizedPaid / 100).toFixed(2)}
              onChange={(event) => {
                const next = Number.parseFloat(event.target.value.replace(',', '.'))
                if (Number.isNaN(next)) {
                  onPaymentChange?.(0)
                  return
                }
                onPaymentChange?.(Math.round(next * 100))
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Compact transfer display for history cards
 */
interface TransferSummaryProps {
  transfers: Transfer[]
}

export function TransferSummary({ transfers }: TransferSummaryProps) {
  if (transfers.length === 0) {
    return <span className="text-green-600">Ausgeglichen</span>
  }

  return (
    <div className="space-y-1 text-sm">
      {transfers.map((transfer, index) => (
        <div key={index} className="flex items-center gap-1">
          <span className="truncate">{transfer.fromDisplayName}</span>
          <ArrowRight className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
          <span className="truncate">{transfer.toDisplayName}:</span>
          <span className="font-medium flex-shrink-0">
            {formatCents(transfer.amount)}
          </span>
        </div>
      ))}
    </div>
  )
}
