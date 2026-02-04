'use client'

import * as React from 'react'
import { Trash2, AlertTriangle, GripVertical } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { CategorySelector } from './category-selector'

export interface ReceiptItemDraft {
  id: string
  productName: string
  quantity: number
  priceCents: number
  confidence?: number
  category?: string
  subcategory?: string
}

interface ReceiptItemCardProps {
  item: ReceiptItemDraft
  index: number
  onUpdate: (id: string, field: keyof ReceiptItemDraft, value: string | number) => void
  onDelete: (id: string) => void
  canDelete: boolean
  className?: string
}

// Helper functions for price formatting
function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  })
}

function formatPriceForInput(cents: number): string {
  if (cents === 0) return ''
  return (cents / 100).toFixed(2).replace('.', ',')
}

function parsePriceInput(value: string): number {
  const cleaned = value.replace(',', '.')
  const parsed = parseFloat(cleaned)
  if (isNaN(parsed)) return 0
  return Math.round(parsed * 100)
}

const LOW_CONFIDENCE_THRESHOLD = 0.7

export function ReceiptItemCard({
  item,
  index,
  onUpdate,
  onDelete,
  canDelete,
  className,
}: ReceiptItemCardProps) {
  const isLowConfidence = item.confidence !== undefined && item.confidence < LOW_CONFIDENCE_THRESHOLD
  const isNegativePrice = item.priceCents < 0
  const totalCents = item.priceCents * item.quantity

  const handlePriceChange = (value: string) => {
    // Allow negative values for discounts
    const isNegative = value.startsWith('-')
    const cleanValue = value.replace('-', '')
    const cents = parsePriceInput(cleanValue)
    onUpdate(item.id, 'priceCents', isNegative ? -cents : cents)
  }

  const handleQuantityChange = (value: string) => {
    const qty = parseInt(value) || 1
    onUpdate(item.id, 'quantity', Math.max(1, qty))
  }

  return (
    <div
      className={cn(
        'relative rounded-lg border bg-card p-4 transition-colors',
        isLowConfidence && 'border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20',
        className
      )}
    >
      {/* Low Confidence Warning */}
      {isLowConfidence && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-yellow-500 text-white">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Bitte pruefen - KI war unsicher ({Math.round((item.confidence || 0) * 100)}%)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Header with index and delete */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
          <span className="text-sm font-medium text-muted-foreground">
            Produkt {index + 1}
          </span>
          {isLowConfidence && (
            <span className="text-xs text-yellow-600 dark:text-yellow-400">
              (unsicher)
            </span>
          )}
        </div>
        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(item.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Product Name */}
      <div className="space-y-2 mb-3">
        <Label htmlFor={`product-name-${item.id}`} className="text-xs">
          Produktname
        </Label>
        <Input
          id={`product-name-${item.id}`}
          placeholder="z.B. Bio Vollmilch 1L"
          value={item.productName}
          onChange={(e) => onUpdate(item.id, 'productName', e.target.value)}
          className={cn(
            isLowConfidence && 'border-yellow-500/50 focus-visible:ring-yellow-500'
          )}
        />
      </div>

      {/* Category Selector */}
      <div className="mb-3">
        <Label className="text-xs mb-1.5 block">Kategorie</Label>
        <CategorySelector
          value={item.subcategory}
          onChange={(subcategory, category) => {
            onUpdate(item.id, 'subcategory', subcategory)
            onUpdate(item.id, 'category', category)
          }}
        />
      </div>

      {/* Quantity and Price */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="space-y-2">
          <Label htmlFor={`quantity-${item.id}`} className="text-xs">
            Menge
          </Label>
          <Input
            id={`quantity-${item.id}`}
            type="number"
            min="1"
            value={item.quantity}
            onChange={(e) => handleQuantityChange(e.target.value)}
            className="text-center"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`price-${item.id}`} className="text-xs">
            Einzelpreis (EUR)
          </Label>
          <Input
            id={`price-${item.id}`}
            placeholder="0,00"
            value={formatPriceForInput(item.priceCents)}
            onChange={(e) => handlePriceChange(e.target.value)}
            className={cn(
              'text-right',
              isNegativePrice && 'text-green-600 dark:text-green-400'
            )}
          />
        </div>
      </div>

      {/* Total for this item */}
      {(item.priceCents !== 0 || item.quantity > 1) && (
        <div
          className={cn(
            'text-right text-sm font-medium',
            isNegativePrice ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
          )}
        >
          {item.quantity > 1 && (
            <span className="text-muted-foreground mr-2">
              {item.quantity} x {formatCurrency(item.priceCents)} =
            </span>
          )}
          <span className={cn(isNegativePrice && 'text-green-600 dark:text-green-400')}>
            {formatCurrency(totalCents)}
          </span>
        </div>
      )}
    </div>
  )
}
