'use client'

import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { de } from 'date-fns/locale'

import { createClient } from '@/lib/supabase'
import { useHousehold } from '@/contexts/household-context'
import { WarrantyStats } from '@/components/warranties/warranty-stats'
import { WarrantyList } from '@/components/warranties/warranty-list'
import { WarrantyItem } from '@/components/warranties/warranty-card'
import { Button } from '@/components/ui/button'

export default function WarrantyPage() {
  const { currentHousehold } = useHousehold()
  const [items, setItems] = useState<WarrantyItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

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

  // Stats calculation
  const activeItems = items.filter(i => new Date(i.warranty_end_date) > new Date())
  const expiringItems = items.filter(i => {
    const days = differenceInDays(new Date(i.warranty_end_date), new Date())
    return days >= 0 && days <= 30
  })

  // Timeline Helper (Visual Only - simplified)
  const currentMonth = format(new Date(), 'MMMM', { locale: de }).toUpperCase()
  const currentYear = format(new Date(), 'yyyy')
  const prevMonth = format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'MMMM', { locale: de }).toUpperCase()
  const nextMonth = format(new Date(new Date().setMonth(new Date().getMonth() + 1)), 'MMMM', { locale: de }).toUpperCase()

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

      <div className="px-4 pt-6 space-y-8">
        {/* Timeline Visual (Static for Vibe) */}
        <div className="flex flex-col items-center gap-1 opacity-60">
           <div className="flex justify-between w-full max-w-xs text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4">
              <span>{prevMonth}</span>
              <span>{Number(currentYear)-1}</span>
           </div>
           
           <div className="w-full max-w-sm bg-primary/10 text-primary py-2 rounded-xl flex justify-between px-8 font-bold shadow-sm">
              <span>{currentMonth}</span>
              <span>{currentYear}</span>
           </div>

           <div className="flex justify-between w-full max-w-xs text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4">
              <span>{nextMonth}</span>
              <span>{Number(currentYear)+1}</span>
           </div>
        </div>

        {/* Stats */}
        <WarrantyStats 
          activeCount={activeItems.length} 
          expiringCount={expiringItems.length} 
        />

        {/* List Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Garantie-Dokumente</h2>
            <Button variant="ghost" size="sm" className="text-primary text-xs font-semibold hover:bg-transparent">
              Alle anzeigen
            </Button>
          </div>
          
          <WarrantyList items={items} isLoading={isLoading} />
        </div>
      </div>
    </div>
  )
}
