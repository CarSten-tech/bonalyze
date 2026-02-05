'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Download, Share2, Shield, Calendar, Receipt } from 'lucide-react'
import { format, differenceInMonths, differenceInDays, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { toast } from 'sonner'

import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface WarrantyDetail {
  id: string
  product_name: string
  warranty_end_date: string
  receipt_id: string
  receipts: {
    date: string
    image_url: string | null
    merchants: {
      name: string
    } | null
    total_amount_cents: number
  }
}

export default function WarrantyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [item, setItem] = useState<WarrantyDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadDetail() {
      if (!params.id) return
      
      const supabase = createClient()
      const { data, error } = await supabase
        .from('receipt_items')
        .select(`
          id,
          product_name,
          warranty_end_date,
          receipt_id,
          receipts (
            date,
            image_url,
            total_amount_cents,
            merchants (name)
          )
        `)
        .eq('id', params.id)
        .single()
      
      if (error) {
        console.error("Error loading warranty detail:", error)
        toast.error("Garantie nicht gefunden")
        router.push('/dashboard/warranties')
      } else {
        setItem(data as unknown as WarrantyDetail)
      }
      setIsLoading(false)
    }

    loadDetail()
  }, [params.id, router])

  const handleShare = async () => {
    if (!item?.receipts?.image_url) return

    try {
       // Check if Web Share API is available
       if (navigator.share) {
         await navigator.share({
           title: 'Garantie-Beleg: ' + item.product_name,
           text: `Garantie-Dokument für ${item.product_name} (Kaufdatum: ${format(parseISO(item.receipts.date), 'dd.MM.yyyy')})`,
           url: item.receipts.image_url
         })
       } else {
         // Fallback: Copy to clipboard
         await navigator.clipboard.writeText(item.receipts.image_url)
         toast.success("Link in Zwischenablage kopiert")
       }
    } catch (err) {
      console.error("Share failed:", err)
    }
  }

  const handleDownload = async () => {
    if (!item?.receipts?.image_url) return
    
    // For simple image download in same origin or CORS allowed
    const link = document.createElement('a')
    link.href = item.receipts.image_url
    link.download = `Garantie-${item.product_name}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    )
  }

  if (!item) return null

  const endDate = parseISO(item.warranty_end_date)
  const purchaseDate = parseISO(item.receipts.date)
  const daysLeft = differenceInDays(endDate, new Date())
  const isExpired = daysLeft < 0

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header (Dark mode for focus) */}
      <header className="px-4 h-16 flex items-center justify-between text-white">
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-white hover:bg-white/10 -ml-2"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div className="text-center">
           <h1 className="font-semibold text-base leading-tight">{item.product_name}</h1>
           <p className="text-xs text-slate-400">
             {item.receipts.merchants?.name || 'Händler unbekannt'}
           </p>
        </div>
        <div className="w-10"></div> {/* Spacer */}
      </header>
      
      {/* Main Content - Document Viewer */}
      <div className="flex-1 relative flex items-center justify-center p-4 bg-slate-950/50">
        {item.receipts.image_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img 
            src={item.receipts.image_url} 
            alt="Beleg" 
            className="max-h-[70vh] w-auto max-w-full rounded-lg shadow-2xl object-contain" 
          />
        ) : (
          <div className="text-slate-500 flex flex-col items-center">
            <Receipt className="h-16 w-16 mb-4 opacity-50" />
            <p>Kein Belegbild vorhanden</p>
          </div>
        )}

        {/* Status Chip Overlay */}
        <div className="absolute top-4 right-4">
           {isExpired ? (
             <Badge variant="destructive" className="bg-red-500/90 hover:bg-red-500 border-0">
               ABGELAUFEN
             </Badge>
           ) : (
             <Badge variant="secondary" className="bg-green-500/90 text-white hover:bg-green-500 border-0">
               Aktiv: Noch {Math.floor(daysLeft / 30)} Monate
             </Badge>
           )}
        </div>
      </div>

      {/* Bottom Action Sheet */}
      <div className="bg-slate-900 border-t border-slate-800 p-6 pb-10 rounded-t-3xl mt-[-20px] relative z-10">
         <div className="grid grid-cols-2 gap-4">
             <div className="bg-slate-800/50 p-4 rounded-xl">
                <p className="text-slate-400 text-xs uppercase tracking-wider font-bold mb-1">Gekauft am</p>
                <div className="flex items-center gap-2 text-white font-medium">
                  <Calendar className="h-4 w-4 text-primary" />
                  {format(purchaseDate, 'dd.MM.yyyy')}
                </div>
             </div>
             <div className="bg-slate-800/50 p-4 rounded-xl">
                <p className="text-slate-400 text-xs uppercase tracking-wider font-bold mb-1">Garantie bis</p>
                <div className="flex items-center gap-2 text-white font-medium">
                  <Shield className="h-4 w-4 text-primary" />
                  {format(endDate, 'dd.MM.yyyy')}
                </div>
             </div>
         </div>

         <div className="flex gap-3 mt-6">
            <Button 
               className="flex-1 bg-white text-slate-900 hover:bg-slate-200 h-12 rounded-xl font-bold"
               onClick={handleShare}
            >
               <Share2 className="mr-2 h-4 w-4" />
               Teilen
            </Button>
            <Button 
               variant="outline"
               className="flex-1 border-slate-700 text-white hover:bg-slate-800 hover:text-white bg-transparent h-12 rounded-xl border-2 font-bold"
               onClick={handleDownload}
            >
               <Download className="mr-2 h-4 w-4" />
               Download
            </Button>
         </div>
      </div>
    </div>
  )
}
