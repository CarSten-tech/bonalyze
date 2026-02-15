'use client'

import { format, differenceInMonths, differenceInDays, parseISO, addMonths } from 'date-fns'
import { de } from 'date-fns/locale'
import { Shield, ShieldAlert, Timer, ChevronRight, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

export interface WarrantyItem {
  id: string
  product_name: string
  warranty_end_date: string
  purchase_date: string
  is_ai_detected?: boolean
  merchant_name?: string
  image_url?: string | null // Receipt image as fallback
}

interface WarrantyCardProps {
  item: WarrantyItem
}

export function WarrantyCard({ item }: WarrantyCardProps) {
  const endDate = parseISO(item.warranty_end_date)
  const purchaseDate = parseISO(item.purchase_date)
  const now = new Date()

  // Time calculations
  const totalMonths = differenceInMonths(endDate, purchaseDate) || 24
  const monthsLeft = differenceInMonths(endDate, now)
  const daysLeft = differenceInDays(endDate, now)
  
  // Calculate percentage
  // If total is 24 months, and 12 left -> 50% remaining -> 50% filled logic reversed?
  // Usually progress bar shows "Time Passed". 
  // Design shows "75% VERBLEIBEND" with a green bar.
  // So bar length should represent Remaining % or Elapsed %?
  // Let's assume bar represents "Health" (Remaining).
  const percentRemaining = Math.max(0, Math.min(100, (daysLeft / (totalMonths * 30)) * 100))
  
  const isExpiringSoon = daysLeft <= 30
  const isExpired = daysLeft < 0

  return (
    <Link href={`/dashboard/warranties/${item.id}`} className="block mb-4">
      <Card className="shadow-none border-0 bg-card shadow-elevation-1 rounded-2xl overflow-hidden hover:shadow-elevation-2 transition-shadow">
        <CardContent className="p-4">
          {/* Top Section: Info & Image */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1 flex flex-col gap-2 pr-4 min-w-0">
              {item.is_ai_detected && (
                <div>
                   <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-0 h-6 px-2.5 text-[10px] font-semibold tracking-wider uppercase">
                    KI-ERKANNT
                  </Badge>
                </div>
              )}
              <div>
                <h3 className="text-lg font-bold text-foreground leading-tight">
                  {item.product_name}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Kaufdatum: {format(purchaseDate, 'dd.MM.yyyy')} • {item.merchant_name || 'Unbekannt'}
                </p>
              </div>
            </div>

            {/* Thumbnail */}
            <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden border border-border">
               {item.image_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover opacity-80" />
               ) : (
                  <Shield className="w-8 h-8 text-muted-foreground" />
               )}
            </div>
          </div>

          {/* Status Bar */}
          <div className="space-y-2 mb-4 mt-6">
            <div className="flex justify-between items-center text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              <span>Garantie-Status</span>
              <span className={isExpiringSoon ? "text-destructive" : "text-primary"}>
                {isExpired ? 'ABGELAUFEN' : `${Math.round(percentRemaining)}% Verbleibend`}
              </span>
            </div>
            <Progress 
              value={percentRemaining} 
              className="h-2 bg-muted" 
              indicatorClassName={cn(
                "transition-all duration-500",
                isExpiringSoon ? "bg-destructive" : "bg-primary" // Green/Blue for safe, Red for danger
              )} 
            />
          </div>

          {/* Action / Badge */}
          {isExpired ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground shadow-sm border border-border/50">
               <ShieldAlert className="w-3.5 h-3.5" />
               <span className="text-sm font-semibold">Garantie abgelaufen</span>
            </div>
          ) : isExpiringSoon ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-destructive shadow-sm border border-red-100">
               <span className="text-sm font-semibold">Läuft in {daysLeft} Tagen ab</span>
               <AlertTriangle className="w-3.5 h-3.5 fill-destructive" />
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-foreground shadow-sm border border-border/50">
               <span className="text-sm font-semibold">Noch {monthsLeft} Monate</span>
               <Timer className="w-3.5 h-3.5 text-primary" />
            </div>
          )}

        </CardContent>
      </Card>
    </Link>
  )
}
