'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { subMonths } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Store,
  Tag,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react'

import { DetailHeader } from '@/components/layout/page-header'
import { MonthNavigation, MiniKPICard } from '@/components/dashboard'
import { InsightCard, SectionHeader } from '@/components/dashboard/insight-card'
import { BarChartMini, TipListItem } from '@/components/insights'
import { useInsightsData } from '@/hooks/use-insights-data'
import { formatCurrency } from '@/components/common/currency'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useHousehold } from '@/contexts/household-context'
import { getOfferMatches, type OfferMatch } from '@/app/actions/offers'
import { getStoreIcon } from '@/components/dashboard/receipt-list-item'

export default function SmartInsightsPage() {
  const router = useRouter()
  const { currentHousehold } = useHousehold()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  // Extract year and month from selected date
  const year = selectedDate.getFullYear()
  const month = selectedDate.getMonth() + 1 // 1-indexed

  // Fetch insights data
  const { data, isLoading, error, refresh } = useInsightsData({
    householdId: currentHousehold?.id ?? null,
    year,
    month,
  })

  const offerMatchesQuery = useQuery<OfferMatch[]>({
    queryKey: ['insights-offer-matches', currentHousehold?.id],
    queryFn: () => getOfferMatches(currentHousehold!.id, 8),
    enabled: Boolean(currentHousehold?.id),
    staleTime: 5 * 60 * 1000,
  })
  const offerMatches = offerMatchesQuery.data ?? []
  const matchesLoading = offerMatchesQuery.isLoading || offerMatchesQuery.isFetching

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

  const efficiencyText = data
    ? `${data.isEfficiencyPositive ? '+' : ''}${data.efficiencyPercentage} %`
    : '—'
  const efficiencyColor = data?.isEfficiencyPositive === false ? 'text-rose-500' : 'text-green-500'
  const efficiencyHint = data?.isEfficiencyPositive
    ? 'BESSER ALS VORMONAT'
    : 'MEHR AUSGABEN ALS VORMONAT'

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
          <Card className="rounded-2xl shadow-elevation-1 border-0 bg-card">
            <CardContent className="p-4 space-y-1">
              <p className="text-xs text-primary font-medium uppercase tracking-wider">
                EFFIZIENZ
              </p>
              <p className={`text-2xl font-bold tabular-nums tracking-tight ${efficiencyColor}`}>
                {efficiencyText}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {data?.isEfficiencyPositive === false ? (
                  <TrendingDown className="w-3 h-3" />
                ) : (
                  <TrendingUp className="w-3 h-3" />
                )}
                {data ? efficiencyHint : '—'}
              </p>
            </CardContent>
          </Card>
        </div>

        {error && (
          <Card className="rounded-2xl shadow-elevation-1 border-red-200 bg-red-50">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="h-4 w-4" />
                <p className="text-sm">{error}</p>
              </div>
              <button
                type="button"
                onClick={refresh}
                className="text-sm font-medium text-red-700 hover:underline"
              >
                Erneut laden
              </button>
            </CardContent>
          </Card>
        )}

        {/* Best Shopping Days Insight */}
        <InsightCard
          title="Günstigste Einkaufstage"
          description={data?.bestDayDescription || ''}
          icon={<Calendar className="h-5 w-5" />}
          variant="primary"
          isLoading={isLoading}
        />
        {data && !isLoading && (
          <Card className="rounded-2xl shadow-elevation-1 border-0 bg-card -mt-2">
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

        {/* Offer Matches Section */}
        <section className="space-y-3">
          <SectionHeader
            title="Deine Produkte im Angebot"
            icon={<span className="text-lg">🏷️</span>}
          />
          {matchesLoading ? (
            <Card className="rounded-2xl shadow-elevation-1 border-0 bg-card">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground animate-pulse">Angebote werden gesucht…</p>
              </CardContent>
            </Card>
          ) : offerMatches.length === 0 ? (
            <Card className="rounded-2xl shadow-elevation-1 border-0 bg-card">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Keine deiner häufig gekauften Produkte sind gerade im Angebot.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {offerMatches.map((match) => (
                <Card
                  key={match.product_name}
                  className="rounded-2xl shadow-elevation-1 border-0 bg-card cursor-pointer hover:bg-accent/30 transition-colors"
                  onClick={() => router.push(`/dashboard/angebote?search=${encodeURIComponent(match.offers[0]?.product_name || match.product_name)}`)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{match.offers[0]?.product_name || match.product_name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {match.purchase_count}× gekauft
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {match.offers[0]?.discount_percent && (
                          <span className="text-xs font-bold text-red-500">-{match.offers[0].discount_percent}%</span>
                        )}
                        {match.offers[0]?.price != null && (
                          <span className="text-sm font-bold text-primary">
                            {match.offers[0].price.toFixed(2).replace('.', ',')} €
                          </span>
                        )}
                        <Badge variant="outline" className="text-[10px] px-1.5 h-5 font-normal flex items-center gap-1">
                          {getStoreIcon(match.offers[0]?.store)}
                          <span>{match.offers[0]?.store}</span>
                        </Badge>
                      </div>
                    </div>
                    {match.offers[0]?.valid_until && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Bis {new Date(match.offers[0].valid_until).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <SectionHeader
            title="Enterprise Ops"
            icon={<ShieldCheck className="w-5 h-5 text-muted-foreground" />}
          />
          <Card
            className="rounded-2xl shadow-elevation-1 border-0 bg-card cursor-pointer hover:bg-accent/30 transition-colors"
            onClick={() => router.push('/dashboard/insights/enterprise')}
          >
            <CardContent className="p-4">
              <p className="text-sm font-medium">Audit, Retry Queue und AI Quality</p>
              <p className="text-xs text-muted-foreground mt-1">
                Öffnet das Enterprise-Monitoring für Nachvollziehbarkeit und Zustellqualität.
              </p>
            </CardContent>
          </Card>
        </section>

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
