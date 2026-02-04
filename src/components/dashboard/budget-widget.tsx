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

interface BudgetStatus {
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
  currentDate?: Date
}

export function BudgetWidget({ currentDate = new Date() }: BudgetWidgetProps) {
  const { currentHousehold } = useHousehold()
  const [status, setStatus] = useState<BudgetStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadBudget() {
      if (!currentHousehold) return
      setIsLoading(true) // Ensure loading state is reset when date changes
      try {
        const data = await getBudgetStatus(currentHousehold.id, currentDate)
        if (data) {
          setStatus({
            ...data,
            period: {
              start: new Date(data.period.start),
              end: new Date(data.period.end)
            }
          })
        }
      } catch (error) {
        console.error("Failed to load budget status:", error)
      } finally {
        setIsLoading(false)
      }
    }
    loadBudget()
  }, [currentHousehold, currentDate])

  if (isLoading) {
    return (
      <Card className="rounded-xl shadow-sm border-0 bg-white h-full">
        <CardContent className="p-5 space-y-4">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-2 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!status) {
    return null
  }

  const { budget, period, usedAmount } = status
  const totalAmount = budget.total_amount_cents
  const percentage = Math.min(Math.round((usedAmount / totalAmount) * 100), 100)
  const remainingAmount = totalAmount - usedAmount
  
  // Color logic
  let progressBarColor = "bg-primary"
  let restAmountColor = "text-foreground" // Use foreground for cleaner look, maybe subtle color if warning
  
  if (percentage >= 100) {
    progressBarColor = "bg-destructive"
    restAmountColor = "text-destructive"
  } else if (percentage >= 80) {
    progressBarColor = "bg-orange-500" 
    restAmountColor = "text-orange-600"
  }

  // Format currency without symbol for custom layout
  const formatValue = (amount: number) => 
    new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount / 100)

  return (
    <Card className="rounded-xl shadow-sm border-0 bg-white h-full">
      <CardContent className="p-5 flex flex-col justify-between h-full min-h-[140px]">
         <div className="space-y-2">
            <h3 className="text-xs text-gray-500 font-medium uppercase tracking-wider">
              Budget {format(period.start, "MMMM", { locale: de })}
            </h3>
            
            {/* Main Value */}
            <div className="flex items-baseline gap-1">
               <span className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
                 {formatValue(usedAmount)}
               </span>
               <span className="text-sm font-medium text-foreground">
                 EUR
               </span>
            </div>
         </div>

         <div className="pt-4 space-y-1">
            {/* Limit Label */}
            <div className="flex justify-between text-[11px] text-gray-400 font-medium uppercase tracking-wide">
              <span>Aktuell</span>
              <span>Limit: {formatValue(totalAmount)} EUR</span>
            </div>

            <Progress value={percentage} className="h-1.5 bg-slate-100" indicatorClassName={progressBarColor} />
            
            {/* Restbetrag - Right Aligned */}
            <div className="flex justify-end pt-1">
               <span className={cn("text-xs font-medium tabular-nums", restAmountColor)}>
                 {remainingAmount >= 0 ? 'Noch ' : 'Drüber: '} 
                 {formatValue(Math.abs(remainingAmount))} EUR
               </span>
            </div>
         </div>
      </CardContent>
    </Card>
  )
}
