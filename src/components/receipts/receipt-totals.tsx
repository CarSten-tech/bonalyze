'use client'

import * as React from 'react'
import { AlertTriangle } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'

interface ReceiptTotalsProps {
  calculatedTotalCents: number
  aiTotalCents?: number | null
  className?: string
}

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  })
}

const TOLERANCE_CENTS = 10 // 10 cents tolerance for rounding differences

export function ReceiptTotals({
  calculatedTotalCents,
  aiTotalCents,
  className,
}: ReceiptTotalsProps) {
  const hasMismatch =
    aiTotalCents !== null &&
    aiTotalCents !== undefined &&
    Math.abs(calculatedTotalCents - aiTotalCents) > TOLERANCE_CENTS

  return (
    <div className={cn('space-y-3', className)}>
      {/* Mismatch Warning */}
      {hasMismatch && (
        <Alert variant="default" className="border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-700 dark:text-yellow-300">
            <span className="font-medium">Summe weicht ab:</span>{' '}
            Berechnete Summe ({formatCurrency(calculatedTotalCents)}) unterscheidet sich von der
            erkannten Summe ({formatCurrency(aiTotalCents!)}).
          </AlertDescription>
        </Alert>
      )}

      <Separator />

      {/* Subtotal if AI total exists */}
      {aiTotalCents !== null && aiTotalCents !== undefined && (
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span>Erkannte Summe (KI)</span>
          <span className={cn(hasMismatch && 'line-through')}>
            {formatCurrency(aiTotalCents)}
          </span>
        </div>
      )}

      {/* Calculated Total */}
      <div className="flex justify-between items-center">
        <span className="text-lg font-medium">Gesamtsumme</span>
        <span className="text-2xl font-bold">{formatCurrency(calculatedTotalCents)}</span>
      </div>
    </div>
  )
}
