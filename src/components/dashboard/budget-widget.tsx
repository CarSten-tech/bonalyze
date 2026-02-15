"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle, TrendingUp, Wallet, CheckCircle2 } from "lucide-react"
import { format, differenceInDays } from "date-fns"
import { de } from "date-fns/locale"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getBudgetStatus } from "@/app/actions/budget"
import { useHousehold } from "@/contexts/household-context"
import { formatCurrency } from "@/components/common/currency"
import { cn } from "@/lib/utils"

export interface BudgetStatus {
  budget: {
    id: string
    period_type: string
    total_amount_cents: number
    category_budgets: { category: string; amount_cents: number }[]
  }
  period: {
    start: Date
    end: Date
  }
  usedAmount: number
  categoryUsage: Record<string, number>
}

interface BudgetWidgetProps {
  budgetStatus: BudgetStatus | null
  isLoading?: boolean
}

export function BudgetWidget({ budgetStatus, isLoading = false }: BudgetWidgetProps) {
  if (isLoading) {
    return (
      <Card className="rounded-xl shadow-sm border-0 bg-card h-full">
        <CardContent className="p-5 space-y-4">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-2 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!budgetStatus) {
    return (
        <Card className="rounded-xl shadow-sm border-0 bg-card h-full relative overflow-hidden group">
            <CardContent className="p-5 flex flex-col justify-center items-center h-full text-center space-y-3">
                <div className="bg-muted p-3 rounded-full group-hover:bg-muted/80 transition-colors">
                    <Wallet className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Kein Budget</p>
                    <p className="text-xs text-muted-foreground">
                        Erstelle ein Budget für mehr Übersicht.
                    </p>
                </div>
                <Button variant="outline" size="sm" className="h-8 text-xs w-full" asChild>
                    <Link href="/settings/budget">
                        Budget erstellen
                    </Link>
                </Button>
            </CardContent>
        </Card>
    )
  }

  const { budget, period, usedAmount } = budgetStatus
  const totalAmount = budget.total_amount_cents
  
  // Logic: Show Remaining vs Used
  const remainingAmount = totalAmount - usedAmount
  const percentageUsed = Math.min(Math.round((usedAmount / totalAmount) * 100), 100)
  
  // Calculate Daily Budget (Left / Days Remaining)
  const today = new Date()
  const daysInPeriod = differenceInDays(period.end, period.start) + 1
  const daysPassed = Math.max(0, differenceInDays(today, period.start))
  const daysRemaining = Math.max(1, differenceInDays(period.end, today) + 1) // +1 because today counts
  
  const dailyBudgetLeft = Math.max(0, remainingAmount / daysRemaining)

  // Color logic - Inverted safety (Green = Low usage, Red = High usage)
  let progressBarColor = "bg-emerald-500" // Safe
  let amountColor = "text-emerald-600"
  
  if (percentageUsed >= 100) {
    progressBarColor = "bg-destructive"
    amountColor = "text-destructive"
  } else if (percentageUsed >= 85) {
    progressBarColor = "bg-orange-500" 
    amountColor = "text-orange-600"
  } else if (percentageUsed >= 60) {
    progressBarColor = "bg-blue-500"
    amountColor = "text-blue-600"
  }

  // Format currency without symbol for custom layout
  const formatValue = (amount: number) => 
    new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount / 100)

  return (
    <Card className="rounded-xl shadow-sm border-0 bg-card h-full relative overflow-hidden">
      <CardContent className="p-5 flex flex-col justify-between h-full min-h-[140px]">
         <div className="space-y-2 relative z-10">
            <div className="flex justify-between items-start">
                <h3 className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Verfügbar {format(period.start, "MMMM", { locale: de })}
                </h3>
                {percentageUsed >= 100 && (
                    <AlertTriangle className="h-4 w-4 text-destructive animate-pulse" />
                )}
            </div>
            
            {/* Main Value: Remaining Amount */}
            <div className="flex items-baseline gap-1">
               <span className={cn("text-3xl font-bold tabular-nums tracking-tight", amountColor)}>
                 {formatValue(remainingAmount)}
               </span>
               <span className={cn("text-sm font-medium", amountColor)}>
                 EUR
               </span>
            </div>
         </div>

         <div className="pt-4 space-y-2 relative z-10">
            {/* Daily Budget Info */}
            <div className="flex justify-between items-end">
                 <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground font-medium uppercase">Tagesbudget (Rest)</span>
                    <span className="text-xs font-semibold text-foreground">
                        ~{formatValue(dailyBudgetLeft)} EUR
                    </span>
                 </div>
                 <div className="flex flex-col items-end">
                    <span className="text-[10px] text-muted-foreground font-medium uppercase">Genutzt</span>
                    <span className="text-xs font-medium text-muted-foreground">
                        {percentageUsed}%
                    </span>
                 </div>
            </div>

            {/* Progress Bar */}
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div 
                    className={cn("h-full transition-all duration-500", progressBarColor)} 
                    style={{ width: `${percentageUsed}%` }}
                />
            </div>
         </div>
      </CardContent>
    </Card>
  )
}
