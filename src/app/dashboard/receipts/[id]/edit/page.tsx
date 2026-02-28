'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { createClient } from '@/lib/supabase'
import { useHousehold } from '@/contexts/household-context'
import { Button } from '@/components/ui/button'
import { ReceiptEditor } from '@/components/receipts/receipt-editor'
import type { ReceiptItemDraft } from '@/components/receipts/receipt-item-card'

interface ReceiptItemRow {
  id: string
  product_name: string
  quantity: number
  price_cents: number
  is_warranty_item: boolean | null
  warranty_end_date: string | null
  estimated_calories_kcal: number | null
  estimated_weight_g: number | null
  estimated_protein_g: number | null
  estimated_carbs_g: number | null
  estimated_fat_g: number | null
  is_food_item: boolean | null
  categories: { name: string } | null
}

interface ReceiptRow {
  id: string
  merchant_id: string | null
  date: string
  created_by: string
  image_url: string | null
  receipt_items: ReceiptItemRow[]
}

interface ExistingReceiptData {
  merchantId: string | null
  date: string
  paidBy: string
  imagePath: string | null
  items: ReceiptItemDraft[]
}

export default function EditReceiptPage() {
  const params = useParams()
  const router = useRouter()
  const { currentHousehold, isLoading: isHouseholdLoading } = useHousehold()
  const supabase = useMemo(() => createClient(), [])

  const receiptId = params.id as string

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [existingReceipt, setExistingReceipt] = useState<ExistingReceiptData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadEditData() {
      if (!currentHousehold || !receiptId) return

      setIsLoading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login')
        return
      }

      setCurrentUserId(user.id)

      const { data, error } = await supabase
        .from('receipts')
        .select(`
          id,
          merchant_id,
          date,
          created_by,
          image_url,
          receipt_items (
            id,
            product_name,
            quantity,
            price_cents,
            is_warranty_item,
            warranty_end_date,
            estimated_calories_kcal,
            estimated_weight_g,
            estimated_protein_g,
            estimated_carbs_g,
            estimated_fat_g,
            is_food_item,
            categories (
              name
            )
          )
        `)
        .eq('id', receiptId)
        .eq('household_id', currentHousehold.id)
        .single()

      if (error || !data) {
        console.error('Error loading receipt for edit:', error)
        toast.error('Kassenbon konnte nicht geladen werden')
        router.replace('/dashboard/receipts')
        return
      }

      const typedData = data as unknown as ReceiptRow
      const mappedItems: ReceiptItemDraft[] = (typedData.receipt_items || []).map((item) => ({
        id: item.id,
        productName: item.product_name,
        quantity: item.quantity || 1,
        priceCents: item.price_cents || 0,
        subcategory: item.categories?.name || undefined,
        isWarranty: !!item.is_warranty_item,
        warrantyEndDate: item.warranty_end_date ? new Date(item.warranty_end_date) : undefined,
        estimatedCaloriesKcal: item.estimated_calories_kcal || 0,
        estimatedWeightG: item.estimated_weight_g || 0,
        estimatedProteinG: item.estimated_protein_g || 0,
        estimatedCarbsG: item.estimated_carbs_g || 0,
        estimatedFatG: item.estimated_fat_g || 0,
        isFoodItem: item.is_food_item ?? true,
      }))

      setExistingReceipt({
        merchantId: typedData.merchant_id,
        date: typedData.date,
        paidBy: typedData.created_by,
        imagePath: typedData.image_url,
        items: mappedItems,
      })

      setIsLoading(false)
    }

    void loadEditData()
  }, [currentHousehold, receiptId, router, supabase])

  if (isHouseholdLoading || isLoading || !currentUserId || !existingReceipt) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!currentHousehold) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Kassenbon bearbeiten</h1>
        <p className="text-muted-foreground">Bitte wähle einen Haushalt aus.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/receipts/${receiptId}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-xl font-bold">Kassenbon bearbeiten</h1>
      </div>

      <ReceiptEditor
        householdId={currentHousehold.id}
        currentUserId={currentUserId}
        mode="edit"
        receiptId={receiptId}
        existingReceipt={existingReceipt}
        onCancel={() => router.push(`/dashboard/receipts/${receiptId}`)}
      />
    </div>
  )
}
