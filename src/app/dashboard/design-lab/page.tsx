'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Fraunces, Space_Grotesk } from 'next/font/google'
import {
  ArrowRightLeft,
  ArrowUpRight,
  Brain,
  CalendarDays,
  CircleDot,
  LayoutGrid,
  Loader2,
  ReceiptText,
  ScanLine,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react'
import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns'
import { de } from 'date-fns/locale'

import { useHousehold } from '@/contexts/household-context'
import { useDashboardAnalytics } from '@/hooks/use-dashboard-analytics'
import { createClient } from '@/lib/supabase'
import { formatCurrency } from '@/components/common/currency'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AnalyticsEmptyState, AnalyticsErrorState } from '@/components/analytics'
import { MonthNavigation } from '@/components/dashboard'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  weight: ['400', '500', '600', '700'],
})

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  weight: ['500', '600', '700'],
})

interface RecentReceipt {
  id: string
  storeName: string
  date: Date
  itemCount: number
  totalAmount: number
}

interface CompareCardProps {
  title: string
  subtitle: string
  ctaLabel: string
  href: string
  tone: 'classic' | 'scan' | 'lab'
}

function CompareCard({ title, subtitle, ctaLabel, href, tone }: CompareCardProps) {
  const toneClass = {
    classic: 'border-slate-300 bg-slate-50/90',
    scan: 'border-teal-300 bg-teal-50/80',
    lab: 'border-cyan-300 bg-cyan-50/80',
  }

  return (
    <Card className={`border ${toneClass[tone]}`}>
      <CardContent className="space-y-3 p-4">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="text-sm text-slate-600">{subtitle}</p>
        <Button asChild variant="outline" className="w-full justify-between">
          <Link href={href}>
            {ctaLabel}
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

export default function DesignLabPage() {
  const router = useRouter()
  const { currentHousehold, isLoading: isHouseholdLoading } = useHousehold()

  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  const customRange = useMemo(() => {
    const start = startOfMonth(selectedDate)
    const end = endOfMonth(selectedDate)
    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
    }
  }, [selectedDate])

  const { data, isLoading, error, refresh } = useDashboardAnalytics({
    preset: 'custom',
    customRange,
  })

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
          .limit(6)

        if (receiptsError) throw receiptsError

        const formattedReceipts: RecentReceipt[] = (receipts || []).map((receipt) => ({
          id: receipt.id,
          storeName: (receipt.merchants as { name: string } | null)?.name || 'Unbekannt',
          date: new Date(receipt.date),
          itemCount: Array.isArray(receipt.receipt_items) ? receipt.receipt_items.length : 0,
          totalAmount: receipt.total_amount_cents,
        }))

        setRecentReceipts(formattedReceipts)
      } catch (fetchError) {
        console.error('Error fetching recent receipts for design lab:', fetchError)
        setRecentReceipts([])
      } finally {
        setReceiptsLoading(false)
      }
    }

    void fetchRecentReceipts()
  }, [currentHousehold, supabase])

  const handleMonthChange = useCallback((newDate: Date) => {
    setSelectedDate(newDate)
  }, [])

  const daysInMonth = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth() + 1,
    0
  ).getDate()
  const today = new Date()
  const isCurrentMonth =
    selectedDate.getMonth() === today.getMonth() &&
    selectedDate.getFullYear() === today.getFullYear()

  const effectiveDays = isCurrentMonth ? today.getDate() : daysInMonth

  const totalSpent = data?.current.totalSpent ?? 0
  const trend = data?.comparison.totalSpentChange ?? null
  const avgPerDay =
    data && effectiveDays > 0
      ? Math.round(data.current.totalSpent / effectiveDays)
      : 0

  const budgetUsed = data?.budgetStatus
    ? Math.round(
        (data.budgetStatus.usedAmount / data.budgetStatus.budget.total_amount_cents) * 100
      )
    : null

  const budgetRemaining = data?.budgetStatus
    ? data.budgetStatus.budget.total_amount_cents - data.budgetStatus.usedAmount
    : null

  const topStore = data?.topStores?.[0] ?? null
  const topDrivers = data?.drivers?.slice(0, 3) ?? []

  const hasAnyReceipts = recentReceipts.length > 0
  const hasNoDataAtAll = !isLoading && !receiptsLoading && !hasAnyReceipts
  const hasNoPeriodData =
    !isLoading && data && data.current.receiptCount === 0 && hasAnyReceipts

  if (isHouseholdLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!currentHousehold) {
    return (
      <div className="space-y-5 px-1">
        <h1 className="text-2xl font-semibold text-foreground">Design Lab</h1>
        <p className="text-sm text-muted-foreground">
          Waehle zuerst einen Haushalt aus, um die neuen UI/UX-Konzepte mit deinen Daten zu vergleichen.
        </p>
        <Button asChild>
          <Link href="/settings/household">Zum Haushalt</Link>
        </Button>
      </div>
    )
  }

  const trendIsPositive = trend !== null && trend > 0
  const trendLabel =
    trend === null
      ? 'Kein Vergleichswert'
      : `${trend > 0 ? '+' : ''}${trend.toFixed(0)}% vs. Vormonat`

  return (
    <div className={`${spaceGrotesk.variable} ${fraunces.variable} space-y-5 pb-8`}>
      <section
        className="relative overflow-hidden rounded-[32px] border border-cyan-300/35 bg-[linear-gradient(140deg,#0b1221_0%,#14314b_52%,#0f766e_100%)] px-5 py-6 text-white shadow-[0_28px_90px_-36px_rgba(2,6,23,0.95)] sm:px-7"
        style={{ fontFamily: 'var(--font-space-grotesk)' }}
      >
        <div className="pointer-events-none absolute -left-14 -top-16 h-48 w-48 rounded-full bg-cyan-300/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-0 h-56 w-56 rounded-full bg-emerald-300/25 blur-3xl" />

        <div className="relative z-10 space-y-4">
          <div className="space-y-2" style={{ animation: 'fade-in 0.6s ease-out both' }}>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100/80">
              Dashboard Design Lab
            </p>
            <h1
              className="max-w-[16ch] text-4xl leading-[0.95] text-cyan-50 sm:text-5xl"
              style={{ fontFamily: 'var(--font-fraunces)' }}
            >
              Neues UI/UX, Original bleibt.
            </h1>
            <p className="max-w-[54ch] text-sm text-cyan-50/80 sm:text-base">
              Vergleiche dein bestehendes Dashboard mit zwei komplett neuen, modernen Konzepten auf Basis derselben Live-Daten.
            </p>
          </div>

          <div
            className="flex flex-wrap items-center gap-2 text-xs text-cyan-50/90"
            style={{ animation: 'fade-in 0.6s ease-out both', animationDelay: '90ms' }}
          >
            <span className="rounded-full border border-cyan-200/50 bg-white/10 px-3 py-1.5 backdrop-blur">
              Zeitraum {format(selectedDate, 'MMMM yyyy', { locale: de })}
            </span>
            <span className="rounded-full border border-cyan-200/50 bg-white/10 px-3 py-1.5 backdrop-blur">
              {data?.current.receiptCount ?? 0} Bons
            </span>
            <span className="rounded-full border border-cyan-200/50 bg-white/10 px-3 py-1.5 backdrop-blur">
              Gesamt {formatCurrency(totalSpent, { inCents: true })}
            </span>
          </div>

          <div
            className="grid gap-2 sm:grid-cols-3"
            style={{ animation: 'fade-in 0.6s ease-out both', animationDelay: '160ms' }}
          >
            <Button asChild className="h-11 justify-between rounded-xl bg-cyan-500 text-slate-950 hover:bg-cyan-400">
              <Link href="/dashboard">
                Original Dashboard
                <ArrowRightLeft className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-11 justify-between rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20">
              <Link href="/dashboard/scan-first">
                Scan-First
                <ScanLine className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              className="h-11 justify-between rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20"
              onClick={() => router.push('/dashboard/receipts/new?source=camera')}
            >
              Direkt scannen
              <Zap className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-2 shadow-sm">
        <MonthNavigation
          currentDate={selectedDate}
          onMonthChange={handleMonthChange}
          minDate={subMonths(new Date(), 24)}
        />
      </div>

      {error && <AnalyticsErrorState message={error} onRetry={refresh} />}

      {hasNoDataAtAll && <AnalyticsEmptyState variant="no_data" />}

      {hasNoPeriodData && (
        <AnalyticsEmptyState
          variant="no_period_data"
          periodLabel={format(selectedDate, 'MMMM yyyy', { locale: de })}
        />
      )}

      {!error && !hasNoDataAtAll && !hasNoPeriodData && (
        <Tabs defaultValue="compare" className="space-y-4" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
          <TabsList className="grid h-auto w-full grid-cols-3 rounded-2xl bg-slate-100 p-1">
            <TabsTrigger value="compare" className="rounded-xl py-2 data-[state=active]:bg-white data-[state=active]:shadow">
              Vergleich
            </TabsTrigger>
            <TabsTrigger value="pulse" className="rounded-xl py-2 data-[state=active]:bg-white data-[state=active]:shadow">
              Konzept Pulse
            </TabsTrigger>
            <TabsTrigger value="canvas" className="rounded-xl py-2 data-[state=active]:bg-white data-[state=active]:shadow">
              Konzept Canvas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="compare" className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-3">
              <CompareCard
                title="Original"
                subtitle="Aktuelle lineare Struktur mit klassischem KPI-Stack."
                ctaLabel="Original oeffnen"
                href="/dashboard"
                tone="classic"
              />
              <CompareCard
                title="Scan-First"
                subtitle="Schneller Einstieg in Erfassung und Abrechnung."
                ctaLabel="Scan-First oeffnen"
                href="/dashboard/scan-first"
                tone="scan"
              />
              <CompareCard
                title="Design Lab"
                subtitle="Komplett neue visuelle Richtung mit zwei experimentellen UX-Flows."
                ctaLabel="Aktiv in diesem Tab"
                href="/dashboard/design-lab"
                tone="lab"
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="border-slate-300 bg-white shadow-sm">
                <CardContent className="space-y-3 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Original UX</p>
                  <h2 className="text-xl font-semibold text-slate-900">Bewaehrter Fluss</h2>
                  <p className="text-sm text-slate-600">
                    Fokus auf Sicherheit und klare Reihenfolge: Navigation, KPIs, Insights, Liste.
                  </p>
                  <div className="space-y-2 text-sm text-slate-700">
                    <div className="flex items-start gap-2"><CircleDot className="mt-0.5 h-4 w-4 text-slate-400" />Vertikaler Informationsfluss ohne Kontextwechsel</div>
                    <div className="flex items-start gap-2"><CircleDot className="mt-0.5 h-4 w-4 text-slate-400" />Konservative Farb- und Typografie-Sprache</div>
                    <div className="flex items-start gap-2"><CircleDot className="mt-0.5 h-4 w-4 text-slate-400" />Geringe visuelle Reibung fuer Bestandsnutzer</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-cyan-300/60 bg-[linear-gradient(160deg,#ecfeff_0%,#f0fdfa_45%,#f8fafc_100%)] shadow-sm">
                <CardContent className="space-y-3 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">Neue UX</p>
                  <h2 className="text-xl font-semibold text-slate-900">Schneller entscheiden</h2>
                  <p className="text-sm text-slate-700">
                    Aktionen, Kennzahlen und Kontext werden in zwei neuen Mustern kombiniert: Command Center und Editorial Canvas.
                  </p>
                  <div className="space-y-2 text-sm text-slate-700">
                    <div className="flex items-start gap-2"><Sparkles className="mt-0.5 h-4 w-4 text-cyan-600" />Prioritaeten zuerst: Handlungen vor Listen</div>
                    <div className="flex items-start gap-2"><Sparkles className="mt-0.5 h-4 w-4 text-cyan-600" />Deutliche visuelle Hierarchie pro Aufgabe</div>
                    <div className="flex items-start gap-2"><Sparkles className="mt-0.5 h-4 w-4 text-cyan-600" />Stark differenzierte Typografie und Farbwelt</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="pulse" className="mt-0">
            <article className="relative overflow-hidden rounded-[30px] border border-cyan-300/30 bg-[linear-gradient(150deg,#020617_0%,#0f172a_40%,#103b4a_100%)] p-4 text-cyan-50 shadow-[0_30px_90px_-44px_rgba(2,6,23,0.95)] sm:p-6">
              <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />
              <div className="pointer-events-none absolute -left-24 bottom-0 h-80 w-80 rounded-full bg-emerald-300/15 blur-3xl" />

              <div className="relative z-10 space-y-5">
                <div
                  className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]"
                  style={{ animation: 'fade-in 0.55s ease-out both' }}
                >
                  <div className="rounded-[26px] border border-cyan-200/20 bg-white/5 p-4 backdrop-blur-md sm:p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-cyan-100/75">Pulse Command</p>
                    <h3
                      className="mt-2 text-3xl leading-[0.95] sm:text-4xl"
                      style={{ fontFamily: 'var(--font-fraunces)' }}
                    >
                      Eine Schaltzentrale fuer deinen Monat.
                    </h3>
                    <div className="mt-4 flex flex-wrap items-end gap-2">
                      <span className="text-3xl font-semibold text-white sm:text-4xl">
                        {formatCurrency(totalSpent, { inCents: true })}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${trendIsPositive ? 'bg-rose-400/20 text-rose-100' : 'bg-emerald-300/20 text-emerald-100'}`}>
                        {trend === null ? (
                          trendLabel
                        ) : trendIsPositive ? (
                          <span className="inline-flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" />{trendLabel}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1"><TrendingDown className="h-3.5 w-3.5" />{trendLabel}</span>
                        )}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-cyan-50/70">
                      Fokus auf aktive Entscheidungen statt passiver Uebersicht.
                    </p>
                  </div>

                  <div
                    className="grid grid-cols-2 gap-2"
                    style={{ animation: 'fade-in 0.55s ease-out both', animationDelay: '90ms' }}
                  >
                    <Button
                      className="h-20 flex-col gap-2 rounded-2xl bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                      onClick={() => router.push('/dashboard/receipts/new?source=camera')}
                    >
                      <ScanLine className="h-5 w-5" />
                      Scannen
                    </Button>
                    <Button
                      variant="outline"
                      className="h-20 flex-col gap-2 rounded-2xl border-cyan-200/40 bg-white/10 text-cyan-50 hover:bg-white/20"
                      onClick={() => router.push('/dashboard/settlement')}
                    >
                      <ArrowRightLeft className="h-5 w-5" />
                      Abrechnung
                    </Button>
                    <Button
                      variant="outline"
                      className="h-20 flex-col gap-2 rounded-2xl border-cyan-200/40 bg-white/10 text-cyan-50 hover:bg-white/20"
                      onClick={() => router.push('/dashboard/receipts')}
                    >
                      <ReceiptText className="h-5 w-5" />
                      Bons
                    </Button>
                    <Button
                      variant="outline"
                      className="h-20 flex-col gap-2 rounded-2xl border-cyan-200/40 bg-white/10 text-cyan-50 hover:bg-white/20"
                      onClick={() => router.push('/dashboard/insights')}
                    >
                      <Brain className="h-5 w-5" />
                      Insights
                    </Button>
                  </div>
                </div>

                <div
                  className="grid gap-3 sm:grid-cols-3"
                  style={{ animation: 'fade-in 0.55s ease-out both', animationDelay: '180ms' }}
                >
                  <div className="rounded-2xl border border-cyan-100/15 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-cyan-100/70">Durchschnitt/Tag</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{formatCurrency(avgPerDay, { inCents: true })}</p>
                  </div>
                  <div className="rounded-2xl border border-cyan-100/15 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-cyan-100/70">Budget Rest</p>
                    <p className="mt-2 text-2xl font-semibold text-white">
                      {budgetRemaining !== null ? formatCurrency(budgetRemaining, { inCents: true }) : 'Kein Budget'}
                    </p>
                    {budgetUsed !== null && (
                      <p className="mt-1 text-xs text-cyan-100/70">{budgetUsed}% genutzt</p>
                    )}
                  </div>
                  <div className="rounded-2xl border border-cyan-100/15 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-cyan-100/70">Top Store</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{topStore?.name ?? 'Noch offen'}</p>
                    <p className="mt-1 text-xs text-cyan-100/70">{topStore ? `${topStore.visitCount} Besuche` : 'Scanne mehr Bons'}</p>
                  </div>
                </div>

                <div
                  className="rounded-2xl border border-cyan-100/20 bg-white/5 p-4"
                  style={{ animation: 'fade-in 0.55s ease-out both', animationDelay: '240ms' }}
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-cyan-50">Dynamische Treiber</p>
                    <Button
                      variant="ghost"
                      className="h-8 rounded-lg px-2 text-xs text-cyan-100 hover:bg-white/10 hover:text-white"
                      onClick={() => router.push('/dashboard/insights')}
                    >
                      Mehr
                    </Button>
                  </div>
                  <div className="grid gap-2 lg:grid-cols-3">
                    {topDrivers.length > 0 ? (
                      topDrivers.map((driver) => (
                        <div key={driver.id} className="rounded-xl border border-cyan-100/15 bg-slate-950/25 p-3">
                          <p className="text-sm font-medium text-cyan-50">{driver.title}</p>
                          <p className="mt-1 text-xs text-cyan-100/70">{driver.description}</p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl border border-cyan-100/15 bg-slate-950/25 p-3 text-sm text-cyan-100/75 lg:col-span-3">
                        Noch keine Treiber verfuegbar. Mehr Bons liefern bessere Empfehlungen.
                      </div>
                    )}
                  </div>
                </div>

                <div
                  className="rounded-2xl border border-cyan-100/20 bg-white/5 p-4"
                  style={{ animation: 'fade-in 0.55s ease-out both', animationDelay: '320ms' }}
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-cyan-50">Letzte Bons</p>
                    <Button
                      variant="ghost"
                      className="h-8 rounded-lg px-2 text-xs text-cyan-100 hover:bg-white/10 hover:text-white"
                      onClick={() => router.push('/dashboard/receipts')}
                    >
                      Alle
                    </Button>
                  </div>
                  {receiptsLoading ? (
                    <div className="flex items-center justify-center py-6 text-cyan-100/70">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : recentReceipts.length > 0 ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {recentReceipts.slice(0, 4).map((receipt) => (
                        <button
                          key={receipt.id}
                          type="button"
                          onClick={() => router.push(`/dashboard/receipts/${receipt.id}`)}
                          className="rounded-xl border border-cyan-100/15 bg-slate-950/30 p-3 text-left transition hover:border-cyan-200/45 hover:bg-slate-950/55"
                        >
                          <p className="text-sm font-medium text-cyan-50">{receipt.storeName}</p>
                          <p className="mt-1 text-xs text-cyan-100/70">{format(receipt.date, 'dd.MM.yyyy')} - {receipt.itemCount} Positionen</p>
                          <p className="mt-2 text-sm font-semibold text-white">{formatCurrency(receipt.totalAmount, { inCents: true })}</p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-cyan-100/70">Noch keine Kassenbons vorhanden.</p>
                  )}
                </div>
              </div>
            </article>
          </TabsContent>

          <TabsContent value="canvas" className="mt-0">
            <article className="relative overflow-hidden rounded-[30px] border border-amber-200 bg-[linear-gradient(160deg,#fff7ed_0%,#fffbeb_48%,#f0fdfa_100%)] p-4 text-slate-900 shadow-[0_26px_88px_-40px_rgba(120,53,15,0.35)] sm:p-6">
              <div className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-amber-200/45 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-teal-200/40 blur-3xl" />

              <div className="relative z-10 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-4" style={{ animation: 'fade-in 0.55s ease-out both' }}>
                  <div className="rounded-[24px] border border-amber-300/70 bg-white/70 p-5 backdrop-blur">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Canvas Editorial</p>
                    <h3 className="mt-2 text-4xl leading-[0.92] text-slate-900 sm:text-5xl" style={{ fontFamily: 'var(--font-fraunces)' }}>
                      Klarheit wie ein Magazin, Tempo wie eine App.
                    </h3>
                    <p className="mt-3 max-w-[48ch] text-sm text-slate-600">
                      Dieses Konzept priorisiert Storytelling: erst Kontext, dann Handlung.
                    </p>
                  </div>

                  <div
                    className="grid gap-3 sm:grid-cols-2"
                    style={{ animation: 'fade-in 0.55s ease-out both', animationDelay: '120ms' }}
                  >
                    <div className="rounded-[22px] border border-slate-300 bg-white p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Monatssumme</p>
                      <p className="mt-2 text-3xl font-semibold text-slate-900">{formatCurrency(totalSpent, { inCents: true })}</p>
                      <p className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${trendIsPositive ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {trendIsPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                        {trendLabel}
                      </p>
                    </div>
                    <div className="rounded-[22px] border border-slate-300 bg-white p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Monatsstatus</p>
                      <p className="mt-2 text-3xl font-semibold text-slate-900">{formatCurrency(avgPerDay, { inCents: true })}</p>
                      <p className="mt-2 text-xs text-slate-500">durchschnittlich pro Tag</p>
                    </div>
                  </div>

                  <div
                    className="rounded-[22px] border border-slate-300 bg-white p-4"
                    style={{ animation: 'fade-in 0.55s ease-out both', animationDelay: '220ms' }}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900">Momentaufnahme</p>
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {format(selectedDate, 'MMMM yyyy', { locale: de })}
                      </span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <div className="rounded-xl bg-slate-100 p-3">
                        <p className="text-xs text-slate-500">Bons</p>
                        <p className="mt-1 text-lg font-semibold text-slate-900">{data?.current.receiptCount ?? 0}</p>
                      </div>
                      <div className="rounded-xl bg-slate-100 p-3">
                        <p className="text-xs text-slate-500">Top Store</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900 line-clamp-1">{topStore?.name ?? 'Unbekannt'}</p>
                      </div>
                      <div className="rounded-xl bg-slate-100 p-3">
                        <p className="text-xs text-slate-500">Budget</p>
                        <p className="mt-1 text-lg font-semibold text-slate-900">{budgetUsed !== null ? `${budgetUsed}%` : 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3" style={{ animation: 'fade-in 0.55s ease-out both', animationDelay: '180ms' }}>
                  <div className="rounded-[24px] border border-teal-300/60 bg-teal-950 p-4 text-teal-50">
                    <p className="text-xs uppercase tracking-[0.18em] text-teal-200">Schnellaktionen</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button
                        className="h-12 justify-between rounded-xl bg-teal-400 text-slate-950 hover:bg-teal-300"
                        onClick={() => router.push('/dashboard/receipts/new?source=camera')}
                      >
                        <span>Scan</span>
                        <ScanLine className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        className="h-12 justify-between rounded-xl border-teal-200/40 bg-teal-900 text-teal-100 hover:bg-teal-800"
                        onClick={() => router.push('/dashboard/settlement')}
                      >
                        <span>Split</span>
                        <ArrowRightLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        className="h-12 justify-between rounded-xl border-teal-200/40 bg-teal-900 text-teal-100 hover:bg-teal-800"
                        onClick={() => router.push('/dashboard/insights')}
                      >
                        <span>Insights</span>
                        <Brain className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        className="h-12 justify-between rounded-xl border-teal-200/40 bg-teal-900 text-teal-100 hover:bg-teal-800"
                        onClick={() => router.push('/dashboard/receipts')}
                      >
                        <span>Bons</span>
                        <ReceiptText className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-slate-300 bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Driver Cards</p>
                    <div className="mt-3 space-y-2">
                      {topDrivers.length > 0 ? (
                        topDrivers.map((driver) => (
                          <div key={driver.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <p className="text-sm font-medium text-slate-900">{driver.title}</p>
                            <p className="mt-1 text-xs text-slate-600">{driver.description}</p>
                          </div>
                        ))
                      ) : (
                        <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                          Noch keine Insight-Treiber fuer diesen Zeitraum.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-amber-300/70 bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-amber-700">Design DNA</p>
                    <div className="mt-2 space-y-2 text-sm text-slate-700">
                      <div className="inline-flex items-center gap-2 rounded-lg bg-amber-50 px-2 py-1"><LayoutGrid className="h-4 w-4 text-amber-700" />modulares Raster</div>
                      <div className="inline-flex items-center gap-2 rounded-lg bg-amber-50 px-2 py-1"><Wallet className="h-4 w-4 text-amber-700" />Budget im Fokus</div>
                      <div className="inline-flex items-center gap-2 rounded-lg bg-amber-50 px-2 py-1"><ShieldCheck className="h-4 w-4 text-amber-700" />geringes Risiko fuer Bestandsflow</div>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
