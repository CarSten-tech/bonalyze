'use client'

import Link from 'next/link'
import { ShoppingCart, User } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface ReceiptCardProps {
  id: string
  merchantName: string
  date: string
  totalAmountCents: number
  itemCount: number
  paidByName: string
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  })
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function ReceiptCard({
  id,
  merchantName,
  date,
  totalAmountCents,
  itemCount,
  paidByName,
}: ReceiptCardProps) {
  return (
    <Link href={`/dashboard/receipts/${id}`}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{merchantName || 'Unbekannter Store'}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{formatDate(date)}</span>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Avatar className="h-4 w-4">
                      <AvatarFallback className="text-[10px]">
                        {getInitials(paidByName)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{paidByName}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {itemCount} {itemCount === 1 ? 'Produkt' : 'Produkte'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold text-lg">{formatCurrency(totalAmountCents)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
