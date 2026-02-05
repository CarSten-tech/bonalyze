'use client'

import { useEffect, useState } from 'react'
import { Shield, ShieldAlert, ChevronRight } from 'lucide-react'
import { differenceInDays, parseISO, format } from 'date-fns'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase'
import { useHousehold } from '@/contexts/household-context'
import { Skeleton } from '@/components/ui/skeleton'

interface WarrantyItem {
  id: string
  product_name: string
  warranty_end_date: string
  receipts: {
    merchants: {
      name: string
    } | null
    date: string
  } | null
}

export function WarrantyWidget() {
  const { currentHousehold } = useHousehold()
  const [items, setItems] = useState<WarrantyItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadWarranties() {
      if (!currentHousehold) {
        setItems([])
        setLoading(false)
        return
      }

      const supabase = createClient()
      const { data, error } = await supabase
        .from('receipt_items')
        .select(`
          id,
          product_name,
          warranty_end_date,
          receipts!inner (
            household_id,
            date,
            merchants (name)
          )
        `)
        .eq('is_warranty_item', true)
        .eq('receipts.household_id', currentHousehold.id)
        .gte('warranty_end_date', new Date().toISOString()) // Only active
        .order('warranty_end_date', { ascending: true })
        .limit(3)

      if (data) {
        const typedData = data as unknown as WarrantyItem[]
        setItems(typedData)
      } else if (error) {
         console.error("Error loading warranties:", error)
      }
      setLoading(false)
    }

    loadWarranties()
  }, [currentHousehold])

  if (loading) {
    return <Skeleton className="h-[200px] w-full rounded-xl" />
  }

  if (items.length === 0) return null

  return (
    <Card className="rounded-2xl border-0 shadow-elevation-1 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
        <div className="flex items-center gap-2">
           <Shield className="h-5 w-5 text-blue-600" />
           <CardTitle className="text-base font-semibold text-blue-900 dark:text-blue-100">Warranty Vault</CardTitle>
        </div>
        <Button variant="ghost" size="sm" className="h-8 text-xs text-blue-600 hover:text-blue-700">
           ALLE <ChevronRight className="ml-1 h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((item) => {
            const endDate = parseISO(item.warranty_end_date)
            const daysLeft = differenceInDays(endDate, new Date())
            const isExpiringSoon = daysLeft < 30

            return (
              <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                <div className="space-y-1">
                  <p className="font-medium text-sm line-clamp-1">{item.product_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.receipts?.merchants?.name} • {item.receipts?.date && format(parseISO(item.receipts.date), 'dd.MM.yyyy')}
                  </p>
                </div>
                <div className="text-right">
                  {isExpiringSoon ? (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <ShieldAlert className="h-3 w-3" />
                      {daysLeft} Tage
                    </Badge>
                  ) : (
                     <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5">
                        {Math.floor(daysLeft / 30)} Mon.
                     </Badge>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
