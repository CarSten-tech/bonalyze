'use client'

import { useEffect, useState } from 'react'
import { Bell, Search, Filter, X } from 'lucide-react'
import { format, differenceInDays, getMonth, getYear } from 'date-fns'
import { de } from 'date-fns/locale'

import { createClient } from '@/lib/supabase'
import { useHousehold } from '@/contexts/household-context'
import { WarrantyStats } from '@/components/warranties/warranty-stats'
import { WarrantyList } from '@/components/warranties/warranty-list'
import { WarrantyItem } from '@/components/warranties/warranty-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function WarrantyPage() {
  const { currentHousehold } = useHousehold()
  const [items, setItems] = useState<WarrantyItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filter State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMonth, setSelectedMonth] = useState<string>('all')
  const [selectedYear, setSelectedYear] = useState<string>('all')

  useEffect(() => {
    async function fetchWarranties() {
      if (!currentHousehold) {
        setItems([])
        setIsLoading(false)
        return
      }
      
      const supabase = createClient()
      const { data, error } = await supabase
        .from('receipt_items')
        .select(`
          id,
          product_name,
          warranty_end_date,
          is_warranty_item,
          receipts!inner (
            id,
            date,
            image_url,
            merchants (name)
          )
        `)
        .eq('is_warranty_item', true)
        .eq('receipts.household_id', currentHousehold.id)
        .order('warranty_end_date', { ascending: true })

      if (error) {
        console.error("Failed to fetch warranties", error)
      } else {
        const mappedItems: WarrantyItem[] = data.map((d: any) => ({
          id: d.id,
          product_name: d.product_name,
          warranty_end_date: d.warranty_end_date,
          purchase_date: d.receipts.date,
          is_ai_detected: true, // Simplified assumption
          merchant_name: d.receipts.merchants?.name,
          image_url: d.receipts.image_url
        }))
        setItems(mappedItems)
      }
      setIsLoading(false)
    }

    fetchWarranties()
  }, [currentHousehold])

  // Stats calculation (on ALL items, not filtered)
  const activeItems = items.filter(i => new Date(i.warranty_end_date) > new Date())
  const expiringItems = items.filter(i => {
    const days = differenceInDays(new Date(i.warranty_end_date), new Date())
    return days >= 0 && days <= 30
  })

  // Filtering Logic
  const filteredItems = items.filter(item => {
    // 1. Search
    const query = searchQuery.toLowerCase()
    const matchesSearch = 
      item.product_name.toLowerCase().includes(query) || 
      (item.merchant_name || '').toLowerCase().includes(query)

    if (!matchesSearch) return false

    // 2. Date Filter
    if (selectedMonth !== 'all' || selectedYear !== 'all') {
      const endDate = new Date(item.warranty_end_date)
      
      if (selectedMonth !== 'all') {
        const itemMonth = getMonth(endDate).toString() // 0-11
        if (itemMonth !== selectedMonth) return false
      }

      if (selectedYear !== 'all') {
        const itemYear = getYear(endDate).toString()
        if (itemYear !== selectedYear) return false
      }
    }

    return true
  })

  // Generate Year Options (Current -5 to +5 years?? Or based on data?)
  // Let's do a dynamic range around current year
  const currentYearInt = new Date().getFullYear()
  const years = Array.from({ length: 11 }, (_, i) => (currentYearInt - 5 + i).toString())

  const months = [
    { value: '0', label: 'Januar' },
    { value: '1', label: 'Februar' },
    { value: '2', label: 'März' },
    { value: '3', label: 'April' },
    { value: '4', label: 'Mai' },
    { value: '5', label: 'Juni' },
    { value: '6', label: 'Juli' },
    { value: '7', label: 'August' },
    { value: '8', label: 'September' },
    { value: '9', label: 'Oktober' },
    { value: '10', label: 'November' },
    { value: '11', label: 'Dezember' },
  ]

  const hasActiveFilters = searchQuery || selectedMonth !== 'all' || selectedYear !== 'all'

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200/50 px-4 h-14 flex items-center justify-between">
        <Button variant="ghost" size="icon" className="-ml-2" onClick={() => window.history.back()}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19 12H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </Button>
        <span className="font-semibold text-slate-900">Garantie-Safe</span>
        <Button variant="ghost" size="icon" className="-mr-2 text-primary">
          <Bell className="w-5 h-5 fill-current" />
        </Button>
      </header>

      <div className="px-4 pt-6 space-y-6">
        {/* Stats */}
        <WarrantyStats 
          activeCount={activeItems.length} 
          expiringCount={expiringItems.length} 
        />

        {/* Search & Filter Section */}
        <div className="space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Suchen (z.B. Dyson, MediaMarkt)..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white border-slate-200/60 shadow-sm focus-visible:ring-primary/20"
            />
            {searchQuery && (
               <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                 <X className="h-4 w-4" />
               </button>
            )}
          </div>

          {/* Date Filters */}
          <div className="flex gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="flex-1 bg-white border-slate-200/60 shadow-sm">
                <SelectValue placeholder="Monat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Monate</SelectItem>
                {months.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="flex-1 bg-white border-slate-200/60 shadow-sm">
                <SelectValue placeholder="Jahr" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Jahre</SelectItem>
                {years.map(y => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Active Filter Indicator */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
               <span>Ergebnisse: {filteredItems.length}</span>
               <button 
                onClick={() => {
                  setSearchQuery('')
                  setSelectedMonth('all')
                  setSelectedYear('all')
                }}
                className="text-primary hover:underline font-medium"
               >
                 Filter zurücksetzen
               </button>
            </div>
          )}
        </div>

        {/* List Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
               {hasActiveFilters ? 'Suchergebnisse' : 'Garantie-Dokumente'}
            </h2>
          </div>
          
          <WarrantyList items={filteredItems} isLoading={isLoading} />
        </div>
      </div>
    </div>
  )
}
