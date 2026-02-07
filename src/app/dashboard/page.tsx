'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  ShoppingCart,
  Sparkles,
  Landmark,
} from 'lucide-react'
import { startOfMonth, endOfMonth, format, subMonths } from 'date-fns'
import { de } from 'date-fns/locale'

import { useHousehold } from '@/contexts/household-context'
import { useDashboardAnalytics } from '@/hooks/use-dashboard-analytics'
import { createClient } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
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
import { SupplyRangeWidget } from "@/components/dashboard/supply-range-widget"
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
            Bitte waehle einen Haushalt aus, um das Dashboard anzuzeigen.
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
  const insights = useMemo(() => {
    if (!data || data.current.receiptCount === 0) return []

    const insightsList = []

    // Top store insight
    if (data.topStores && data.topStores.length > 0) {
      const topStore = data.topStores[0]
      insightsList.push({
        id: '1',
        title: `Top Einkaufsort: ${topStore.name}`,
        description: `Bei ${topStore.name} hast du diesen Monat ${formatCurrency(topStore.amount, { inCents: true })} ausgegeben (${topStore.visitCount} ${topStore.visitCount === 1 ? 'Besuch' : 'Besuche'}).`,
        label: topStore.name.toUpperCase(),
        variant: 'primary' as const,
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
        })
      } else if (change > 20) {
        insightsList.push({
          id: '2',
          title: 'Ausgaben gestiegen',
          description: `Die Ausgaben sind um ${change.toFixed(0)}% gestiegen im Vergleich zum Vormonat.`,
          variant: 'warning' as const,
        })
      }
    }

    return insightsList
  }, [data])

  // Use real data from analytics hook
  const totalSpent = data?.current.totalSpent ?? 0
  const trend = data?.comparison.totalSpentChange ?? null
  const receiptCount = data?.current.receiptCount ?? 0

  return (
    <div className="space-y-5 pb-6">
      {/* 1. Month Navigation */}
      <MonthNavigation
        currentDate={selectedDate}
        onMonthChange={handleMonthChange}
        minDate={subMonths(new Date(), 24)} // Allow navigation up to 2 years back
      />

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
          {/* 1.5 Budget Widget - Shows budget for CURRENT month */}
          {/* 1.5 Hero KPI Card */}
          <HeroKPICard
            label="GESAMTAUSGABEN MONAT"
            value={formatCurrency(totalSpent, { inCents: true })}
            trend={trend}
            trendLabel="vs. Vormonat"
            icon={<Landmark className="h-6 w-6" />}
            isLoading={isLoading}
            onClick={() => router.push('/dashboard/receipts')}
          />

          {/* 1.6 Budget Widget & Mini KPI */}
          <div className="grid grid-cols-2 gap-4">
             <MiniKPICard
              label="Ø PRO TAG"
              value={formatCurrency(avgPerDay, { inCents: true })}
              progress={progressPercentage}
              isLoading={isLoading}
            />
            <BudgetWidget budgetStatus={data?.budgetStatus ?? null} isLoading={isLoading} />
          </div>

          {/* Supply Range Widget */}
          <SupplyRangeWidget />

          {/* Warranty Vault Widget */}
          <WarrantyWidget />

          {/* 4. Smart Insights Section */}
          <section className="space-y-3">
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
          <section className="space-y-3">
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
