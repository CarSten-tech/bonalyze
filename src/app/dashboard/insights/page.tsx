'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { subMonths } from 'date-fns'
import {
  TrendingUp,
  Calendar,
  Store,
  Tag,
} from 'lucide-react'

import { DetailHeader } from '@/components/layout/page-header'
import { MonthNavigation, MiniKPICard } from '@/components/dashboard'
import { InsightCard, SectionHeader } from '@/components/dashboard/insight-card'
import { BarChartMini, TipListItem } from '@/components/insights'
import { useInsightsData } from '@/hooks/use-insights-data'
import { formatCurrency } from '@/components/common/currency'
import { Card, CardContent } from '@/components/ui/card'

export default function SmartInsightsPage() {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  // Extract year and month from selected date
  const year = selectedDate.getFullYear()
  const month = selectedDate.getMonth() + 1 // 1-indexed

  // Fetch insights data
  const { data, isLoading } = useInsightsData({ year, month })

  // Handle month navigation
  const handleMonthChange = useCallback((newDate: Date) => {
    setSelectedDate(newDate)
  }, [])

  // Transform bar chart data
  const barChartData = useMemo(() => {
    if (!data) return []
    return data.bestDays.map((d) => ({
      label: d.day,
      value: d.percentage,
      isHighlighted: d.isHighlighted,
    }))
  }, [data])

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <DetailHeader
        title="Smart Insights"
        onBack={() => router.push('/dashboard')}
      />

      {/* Main Content */}
      <main className="flex-1 px-4 pb-24 space-y-5">
        {/* Month Navigation */}
        <MonthNavigation
          currentDate={selectedDate}
          onMonthChange={handleMonthChange}
          minDate={subMonths(new Date(), 24)}
        />

        {/* KPI Cards Row */}
        <div className="grid grid-cols-2 gap-4">
          <MiniKPICard
            label="SPARPOTENTIAL"
            value={
              data
                ? formatCurrency(data.savingsPotentialCents, { inCents: true })
                : '—'
            }
            isLoading={isLoading}
          />
          <Card className="rounded-2xl shadow-elevation-1 border-0 bg-white">
            <CardContent className="p-4 space-y-1">
              <p className="text-xs text-primary font-medium uppercase tracking-wider">
                EFFIZIENZ
              </p>
              <p className="text-2xl font-bold tabular-nums tracking-tight text-green-500">
                {data ? `+${data.efficiencyPercentage} %` : '—'}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                TOP PERFORMANCE
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Best Shopping Days Insight */}
        <InsightCard
          title="Günstigste Einkaufstage"
          description={data?.bestDayDescription || ''}
          icon={<Calendar className="h-5 w-5" />}
          variant="primary"
          isLoading={isLoading}
        />
        {data && !isLoading && (
          <Card className="rounded-2xl shadow-elevation-1 border-0 bg-white -mt-2">
            <CardContent className="px-4 pb-4 pt-0">
              <BarChartMini data={barChartData} />
            </CardContent>
          </Card>
        )}

        {/* Retailer Optimization Insight */}
        {data && (
          <InsightCard
            title={data.retailerOptimization.title}
            description={data.retailerOptimization.description}
            icon={<Store className="h-5 w-5" />}
            variant="info"
            isLoading={isLoading}
          />
        )}

        {/* Category Trend Insight */}
        {data && (
          <InsightCard
            title={data.categoryTrend.title}
            description={data.categoryTrend.description}
            icon={<span className="text-lg">{data.categoryTrend.emoji}</span>}
            variant="warning"
            isLoading={isLoading}
          />
        )}

        {/* Concrete Tips Section */}
        <section className="space-y-3">
          <SectionHeader
            title="Konkrete Tipps"
            icon={<Tag className="w-5 h-5 text-muted-foreground" />}
          />
          <div className="space-y-3">
            {data?.tips.map((tip) => (
              <TipListItem
                key={tip.id}
                icon={<span className="text-lg">{tip.icon}</span>}
                title={tip.title}
                description={tip.description}
                iconBgColor={tip.iconBgColor}
                iconColor={tip.iconColor}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
