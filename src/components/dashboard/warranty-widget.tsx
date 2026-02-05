'use client'

import { useEffect, useState } from 'react'
import { ShieldAlert, Check } from 'lucide-react'
import { differenceInDays, parseISO, addDays } from 'date-fns'
import { createClient } from '@/lib/supabase'
import { useHousehold } from '@/contexts/household-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

interface WarrantyItem {
  id: string
  product_name: string
  warranty_end_date: string
}

export function WarrantyWidget() {
  const { currentHousehold } = useHousehold()
  const [expiringItem, setExpiringItem] = useState<WarrantyItem | null>(null)

  useEffect(() => {
    if (!currentHousehold) return

    const checkExpiring = async () => {
      const supabase = createClient()
      const now = new Date()
      const thirtyDaysFromNow = addDays(now, 30)

      // Find FIRST expiring item that hasn't been acknowledged
      const { data } = await supabase
        .from('receipt_items')
        .select('id, product_name, warranty_end_date')
        .eq('is_warranty_item', true)
        .eq('expiry_acknowledged', false) // Only show if not dismissed
        //.eq('receipts.household_id', currentHousehold.id) // Inner join filtering is complex in JS client without join
        // Simplified query: get candidate items then filter by household in memory or use proper RPC/foreign table filter
        // For simplicity & speed in standard client:
        .lte('warranty_end_date', thirtyDaysFromNow.toISOString())
        .gte('warranty_end_date', now.toISOString())
        .order('warranty_end_date', { ascending: true })
        .limit(20) // Fetch a few to filter by household

      if (data && data.length > 0) {
        // We need to verify household ownership since we removed the inner join filter for simplicity above
        // or re-add it properly. Let's do the inner join properly.
        const { data: verifiedData } = await supabase
          .from('receipt_items')
          .select(`
            id,
            product_name,
            warranty_end_date,
            receipts!inner ( household_id )
          `)
          .eq('is_warranty_item', true)
          .eq('expiry_acknowledged', false)
          .eq('receipts.household_id', currentHousehold.id)
          .lte('warranty_end_date', thirtyDaysFromNow.toISOString())
          .gte('warranty_end_date', now.toISOString())
          .order('warranty_end_date', { ascending: true })
          .limit(1)
          .single()

        if (verifiedData) {
          setExpiringItem({
             id: verifiedData.id,
             product_name: verifiedData.product_name,
             warranty_end_date: verifiedData.warranty_end_date || ''
          })
        } else {
          setExpiringItem(null)
        }
      }
    }

    checkExpiring()
  }, [currentHousehold])

  const handleDismiss = async () => {
    if (!expiringItem) return
    
    // Optimistic UI
    const itemToDismiss = expiringItem
    setExpiringItem(null)

    const supabase = createClient()
    const { error } = await supabase
      .from('receipt_items')
      .update({ expiry_acknowledged: true })
      .eq('id', itemToDismiss.id)

    if (error) {
      toast.error('Konnte Alarm nicht ausblenden')
      setExpiringItem(itemToDismiss) // Revert
    } else {
      toast.success('Alarm ausgeblendet')
    }
  }

  if (!expiringItem) return null

  const daysLeft = differenceInDays(parseISO(expiringItem.warranty_end_date), new Date())

  return (
    <Card className="rounded-2xl border-l-4 border-l-destructive shadow-sm bg-red-50/50 mb-6">
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <ShieldAlert className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Garantie läuft ab: {expiringItem.product_name}
            </h3>
            <p className="text-xs text-destructive font-medium">
              Nur noch {daysLeft} Tage gültig
            </p>
          </div>
        </div>
        <Button 
           size="icon" 
           variant="ghost" 
           className="h-8 w-8 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-full"
           onClick={handleDismiss}
           title="Gesehen / Ausblenden"
        >
          <Check className="h-5 w-5" />
        </Button>
      </CardContent>
    </Card>
  )
}
