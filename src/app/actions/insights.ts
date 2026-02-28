'use server'

import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns'
import { de } from 'date-fns/locale'
import { z } from 'zod'

import { createServerClient as createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createCacheKey, serverCache } from '@/lib/cache'
import { logger } from '@/lib/logger'
import {
  calculateDataQuality,
  defaultBestDays,
  jaccardScore,
  median,
  normalizeProductKey,
  pickSearchKeyword,
  WEEKDAY_SHORT,
} from '@/lib/insights/engine-utils'
import type { InsightsData, Tip } from '@/types/insights'

const insightsInputSchema = z.object({
  householdId: z.string().uuid(),
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
})

const INSIGHTS_CACHE_TTL_MS = 5 * 60 * 1000
const OFFER_MATCH_SCORE_THRESHOLD = 0.34
const MIN_RECEIPTS_FOR_INSIGHTS = 10

const WEEKDAY_LONG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']

interface ReceiptRow {
  id: string
  date: string
  total_amount_cents: number
  merchant_id: string | null
  merchants: { name: string } | { name: string }[] | null
}

interface CategoryInfo {
  id: string
  name: string
  parent_id: string | null
  emoji: string | null
}

interface ReceiptItemRow {
  receipt_id: string
  product_name: string
  quantity: number
  price_cents: number
  category_id: string | null
  categories: CategoryInfo | CategoryInfo[] | null
}

interface OfferRow {
  product_name: string
  store: string
  price: number | null
  valid_until: string | null
}

interface ProductPurchase {
  productKey: string
  displayName: string
  merchantId: string | null
  merchantName: string
  unitPriceCents: number
  quantity: number
}

interface ProductStats {
  displayName: string
  totalSpentCents: number
  totalQuantity: number
  purchaseCount: number
}

function toIsoDate(value: Date): string {
  return value.toISOString().split('T')[0]
}

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

function resolveRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function monthLabelFor(year: number, month: number): string {
  return format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: de })
}

function jsDayToMondayIndex(day: number): number {
  return (day + 6) % 7
}

function createDefaultInsights(
  generatedAt: string,
  monthLabel: string,
  receiptCount = 0,
  tipDescription = 'Scanne mehr Bons für präzisere Preis- und Sparanalysen.',
  bestDayDescription = 'Noch zu wenig Daten für verlässliche Wochentag-Muster.'
): InsightsData {
  return {
    savingsPotentialCents: 0,
    efficiencyPercentage: 0,
    isEfficiencyPositive: true,
    bestDays: defaultBestDays(),
    bestDayDescription,
    retailerOptimization: {
      title: 'Händler-Optimierung',
      description: 'Sobald genug Vergleichseinkäufe vorliegen, zeigen wir konkrete Händler-Empfehlungen.',
      savingsAmountCents: 0,
    },
    categoryTrend: {
      title: `Preistrend ${monthLabel}`,
      description: 'Noch keine verlässlichen Preisvergleiche zum Vormonat verfügbar.',
      emoji: '📊',
    },
    tips: [
      {
        id: 'tip-more-data',
        icon: '🧾',
        title: 'Mehr Daten sammeln',
        description: tipDescription,
        iconBgColor: 'bg-sky-100',
        iconColor: 'text-sky-700',
      },
    ],
    meta: {
      generatedAt,
      receiptCount,
      comparableProducts: 0,
      dataQuality: 'low',
    },
  }
}

