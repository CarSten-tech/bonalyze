'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  ShoppingCart,
  Sparkles,
  Landmark,
  ScanLine,
  ArrowRightLeft,
} from 'lucide-react'
import { startOfMonth, endOfMonth, format, subMonths } from 'date-fns'
import { de } from 'date-fns/locale'

import { useHousehold } from '@/contexts/household-context'
import { useDashboardAnalytics } from '@/hooks/use-dashboard-analytics'
import { createClient } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  AnalyticsEmptyState,
  AnalyticsErrorState,
} from '@/components/analytics'
import {
  MonthNavigation,
  HeroKPICard,
  MiniKPICard,
  InsightCard,
  SectionHeader,
  ReceiptListItem,
  ReceiptListItemSkeleton,
} from '@/components/dashboard'
import { BudgetWidget } from "@/components/dashboard/budget-widget"
import { WarrantyWidget } from "@/components/dashboard/warranty-widget"
import { CaloriesWidget } from "@/components/dashboard/calories-widget"
import { formatCurrency } from '@/components/common/currency'

interface RecentReceipt {
  id: string
  storeName: string
  date: Date
  itemCount: number
  totalAmount: number
}

export default function DashboardPage() {
  const router = useRouter()
  const { currentHousehold, isLoading: isHouseholdLoading } = useHousehold()

  // Use month-based navigation - default to current month
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  // Memoize the custom range to prevent infinite re-renders
  const customRange = useMemo(() => {
    const start = startOfMonth(selectedDate)
    const end = endOfMonth(selectedDate)
    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
    }
  }, [selectedDate])

  // Fetch analytics data using custom range
  const { data, isLoading, error, refresh } = useDashboardAnalytics({
    preset: 'custom',
    customRange,
  })

  // Fetch recent receipts
  const [recentReceipts, setRecentReceipts] = useState<RecentReceipt[]>([])
  const [receiptsLoading, setReceiptsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchRecentReceipts() {
      if (!currentHousehold) {
        setRecentReceipts([])
        setReceiptsLoading(false)
        return
      }

      setReceiptsLoading(true)
      try {
        const { data: receipts, error: receiptsError } = await supabase
          .from('receipts')
          .select(`
            id,
            total_amount_cents,
            date,
            merchants (
              name
            ),
            receipt_items (
              id
            )
          `)
          .eq('household_id', currentHousehold.id)
          .order('date', { ascending: false })
          .limit(5)

        if (receiptsError) throw receiptsError

        const formattedReceipts: RecentReceipt[] = (receipts || []).map((r) => ({
          id: r.id,
          storeName: (r.merchants as { name: string } | null)?.name || 'Unbekannt',
          date: new Date(r.date),
          itemCount: Array.isArray(r.receipt_items) ? r.receipt_items.length : 0,
          totalAmount: r.total_amount_cents,
        }))

        setRecentReceipts(formattedReceipts)
      } catch (err) {
        console.error('Error fetching recent receipts:', err)
        setRecentReceipts([])
      } finally {
        setReceiptsLoading(false)
      }
    }

    fetchRecentReceipts()
  }, [currentHousehold, supabase])

  // Handle month navigation
  const handleMonthChange = useCallback((newDate: Date) => {
    setSelectedDate(newDate)
  }, [])

  // Calculate days in month for "per day" calculation
  const daysInMonth = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth() + 1,
    0
  ).getDate()

  // Calculate current day of month (for partial month)
  const today = new Date()
  const isCurrentMonth =
    selectedDate.getMonth() === today.getMonth() &&
    selectedDate.getFullYear() === today.getFullYear()
  const effectiveDays = isCurrentMonth ? today.getDate() : daysInMonth

  // Calculate average per day
  const avgPerDay =
    data && effectiveDays > 0
      ? Math.round(data.current.totalSpent / effectiveDays)
      : 0

  // Progress percentage (days elapsed / total days)
  const progressPercentage = isCurrentMonth
    ? Math.round((today.getDate() / daysInMonth) * 100)
    : 100

  // Loading state
  if (isHouseholdLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // No household selected
  if (!currentHousehold) {
    return (
      <div className="space-y-6 px-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Bitte wähle einen Haushalt aus, um das Dashboard anzuzeigen.
          </p>
        </div>
      </div>
    )
  }

  // Check if user has any receipts at all (for global empty state)
  // We check recentReceipts as well since they're fetched globally (not filtered by period)
  const hasAnyReceipts = recentReceipts.length > 0
  const hasNoDataAtAll = !isLoading && !receiptsLoading && !hasAnyReceipts

  // Check if there's no data for the selected period specifically
  const hasNoPeriodData =
    !isLoading && data && data.current.receiptCount === 0 && hasAnyReceipts

  // Generate insights based on real data
  const insights = (() => {
    if (!data || data.current.receiptCount === 0) return []

    const insightsList: Array<{
      id: string
      title: string
      description: string
      label?: string
      variant: 'primary' | 'success' | 'warning' | 'info'
      actionUrl?: string
    }> = []

    // Top store insight
    if (data.topStores && data.topStores.length > 0) {
      const topStore = data.topStores[0]
      insightsList.push({
        id: '1',
        title: `Top Einkaufsort: ${topStore.name}`,
        description: `Bei ${topStore.name} hast du diesen Monat ${formatCurrency(topStore.amount, { inCents: true })} ausgegeben (${topStore.visitCount} ${topStore.visitCount === 1 ? 'Besuch' : 'Besuche'}).`,
        label: topStore.name.toUpperCase(),
        variant: 'primary' as const,
        actionUrl: `/dashboard/receipts?merchant=${topStore.id}`,
      })
    }

    // Spending comparison insight
    if (data.comparison.totalSpentChange !== null) {
      const change = data.comparison.totalSpentChange
      if (change < 0) {
        insightsList.push({
          id: '2',
          title: 'Deutlich sparsamer',
          description: `Du hast ${Math.abs(change).toFixed(0)}% weniger ausgegeben als im Vormonat. Weiter so!`,
          variant: 'success' as const,
          actionUrl: '/dashboard/ausgaben',
        })
      } else if (change > 20) {
        insightsList.push({
          id: '2',
          title: 'Ausgaben gestiegen',
          description: `Die Ausgaben sind um ${change.toFixed(0)}% gestiegen im Vergleich zum Vormonat.`,
          variant: 'warning' as const,
          actionUrl: '/dashboard/ausgaben',
        })
      }
    }

    if (data.budgetStatus) {
      const percentageUsed = Math.round(
        (data.budgetStatus.usedAmount / data.budgetStatus.budget.total_amount_cents) * 100
      )
      if (percentageUsed >= 85) {
        insightsList.push({
          id: 'budget',
          title: 'Budget benötigt Aufmerksamkeit',
          description: `Bereits ${percentageUsed}% des Budgets genutzt. Jetzt anpassen oder gegensteuern.`,
          variant: 'warning' as const,
          actionUrl: '/settings/budget',
        })
      }
    }

    return insightsList
  })()

  // Use real data from analytics hook
  const totalSpent = data?.current.totalSpent ?? 0
  const trend = data?.comparison.totalSpentChange ?? null

  return (
    <div className="space-y-6 pb-8">
      <section className="relative overflow-hidden rounded-[28px] border border-teal-200/70 bg-gradient-to-br from-teal-50 via-amber-50 to-white p-6 shadow-sm">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-teal-200/50 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-14 -left-10 h-44 w-44 rounded-full bg-amber-200/50 blur-2xl" />
        <div className="relative z-10 space-y-4">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-800/80">
              Scan-First Konzept
            </p>
            <h1 className="text-[1.9rem] font-semibold leading-[1.05] text-slate-900">
              Alle Ausgaben, ein klarer Blick.
            </h1>
            <p className="max-w-[32ch] text-sm text-slate-600">
              Erfasse neue Bons schnell und prüfe sofort, ob die Haushaltskosten im Rahmen bleiben.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            <Button
              className="h-11 justify-between rounded-xl bg-teal-700 px-4 text-white hover:bg-teal-800"
              onClick={() => router.push('/dashboard/receipts/new?source=camera')}
            >
              Bon scannen
              <ScanLine className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-11 justify-between rounded-xl border-teal-200 bg-white/80 px-4 text-slate-700 hover:bg-teal-50"
              onClick={() => router.push('/dashboard/settlement')}
            >
              Abrechnung öffnen
              <ArrowRightLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-11 justify-between rounded-xl border-slate-300 bg-white/80 px-4 text-slate-700 hover:bg-slate-50"
              onClick={() => router.push('/dashboard')}
            >
              Original ansehen
              <ArrowRightLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-11 justify-between rounded-xl border-slate-300 bg-white/80 px-4 text-slate-700 hover:bg-slate-50"
              onClick={() => router.push('/dashboard/design-lab')}
            >
              Design Lab
              <Sparkles className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="rounded-full border border-teal-200 bg-white/80 px-3 py-1.5">
              {data?.current.receiptCount ?? 0} Bons im Monat
            </span>
            <span className="rounded-full border border-teal-200 bg-white/80 px-3 py-1.5">
              Zeitraum: {format(selectedDate, 'MMMM yyyy', { locale: de })}
            </span>
          </div>
        </div>
      </section>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-2 shadow-sm">
        <MonthNavigation
          currentDate={selectedDate}
          onMonthChange={handleMonthChange}
          minDate={subMonths(new Date(), 24)} // Allow navigation up to 2 years back
        />
      </div>

      {/* Error State */}
      {error && <AnalyticsErrorState message={error} onRetry={refresh} />}

      {/* Empty State: No data at all */}
      {hasNoDataAtAll && <AnalyticsEmptyState variant="no_data" />}

      {/* Empty State: No data for period */}
      {hasNoPeriodData && (
        <AnalyticsEmptyState
          variant="no_period_data"
          periodLabel={format(selectedDate, 'MMMM yyyy', { locale: de })}
        />
      )}

      {/* Analytics Content */}
      {!error && !hasNoDataAtAll && !hasNoPeriodData && (
        <>
          <section className="rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
            <div className="space-y-4">
              <HeroKPICard
                label="GESAMTAUSGABEN MONAT"
                value={formatCurrency(totalSpent, { inCents: true })}
                trend={trend}
                trendLabel="vs. Vormonat"
                icon={<Landmark className="h-6 w-6" />}
                isLoading={isLoading}
                onClick={() => router.push('/dashboard/receipts')}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                 <MiniKPICard
                  label="Ø PRO TAG"
                  value={formatCurrency(avgPerDay, { inCents: true })}
                  progress={progressPercentage}
                  isLoading={isLoading}
                />
                <BudgetWidget budgetStatus={data?.budgetStatus ?? null} isLoading={isLoading} />
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
            <CaloriesWidget />
            <WarrantyWidget />
          </div>

          {/* Explainable Drivers */}
          {data?.drivers && data.drivers.length > 0 && (
            <section className="space-y-3 rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
              <SectionHeader
                title="Warum verändert sich dein Monat?"
                icon={<span className="text-xl">📌</span>}
              />
              <div className="space-y-3">
                {data.drivers.map((driver) => (
                  <InsightCard
                    key={driver.id}
                    title={driver.title}
                    description={driver.description}
                    variant="info"
                    icon={<Sparkles className="h-5 w-5" />}
                    onClick={driver.actionUrl ? () => router.push(driver.actionUrl as string) : undefined}
                  />
                ))}
              </div>
            </section>
          )}

          {/* 4. Smart Insights Section */}
          <section className="space-y-3 rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
            <SectionHeader
              title="Smart Insights"
              icon={<span className="text-xl">🧠</span>}
              actionLabel="ALLE ANSEHEN"
              onAction={() => router.push('/dashboard/insights')}
            />
            <div className="space-y-3">
              {isLoading ? (
                <>
                  <InsightCard
                    title=""
                    description=""
                    isLoading={true}
                  />
                  <InsightCard
                    title=""
                    description=""
                    isLoading={true}
                  />
                </>
              ) : insights.length > 0 ? (
                insights.map((insight) => (
                  <InsightCard
                    key={insight.id}
                    title={insight.title}
                    description={insight.description}
                    label={insight.label}
                    variant={insight.variant}
                    onClick={insight.actionUrl ? () => router.push(insight.actionUrl as string) : undefined}
                    icon={
                      insight.variant === 'primary' ? (
                        <ShoppingCart className="h-5 w-5" />
                      ) : (
                        <Sparkles className="h-5 w-5" />
                      )
                    }
                  />
                ))
              ) : (
                <InsightCard
                  title="Noch keine Insights"
                  description="Scanne mehr Kassenbons, um personalisierte Einkaufsanalysen zu erhalten."
                  variant="info"
                  icon={<Sparkles className="h-5 w-5" />}
                />
              )}
            </div>
          </section>

          {/* 5. Letzte Ausgaben Section */}
          <section className="space-y-3 rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
            <SectionHeader
              title="Letzte Ausgaben"
              actionLabel="ALLE ANSEHEN"
              onAction={() => router.push('/dashboard/receipts')}
            />
            <Card className="rounded-2xl border-0 shadow-elevation-1 overflow-hidden">
              <CardContent className="p-0">
                {receiptsLoading ? (
                  <div className="divide-y divide-slate-100">
                    <ReceiptListItemSkeleton />
                    <ReceiptListItemSkeleton />
                    <ReceiptListItemSkeleton />
                  </div>
                ) : recentReceipts.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {recentReceipts.map((receipt) => (
                      <ReceiptListItem
                        key={receipt.id}
                        id={receipt.id}
                        storeName={receipt.storeName}
                        date={receipt.date}
                        itemCount={receipt.itemCount}
                        totalAmount={receipt.totalAmount}
                        onClick={() =>
                          router.push(`/dashboard/receipts/${receipt.id}`)
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-muted-foreground">
                    <p>Noch keine Kassenbons vorhanden.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  )
}
