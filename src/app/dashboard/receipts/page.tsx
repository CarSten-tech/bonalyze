'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Filter, X, Loader2, Receipt } from 'lucide-react'
import Link from 'next/link'

import { createClient } from '@/lib/supabase'
import { useHousehold } from '@/contexts/household-context'
import { ReceiptCard } from '@/components/receipts/receipt-card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'

interface ReceiptWithDetails {
  id: string
  date: string
  total_amount_cents: number
  merchant_id: string | null
  created_by: string
  merchants: { name: string } | null
  profiles: { display_name: string } | null
  receipt_items: { id: string }[]
}

interface Merchant {
  id: string
  name: string
}

interface HouseholdMember {
  user_id: string
  profiles: { display_name: string } | null
}

type TimeFilter = 'all' | 'this-month' | 'last-month' | 'last-3-months'

export default function ReceiptsPage() {
  const { currentHousehold, isLoading: isHouseholdLoading } = useHousehold()
  const [receipts, setReceipts] = useState<ReceiptWithDetails[]>([])
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [members, setMembers] = useState<HouseholdMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter State
  const [merchantFilter, setMerchantFilter] = useState<string>('all')
  const [memberFilter, setMemberFilter] = useState<string>('all')
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')

  const supabase = createClient()

  const loadFilterOptions = useCallback(async () => {
    if (!currentHousehold) return

    // Load merchants used in this household's receipts
    const { data: householdReceipts } = await supabase
      .from('receipts')
      .select('merchant_id, merchants(id, name)')
      .eq('household_id', currentHousehold.id)
      .not('merchant_id', 'is', null)

    if (householdReceipts) {
      const uniqueMerchants = new Map<string, Merchant>()
      householdReceipts.forEach((r) => {
        if (r.merchants && r.merchant_id) {
          uniqueMerchants.set(r.merchant_id, r.merchants as Merchant)
        }
      })
      setMerchants(Array.from(uniqueMerchants.values()))
    }

    // Load household members
    const { data: householdMembers } = await supabase
      .from('household_members')
      .select('user_id, profiles(display_name)')
      .eq('household_id', currentHousehold.id)

    if (householdMembers) {
      setMembers(householdMembers as HouseholdMember[])
    }
  }, [currentHousehold, supabase])

  const loadReceipts = useCallback(async () => {
    if (!currentHousehold) return

    setIsLoading(true)
    setError(null)

    let query = supabase
      .from('receipts')
      .select(`
        id,
        date,
        total_amount_cents,
        merchant_id,
        created_by,
        merchants(name),
        profiles(display_name),
        receipt_items(id)
      `)
      .eq('household_id', currentHousehold.id)
      .order('date', { ascending: false })

    // Apply merchant filter
    if (merchantFilter !== 'all') {
      query = query.eq('merchant_id', merchantFilter)
    }

    // Apply member filter
    if (memberFilter !== 'all') {
      query = query.eq('created_by', memberFilter)
    }

    // Apply time filter
    const now = new Date()
    if (timeFilter === 'this-month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      query = query.gte('date', startOfMonth.toISOString().split('T')[0])
    } else if (timeFilter === 'last-month') {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
      query = query
        .gte('date', startOfLastMonth.toISOString().split('T')[0])
        .lte('date', endOfLastMonth.toISOString().split('T')[0])
    } else if (timeFilter === 'last-3-months') {
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)
      query = query.gte('date', threeMonthsAgo.toISOString().split('T')[0])
    }

    const { data, error: queryError } = await query

    if (queryError) {
      console.error('Error loading receipts:', queryError)
      setError('Fehler beim Laden der Kassenbons')
      setIsLoading(false)
      return
    }

    setReceipts(data as ReceiptWithDetails[])
    setIsLoading(false)
  }, [currentHousehold, supabase, merchantFilter, memberFilter, timeFilter])

  useEffect(() => {
    if (currentHousehold) {
      loadFilterOptions()
    }
  }, [currentHousehold, loadFilterOptions])

  useEffect(() => {
    if (currentHousehold) {
      loadReceipts()
    }
  }, [currentHousehold, loadReceipts])

  const hasActiveFilters = merchantFilter !== 'all' || memberFilter !== 'all' || timeFilter !== 'all'

  const resetFilters = () => {
    setMerchantFilter('all')
    setMemberFilter('all')
    setTimeFilter('all')
  }

  // Group receipts by month
  const groupedReceipts = receipts.reduce((groups, receipt) => {
    const date = new Date(receipt.date)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const monthLabel = date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })

    if (!groups[monthKey]) {
      groups[monthKey] = { label: monthLabel, receipts: [] }
    }
    groups[monthKey].receipts.push(receipt)
    return groups
  }, {} as Record<string, { label: string; receipts: ReceiptWithDetails[] }>)

  const sortedMonthKeys = Object.keys(groupedReceipts).sort((a, b) => b.localeCompare(a))

  if (isHouseholdLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kassenbons</h1>
        <Button asChild>
          <Link href="/dashboard/receipts/new">
            <Plus className="h-4 w-4 mr-2" />
            Neuer Kassenbon
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span className="text-sm">Filter:</span>
        </div>

        <Select value={merchantFilter} onValueChange={setMerchantFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Alle Stores" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Stores</SelectItem>
            {merchants.map((merchant) => (
              <SelectItem key={merchant.id} value={merchant.id}>
                {merchant.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Zeitraum" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Zeiten</SelectItem>
            <SelectItem value="this-month">Dieser Monat</SelectItem>
            <SelectItem value="last-month">Letzter Monat</SelectItem>
            <SelectItem value="last-3-months">Letzte 3 Monate</SelectItem>
          </SelectContent>
        </Select>

        <Select value={memberFilter} onValueChange={setMemberFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Alle Mitglieder" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Mitglieder</SelectItem>
            {members.map((member) => (
              <SelectItem key={member.user_id} value={member.user_id}>
                {member.profiles?.display_name || 'Unbekannt'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <X className="h-4 w-4 mr-1" />
            Zurücksetzen
          </Button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-destructive">{error}</p>
          <Button variant="outline" className="mt-4" onClick={loadReceipts}>
            Erneut versuchen
          </Button>
        </div>
      ) : receipts.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Receipt className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <div>
            <p className="text-lg font-medium">
              {hasActiveFilters ? 'Keine Ergebnisse' : 'Noch keine Kassenbons'}
            </p>
            <p className="text-muted-foreground mt-1">
              {hasActiveFilters
                ? 'Versuche andere Filter oder setze sie zurück.'
                : 'Erfasse deinen ersten Kassenbon!'}
            </p>
          </div>
          {hasActiveFilters ? (
            <Button variant="outline" onClick={resetFilters}>
              Filter zurücksetzen
            </Button>
          ) : (
            <Button asChild>
              <Link href="/dashboard/receipts/new">
                <Plus className="h-4 w-4 mr-2" />
                Ersten Kassenbon erfassen
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {sortedMonthKeys.map((monthKey) => (
            <div key={monthKey} className="space-y-3">
              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-sm text-muted-foreground font-medium">
                  {groupedReceipts[monthKey].label}
                </span>
                <Separator className="flex-1" />
              </div>
              <div className="space-y-2">
                {groupedReceipts[monthKey].receipts.map((receipt) => (
                  <ReceiptCard
                    key={receipt.id}
                    id={receipt.id}
                    merchantName={receipt.merchants?.name || 'Unbekannter Store'}
                    date={receipt.date}
                    totalAmountCents={receipt.total_amount_cents}
                    itemCount={receipt.receipt_items?.length || 0}
                    paidByName={receipt.profiles?.display_name || 'Unbekannt'}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