export async function getInsightsData(input: {
  householdId: string
  year: number
  month: number
}): Promise<InsightsData> {
  const parsedInput = insightsInputSchema.parse(input)
  const { householdId, year, month } = parsedInput

  const monthLabel = monthLabelFor(year, month)
  const cacheKey = createCacheKey('insights-v2', householdId, year, month)
  const cached = await serverCache.get<InsightsData>(cacheKey)
  if (cached) return cached

  const generatedAt = new Date().toISOString()

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('Not authenticated')
    }

    const { data: membership } = await supabase
      .from('household_members')
      .select('id')
      .eq('household_id', householdId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership) {
      throw new Error('Forbidden')
    }

    const selectedMonthDate = new Date(year, month - 1, 1)
    const selectedStart = startOfMonth(selectedMonthDate)
    const selectedEnd = endOfMonth(selectedMonthDate)
    const previousStart = startOfMonth(subMonths(selectedStart, 1))
    const previousEnd = endOfMonth(subMonths(selectedStart, 1))
    const historyStart = startOfMonth(subMonths(selectedStart, 5))

    const selectedStartIso = toIsoDate(selectedStart)
    const selectedEndIso = toIsoDate(selectedEnd)
    const previousStartIso = toIsoDate(previousStart)
    const previousEndIso = toIsoDate(previousEnd)
    const historyStartIso = toIsoDate(historyStart)

    const { data: historyReceiptsRaw, error: historyReceiptsError } = await supabase
      .from('receipts')
      .select(`
        id,
        date,
        total_amount_cents,
        merchant_id,
        merchants (
          name
        )
      `)
      .eq('household_id', householdId)
      .gte('date', historyStartIso)
      .lte('date', selectedEndIso)

    if (historyReceiptsError) {
      throw historyReceiptsError
    }

    const historyReceipts = ((historyReceiptsRaw || []) as ReceiptRow[]).map((receipt) => ({
      id: receipt.id,
      date: receipt.date,
      totalAmountCents: receipt.total_amount_cents,
      merchantId: receipt.merchant_id,
      merchantName: resolveRelation(receipt.merchants)?.name || 'Unbekannt',
    }))

    const selectedReceipts = historyReceipts.filter(
      (receipt) => receipt.date >= selectedStartIso && receipt.date <= selectedEndIso
    )
    const previousReceipts = historyReceipts.filter(
      (receipt) => receipt.date >= previousStartIso && receipt.date <= previousEndIso
    )

    if (selectedReceipts.length === 0) {
      const noMonthData = createDefaultInsights(
        generatedAt,
        monthLabel,
        0,
        `Für ${monthLabel} wurden noch keine Bons erfasst.`,
        `Für ${monthLabel} liegen noch keine Einkäufe vor.`
      )
      await serverCache.set(cacheKey, noMonthData, INSIGHTS_CACHE_TTL_MS)
      return noMonthData
    }

    if (historyReceipts.length < MIN_RECEIPTS_FOR_INSIGHTS) {
      const sparseData = createDefaultInsights(
        generatedAt,
        monthLabel,
        selectedReceipts.length,
        `Für belastbare Insights brauchen wir mindestens ${MIN_RECEIPTS_FOR_INSIGHTS} Bons in den letzten 6 Monaten (aktuell ${historyReceipts.length}).`
      )
      await serverCache.set(cacheKey, sparseData, INSIGHTS_CACHE_TTL_MS)
      return sparseData
    }

    const selectedReceiptIds = selectedReceipts.map((receipt) => receipt.id)
    const previousReceiptIds = previousReceipts.map((receipt) => receipt.id)
    const selectedReceiptIdSet = new Set(selectedReceiptIds)
    const previousReceiptIdSet = new Set(previousReceiptIds)
    const itemReceiptIds = [...new Set([...selectedReceiptIds, ...previousReceiptIds])]

    let itemRows: ReceiptItemRow[] = []
    if (itemReceiptIds.length > 0) {
      const { data: itemsRaw, error: itemsError } = await supabase
        .from('receipt_items')
        .select(`
          receipt_id,
          product_name,
          quantity,
          price_cents,
          category_id,
          categories (
            id,
            name,
            parent_id,
            emoji
          )
        `)
        .in('receipt_id', itemReceiptIds)

      if (itemsError) {
        throw itemsError
      }

      itemRows = (itemsRaw || []) as unknown as ReceiptItemRow[]
    }

    const categoryRows = itemRows
      .map((item) => resolveRelation(item.categories))
      .filter((category): category is CategoryInfo => Boolean(category))
    const parentCategoryIds = [...new Set(categoryRows.map((category) => category.parent_id).filter(Boolean) as string[])]
    const parentCategoryMap = new Map<string, { name: string; emoji: string | null }>()

    if (parentCategoryIds.length > 0) {
      const { data: parentRows, error: parentError } = await supabase
        .from('categories')
        .select('id, name, emoji')
        .in('id', parentCategoryIds)

      if (parentError) {
        throw parentError
      }

      for (const parent of parentRows || []) {
        parentCategoryMap.set(parent.id, { name: parent.name, emoji: parent.emoji })
      }
    }

    const receiptMerchantMap = new Map(
      selectedReceipts.map((receipt) => [
        receipt.id,
        { merchantId: receipt.merchantId, merchantName: receipt.merchantName },
      ])
    )

    const selectedItemRows = itemRows.filter((item) => selectedReceiptIdSet.has(item.receipt_id))
    const previousItemRows = itemRows.filter((item) => previousReceiptIdSet.has(item.receipt_id))

    const selectedTotalCents = selectedReceipts.reduce((sum, receipt) => sum + receipt.totalAmountCents, 0)
    const previousTotalCents = previousReceipts.reduce((sum, receipt) => sum + receipt.totalAmountCents, 0)

    const efficiencyPercentage =
      previousTotalCents > 0
        ? Math.round(((previousTotalCents - selectedTotalCents) / previousTotalCents) * 100)
        : 0
    const isEfficiencyPositive = efficiencyPercentage >= 0

    // Day-of-week spending profile (last 6 months up to selected month).
    const weekdayStats = WEEKDAY_SHORT.map(() => ({ totalCents: 0, count: 0 }))
    for (const receipt of historyReceipts) {
      const dayIndex = jsDayToMondayIndex(new Date(receipt.date).getDay())
      weekdayStats[dayIndex].totalCents += receipt.totalAmountCents
      weekdayStats[dayIndex].count += 1
    }

    const weekdayAverages = weekdayStats.map((entry) =>
      entry.count > 0 ? Math.round(entry.totalCents / entry.count) : 0
    )
    const populatedDayIndexes = weekdayStats
      .map((entry, index) => ({ index, count: entry.count }))
      .filter((entry) => entry.count > 0)
      .map((entry) => entry.index)
    const populatedDayIndexSet = new Set(populatedDayIndexes)

    let bestDays = defaultBestDays()
    let bestDayDescription = 'Noch zu wenig Daten für verlässliche Wochentag-Muster.'
    let weekdaySpreadPercent = 0

    if (populatedDayIndexes.length >= 2) {
      const populatedAverages = populatedDayIndexes.map((index) => weekdayAverages[index])
      const minAverage = Math.min(...populatedAverages)
      const maxAverage = Math.max(...populatedAverages)
      const bestDayIndex = weekdayAverages.findIndex((average, index) =>
        populatedDayIndexSet.has(index) && average === minAverage
      )
      const worstDayIndex = weekdayAverages.findIndex((average, index) =>
        populatedDayIndexSet.has(index) && average === maxAverage
      )

      weekdaySpreadPercent =
        minAverage > 0 ? Math.round(((maxAverage - minAverage) / minAverage) * 100) : 0

      bestDays = WEEKDAY_SHORT.map((day, index) => {
        if (!populatedDayIndexSet.has(index)) {
          return { day, percentage: 10, isHighlighted: false }
        }
        if (maxAverage === minAverage) {
          return { day, percentage: 60, isHighlighted: index === bestDayIndex }
        }
        const score = Math.round(((maxAverage - weekdayAverages[index]) / (maxAverage - minAverage)) * 100)
        return {
          day,
          percentage: Math.max(8, score),
          isHighlighted: index === bestDayIndex,
        }
      })

      const bestDayName = WEEKDAY_LONG[bestDayIndex] || 'Der beste Tag'
      const worstDayName = WEEKDAY_LONG[worstDayIndex] || 'der teuerste Tag'

      bestDayDescription = `${bestDayName} ist aktuell am günstigsten (Ø ${formatCurrency(minAverage)} pro Einkauf). ${worstDayName} ist im Schnitt ${weekdaySpreadPercent}% teurer.`
    }

    // Build selected-month purchase records for optimization.
    const productPurchases: ProductPurchase[] = []
    const productStats = new Map<string, ProductStats>()

    for (const item of selectedItemRows) {
      const normalizedKey = normalizeProductKey(item.product_name)
      if (!normalizedKey) continue

      const quantity = item.quantity > 0 ? item.quantity : 1
      const unitPriceCents = item.price_cents
      const merchantRef = receiptMerchantMap.get(item.receipt_id)

      productPurchases.push({
        productKey: normalizedKey,
        displayName: item.product_name,
        merchantId: merchantRef?.merchantId || null,
        merchantName: merchantRef?.merchantName || 'Unbekannt',
        unitPriceCents,
        quantity,
      })

      const existing = productStats.get(normalizedKey)
      if (existing) {
        existing.totalSpentCents += unitPriceCents * quantity
        existing.totalQuantity += quantity
        existing.purchaseCount += 1
      } else {
        productStats.set(normalizedKey, {
          displayName: item.product_name,
          totalSpentCents: unitPriceCents * quantity,
          totalQuantity: quantity,
          purchaseCount: 1,
        })
      }
    }

    // Retailer optimization from real per-product merchant comparisons.
    const groupedByProduct = new Map<string, ProductPurchase[]>()
    for (const purchase of productPurchases) {
      const list = groupedByProduct.get(purchase.productKey)
      if (list) list.push(purchase)
      else groupedByProduct.set(purchase.productKey, [purchase])
    }

    let comparableProducts = 0
    let retailerSavingsCents = 0
    const switchSavings = new Map<
      string,
      { from: string; to: string; savingsCents: number; productCount: number }
    >()

    for (const purchases of groupedByProduct.values()) {
      const byMerchant = new Map<string, { merchantName: string; prices: number[] }>()

      for (const purchase of purchases) {
        if (!purchase.merchantId) continue
        const existing = byMerchant.get(purchase.merchantId)
        if (existing) {
          existing.prices.push(purchase.unitPriceCents)
        } else {
          byMerchant.set(purchase.merchantId, {
            merchantName: purchase.merchantName,
            prices: [purchase.unitPriceCents],
          })
        }
      }

      if (byMerchant.size < 2) continue
      comparableProducts += 1

      const merchantBenchmarks = [...byMerchant.entries()].map(([merchantId, value]) => ({
        merchantId,
        merchantName: value.merchantName,
        benchmarkPriceCents: median(value.prices),
      }))
      merchantBenchmarks.sort((a, b) => a.benchmarkPriceCents - b.benchmarkPriceCents)
      const bestMerchant = merchantBenchmarks[0]

      for (const purchase of purchases) {
        if (!purchase.merchantId || purchase.merchantId === bestMerchant.merchantId) continue
        const diffPerUnit = purchase.unitPriceCents - bestMerchant.benchmarkPriceCents
        if (diffPerUnit <= 0) continue
        const savings = diffPerUnit * purchase.quantity
        retailerSavingsCents += savings

        const switchKey = `${purchase.merchantId}->${bestMerchant.merchantId}`
        const existingSwitch = switchSavings.get(switchKey)
        if (existingSwitch) {
          existingSwitch.savingsCents += savings
          existingSwitch.productCount += 1
        } else {
          switchSavings.set(switchKey, {
            from: purchase.merchantName,
            to: bestMerchant.merchantName,
            savingsCents: savings,
            productCount: 1,
          })
        }
      }
    }

    const topSwitch = [...switchSavings.values()].sort((a, b) => b.savingsCents - a.savingsCents)[0] || null

    const retailerOptimization =
      comparableProducts === 0
        ? {
            title: 'Händler-Optimierung',
            description:
              'Für diesen Monat gibt es noch zu wenige Produkte, die bei mehreren Händlern gekauft wurden.',
            savingsAmountCents: 0,
          }
        : retailerSavingsCents > 0 && topSwitch
          ? {
              title: 'Händler-Optimierung',
              description: `Bei ${comparableProducts} vergleichbaren Produkten wäre ${topSwitch.to} oft günstiger als ${topSwitch.from}. Potenzial im ${monthLabel}: ${formatCurrency(retailerSavingsCents)}.`,
              savingsAmountCents: retailerSavingsCents,
            }
          : {
              title: 'Händler-Optimierung',
              description:
                'Deine Händlerpreise liegen im aktuellen Monat bereits nah beieinander.',
              savingsAmountCents: 0,
            }

    // Offer-based savings potential using active offers and fuzzy matching.
    let offerSavingsCents = 0
    let bestOfferOpportunity:
      | { productName: string; store: string; savingsCents: number }
      | null = null

    if (productStats.size > 0) {
      try {
        const admin = createAdminClient()
        const nowIso = new Date().toISOString()
        const productCandidates = [...productStats.entries()]
          .sort((a, b) => b[1].totalSpentCents - a[1].totalSpentCents)
          .slice(0, 15)

        const opportunities = await Promise.all(
          productCandidates.map(async ([, stats]) => {
            const searchKeyword = pickSearchKeyword(stats.displayName)
            if (!searchKeyword || stats.totalQuantity <= 0) return null

            const { data: offersRaw, error: offersError } = await admin
              .from('offers')
              .select('product_name, store, price, valid_until')
              .gte('valid_until', nowIso)
              .ilike('product_name', `%${searchKeyword}%`)
              .order('price', { ascending: true })
              .limit(12)

            if (offersError) return null

            const scoredOffers = ((offersRaw || []) as OfferRow[])
              .filter((offer) => offer.price !== null)
              .map((offer) => ({
                ...offer,
                score: jaccardScore(stats.displayName, offer.product_name),
              }))
              .filter((offer) => offer.score >= OFFER_MATCH_SCORE_THRESHOLD)
              .sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score
                return (a.price || 0) - (b.price || 0)
              })

            const bestOffer = scoredOffers[0]
            if (!bestOffer || bestOffer.price === null) return null

            const avgPaidUnitCents = Math.round(stats.totalSpentCents / stats.totalQuantity)
            const offerUnitCents = Math.round(bestOffer.price * 100)
            const diffPerUnit = avgPaidUnitCents - offerUnitCents
            if (diffPerUnit <= 0) return null

            const weightedSavings = Math.round(
              diffPerUnit * stats.totalQuantity * Math.min(Math.max(bestOffer.score, 0.4), 1)
            )

            return {
              productName: stats.displayName,
              store: bestOffer.store,
              savingsCents: weightedSavings,
            }
          })
        )

        for (const opportunity of opportunities) {
          if (!opportunity || opportunity.savingsCents <= 0) continue
          offerSavingsCents += opportunity.savingsCents

          if (
            !bestOfferOpportunity ||
            opportunity.savingsCents > bestOfferOpportunity.savingsCents
          ) {
            bestOfferOpportunity = opportunity
          }
        }
      } catch (error) {
        logger.warn('[insights] Offer optimization unavailable', {
          householdId,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    // Product price trend (selected month vs previous month).
    const aggregateProductPrices = (items: ReceiptItemRow[]) => {
      const map = new Map<
        string,
        { displayName: string; totalCostCents: number; totalQuantity: number }
      >()

      for (const item of items) {
        const key = normalizeProductKey(item.product_name)
        if (!key) continue
        const quantity = item.quantity > 0 ? item.quantity : 1
        const entry = map.get(key)

        if (entry) {
          entry.totalCostCents += item.price_cents * quantity
          entry.totalQuantity += quantity
        } else {
          map.set(key, {
            displayName: item.product_name,
            totalCostCents: item.price_cents * quantity,
            totalQuantity: quantity,
          })
        }
      }

      return map
    }

    const currentProductPrices = aggregateProductPrices(selectedItemRows)
    const previousProductPrices = aggregateProductPrices(previousItemRows)

    let strongestPriceTrend:
      | {
          productName: string
          currentUnitCents: number
          previousUnitCents: number
          changePercent: number
        }
      | null = null

    for (const [key, current] of currentProductPrices.entries()) {
      const previous = previousProductPrices.get(key)
      if (!previous || previous.totalQuantity <= 0 || current.totalQuantity <= 0) continue

      const currentUnitCents = Math.round(current.totalCostCents / current.totalQuantity)
      const previousUnitCents = Math.round(previous.totalCostCents / previous.totalQuantity)
      if (previousUnitCents <= 0) continue

      const changePercent = ((currentUnitCents - previousUnitCents) / previousUnitCents) * 100
      if (!Number.isFinite(changePercent)) continue

      if (
        !strongestPriceTrend ||
        Math.abs(changePercent) > Math.abs(strongestPriceTrend.changePercent)
      ) {
        strongestPriceTrend = {
          productName: current.displayName,
          currentUnitCents,
          previousUnitCents,
          changePercent,
        }
      }
    }

    const resolveCategoryRoot = (item: ReceiptItemRow): { name: string; emoji: string } => {
      const category = resolveRelation(item.categories)
      if (!category) return { name: 'Sonstiges', emoji: '📦' }

      if (category.parent_id) {
        const parent = parentCategoryMap.get(category.parent_id)
        if (parent) {
          return { name: parent.name, emoji: parent.emoji || '📦' }
        }
      }

      return { name: category.name, emoji: category.emoji || '📦' }
    }

    const aggregateCategorySpend = (items: ReceiptItemRow[]) => {
      const map = new Map<string, { amountCents: number; emoji: string }>()
      for (const item of items) {
        const root = resolveCategoryRoot(item)
        const quantity = item.quantity > 0 ? item.quantity : 1
        const amount = item.price_cents * quantity
        const existing = map.get(root.name)
        if (existing) {
          existing.amountCents += amount
        } else {
          map.set(root.name, { amountCents: amount, emoji: root.emoji })
        }
      }
      return map
    }

    const currentCategorySpend = aggregateCategorySpend(selectedItemRows)
    const previousCategorySpend = aggregateCategorySpend(previousItemRows)

    let strongestCategoryTrend:
      | {
          categoryName: string
          emoji: string
          currentAmountCents: number
          previousAmountCents: number
          changePercent: number
        }
      | null = null

    const categoryNames = new Set([
      ...currentCategorySpend.keys(),
      ...previousCategorySpend.keys(),
    ])

    for (const categoryName of categoryNames) {
      const current = currentCategorySpend.get(categoryName)
      const previous = previousCategorySpend.get(categoryName)
      const currentAmountCents = current?.amountCents || 0
      const previousAmountCents = previous?.amountCents || 0
      if (currentAmountCents === 0 && previousAmountCents === 0) continue

      const changePercent =
        previousAmountCents > 0
          ? ((currentAmountCents - previousAmountCents) / previousAmountCents) * 100
          : 100

      if (
        !strongestCategoryTrend ||
        Math.abs(changePercent) > Math.abs(strongestCategoryTrend.changePercent)
      ) {
        strongestCategoryTrend = {
          categoryName,
          emoji: current?.emoji || previous?.emoji || '📦',
          currentAmountCents,
          previousAmountCents,
          changePercent,
        }
      }
    }

    let categoryTrend: InsightsData['categoryTrend']
    if (strongestPriceTrend && Math.abs(strongestPriceTrend.changePercent) >= 5) {
      const direction = strongestPriceTrend.changePercent >= 0 ? 'teurer' : 'günstiger'
      categoryTrend = {
        title: `Preistrend: ${strongestPriceTrend.productName}`,
        description: `${strongestPriceTrend.productName} ist ${Math.abs(strongestPriceTrend.changePercent).toFixed(0)}% ${direction} als im Vormonat (${formatCurrency(strongestPriceTrend.previousUnitCents)} → ${formatCurrency(strongestPriceTrend.currentUnitCents)} je Einheit).`,
        emoji: strongestPriceTrend.changePercent >= 0 ? '📈' : '📉',
      }
    } else if (strongestCategoryTrend) {
      const direction = strongestCategoryTrend.changePercent >= 0 ? 'gestiegen' : 'gesunken'
      categoryTrend = {
        title: `Kategorie-Trend: ${strongestCategoryTrend.categoryName}`,
        description: `${strongestCategoryTrend.categoryName} ist um ${Math.abs(strongestCategoryTrend.changePercent).toFixed(0)}% ${direction} (${formatCurrency(strongestCategoryTrend.previousAmountCents)} → ${formatCurrency(strongestCategoryTrend.currentAmountCents)}).`,
        emoji: strongestCategoryTrend.emoji,
      }
    } else {
      categoryTrend = {
        title: `Preistrend ${monthLabel}`,
        description: 'Noch kein belastbarer Trend gegenüber dem Vormonat verfügbar.',
        emoji: '📊',
      }
    }

    const savingsPotentialCents = Math.max(0, retailerSavingsCents + offerSavingsCents)

    const tips: Tip[] = []
    if (savingsPotentialCents >= 500) {
      tips.push({
        id: 'tip-potential',
        icon: '💸',
        title: 'Sparpotenzial aktivieren',
        description: `In ${monthLabel} liegen realistisch etwa ${formatCurrency(savingsPotentialCents)} Potenzial.`,
        iconBgColor: 'bg-emerald-100',
        iconColor: 'text-emerald-700',
      })
    }

    if (retailerSavingsCents >= 300 && topSwitch) {
      tips.push({
        id: 'tip-retailer',
        icon: '🏬',
        title: 'Händlerwechsel nutzen',
        description: `${topSwitch.from} → ${topSwitch.to} spart geschätzt ${formatCurrency(topSwitch.savingsCents)}.`,
        iconBgColor: 'bg-sky-100',
        iconColor: 'text-sky-700',
      })
    }

    if (offerSavingsCents >= 200 && bestOfferOpportunity) {
      tips.push({
        id: 'tip-offers',
        icon: '🏷',
        title: 'Angebote gezielt kaufen',
        description: `${bestOfferOpportunity.productName} ist aktuell bei ${bestOfferOpportunity.store} deutlich günstiger.`,
        iconBgColor: 'bg-orange-100',
        iconColor: 'text-orange-700',
      })
    }

    if (weekdaySpreadPercent >= 15) {
      tips.push({
        id: 'tip-weekday',
        icon: '📅',
        title: 'Einkaufstag optimieren',
        description: `Zwischen dem günstigsten und teuersten Wochentag liegen aktuell ${weekdaySpreadPercent}% Unterschied.`,
        iconBgColor: 'bg-indigo-100',
        iconColor: 'text-indigo-700',
      })
    }

    if (
      strongestPriceTrend &&
      strongestPriceTrend.changePercent >= 8 &&
      tips.every((tip) => tip.id !== 'tip-price-up')
    ) {
      tips.push({
        id: 'tip-price-up',
        icon: '📈',
        title: 'Preisanstieg im Blick behalten',
        description: `${strongestPriceTrend.productName} ist deutlich teurer als im Vormonat.`,
        iconBgColor: 'bg-rose-100',
        iconColor: 'text-rose-700',
      })
    }

    if (tips.length === 0) {
      tips.push({
        id: 'tip-stable',
        icon: '✅',
        title: 'Einkauf aktuell stabil',
        description: 'Der Monat zeigt keine großen Ausreißer. Weiter so beim strukturierten Einkaufen.',
        iconBgColor: 'bg-slate-100',
        iconColor: 'text-slate-700',
      })
    }

    const insights: InsightsData = {
      savingsPotentialCents,
      efficiencyPercentage,
      isEfficiencyPositive,
      bestDays,
      bestDayDescription,
      retailerOptimization,
      categoryTrend,
      tips: tips.slice(0, 3),
      meta: {
        generatedAt,
        receiptCount: selectedReceipts.length,
        comparableProducts,
        dataQuality: calculateDataQuality(selectedReceipts.length, comparableProducts),
      },
    }

    await serverCache.set(cacheKey, insights, INSIGHTS_CACHE_TTL_MS)
    return insights
  } catch (error) {
    logger.error('[insights] Failed to build insights data', error, {
      householdId,
      year,
      month,
    })

    return createDefaultInsights(generatedAt, monthLabel)
  }
}
