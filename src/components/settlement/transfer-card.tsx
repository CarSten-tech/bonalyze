'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCents } from '@/lib/settlement-utils'
import { ArrowRight, Check } from 'lucide-react'
import type { Transfer } from '@/types/settlement'

interface TransferCardProps {
  transfers: Transfer[]
  isLoading?: boolean
}

export function TransferCard({ transfers, isLoading = false }: TransferCardProps) {
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
          <TransferItem key={index} transfer={transfer} />
        ))}
      </CardContent>
    </Card>
  )
}

interface TransferItemProps {
  transfer: Transfer
}

function TransferItem({ transfer }: TransferItemProps) {
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

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
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
