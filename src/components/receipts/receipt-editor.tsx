'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { addYears } from 'date-fns'

import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'

import { DatePicker } from './date-picker'
import { StoreSelector, type Merchant } from './store-selector'
import { PayerSelector, type HouseholdMember } from './payer-selector'
import { ReceiptItemCard, type ReceiptItemDraft } from './receipt-item-card'
import { ReceiptTotals } from './receipt-totals'
import { ReceiptAIResponse } from '@/types/receipt-ai'
import { checkBudgetAlerts } from '@/app/actions/budget'

// Generate unique ID for items
function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

interface ReceiptEditorProps {
  householdId: string
  currentUserId: string
  initialData?: {
    aiResult?: ReceiptAIResponse
    imagePath?: string
    merchantMatch?: { id: string; name: string }
  }
  onCancel: () => void
}

export function ReceiptEditor({
  householdId,
  currentUserId,
  initialData,
  onCancel,
}: ReceiptEditorProps) {
  const router = useRouter()
  const supabase = createClient()

  // Data loading states
  const [merchants, setMerchants] = React.useState<Merchant[]>([])
  const [members, setMembers] = React.useState<HouseholdMember[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  // Form state
  const [selectedMerchantId, setSelectedMerchantId] = React.useState<string | null>(null)
  const [date, setDate] = React.useState<Date | undefined>(new Date())
  const [paidBy, setPaidBy] = React.useState<string | null>(null)
  const [items, setItems] = React.useState<ReceiptItemDraft[]>([
    { id: generateId(), productName: '', quantity: 1, priceCents: 0 },
  ])
  const [imagePath, setImagePath] = React.useState<string | null>(null)

  // AI data for reference
  const [aiTotalCents, setAiTotalCents] = React.useState<number | null>(null)
  const [aiSuggestedMerchant, setAiSuggestedMerchant] = React.useState<string | null>(null)

  // Dialog state
  const [showNewMerchantDialog, setShowNewMerchantDialog] = React.useState(false)
  const [newMerchantName, setNewMerchantName] = React.useState('')
  const [isCreatingMerchant, setIsCreatingMerchant] = React.useState(false)

  // Submit state
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Load merchants and members
  React.useEffect(() => {
    async function loadData() {
      setIsLoading(true)

      // Load merchants
      const { data: merchantsData } = await supabase
        .from('merchants')
        .select('id, name')
        .order('name')

      if (merchantsData) {
        setMerchants(merchantsData)
      }

      // Load household members with profiles
      const { data: membersData } = await supabase
        .from('household_members')
        .select('user_id, profiles(display_name)')
        .eq('household_id', householdId)

      if (membersData) {
        const formattedMembers: HouseholdMember[] = membersData.map((m) => ({
          user_id: m.user_id,
          display_name:
            (m.profiles as { display_name: string } | null)?.display_name || 'Unbekannt',
        }))
        setMembers(formattedMembers)
      }

      // Set default payer to current user
      setPaidBy(currentUserId)

      setIsLoading(false)
    }

    loadData()
  }, [householdId, currentUserId, supabase])

  // Process initial AI data
  React.useEffect(() => {
    if (!initialData?.aiResult) return

    const aiResult = initialData.aiResult

    // Set date from AI
    if (aiResult.date) {
      const parsedDate = new Date(aiResult.date)
      if (!isNaN(parsedDate.getTime())) {
        setDate(parsedDate)
      }
    }

    // Set merchant from match or AI
    if (initialData.merchantMatch) {
      setSelectedMerchantId(initialData.merchantMatch.id)
    }

    // Store AI suggested merchant name for display
    if (aiResult.merchant) {
      setAiSuggestedMerchant(aiResult.merchant)
    }

    // Store AI total for comparison
    if (aiResult.total) {
      setAiTotalCents(Math.round(aiResult.total * 100))
    }

    // Set items from AI
    if (aiResult.items && aiResult.items.length > 0) {
      const scannedItems: ReceiptItemDraft[] = aiResult.items.map((item) => ({
        id: generateId(),
        productName: item.name,
        quantity: item.quantity || 1,
        priceCents: Math.round((item.total_price / (item.quantity || 1)) * 100),
        confidence: aiResult.confidence,
        category: item.category,
        subcategory: item.subcategory,
        isWarranty: item.is_warranty_candidate,
        warrantyEndDate: item.is_warranty_candidate ? addYears(new Date(), 2) : undefined,
      }))
      setItems(scannedItems)
    }

    // Set image path
    if (initialData.imagePath) {
      setImagePath(initialData.imagePath)
    }
  }, [initialData])

  // Item management
  const addItem = () => {
    setItems([...items, { id: generateId(), productName: '', quantity: 1, priceCents: 0 }])
  }

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id))
    }
  }

  const updateItem = (
    id: string,
    field: keyof ReceiptItemDraft,
    value: string | number | boolean | Date
  ) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    )
  }

  // Calculate total
  const calculatedTotalCents = Math.round(items.reduce(
    (sum, item) => sum + item.priceCents * item.quantity,
    0
  ))

  // Create new merchant
  const handleCreateMerchant = async () => {
    if (!newMerchantName.trim()) return

    setIsCreatingMerchant(true)

    const { data, error } = await supabase
      .from('merchants')
      .insert({
        name: newMerchantName.trim(),
        created_by: currentUserId,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating merchant:', error)
      toast.error('Store konnte nicht erstellt werden')
      setIsCreatingMerchant(false)
      return
    }

    setMerchants([...merchants, data])
    setSelectedMerchantId(data.id)
    setNewMerchantName('')
    setShowNewMerchantDialog(false)
    setIsCreatingMerchant(false)
    toast.success(`Store "${data.name}" wurde erstellt`)
  }

  // Submit receipt
  const handleSubmit = async () => {
    // Validation
    if (!selectedMerchantId) {
      toast.error('Bitte waehle einen Store aus')
      return
    }

    if (!date) {
      toast.error('Bitte waehle ein Datum aus')
      return
    }

    if (!paidBy) {
      toast.error('Bitte waehle aus wer bezahlt hat')
      return
    }

    const validItems = items.filter(
      (item) => item.productName.trim() && item.priceCents !== 0
    )
    if (validItems.length === 0) {
      toast.error('Bitte fuege mindestens ein Produkt hinzu')
      return
    }

    setIsSubmitting(true)

    try {
      // Create receipt
      const { data: receipt, error: receiptError } = await supabase
        .from('receipts')
        .insert({
          household_id: householdId,
          merchant_id: selectedMerchantId,
          date: date.toISOString().split('T')[0],
          total_amount_cents: calculatedTotalCents,
          created_by: paidBy,
          image_url: imagePath,
        })
        .select()
        .single()

      if (receiptError) {
        console.error('Error creating receipt:', receiptError)
        toast.error('Kassenbon konnte nicht erstellt werden')
        setIsSubmitting(false)
        return
      }

      // Look up category IDs for items with categories
      const categoryLookup = new Map<string, string>()
      const subcategoriesToLookup = validItems
        .filter(item => item.subcategory)
        .map(item => item.subcategory!)
      
      if (subcategoriesToLookup.length > 0) {
        const { data: categories } = await supabase
          .from('categories')
          .select('id, name')
          .in('name', subcategoriesToLookup)
        
        if (categories) {
          categories.forEach(cat => {
            categoryLookup.set(cat.name, cat.id)
          })
        }
      }

      // Fallback category ID for 'Sonstiges'
      const { data: fallbackCat } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', 'sonstiges')
        .single()
      const fallbackCategoryId = fallbackCat?.id || null

      // Upsert products with new prices and get IDs
      const productPromises = validItems.map(async (item) => {
        // Upsert product to track price history
        const { data: product, error: productError } = await supabase
          .from('products')
          .upsert({
            household_id: householdId,
            name: item.productName.trim(),
            last_price_cents: Math.round(item.priceCents),
            price_updated_at: new Date().toISOString(),
          }, {
            onConflict: 'household_id, name',
            ignoreDuplicates: false, 
          })
          .select('id')
          .single()

        if (productError) {
          console.error("Error upserting product:", productError)
          return { name: item.productName.trim(), id: null }
        }
        
        return { name: item.productName.trim(), id: product?.id || null }
      })

      const productResults = await Promise.all(productPromises)
      const productIdMap = new Map(productResults.map(p => [p.name, p.id]))

      // Create receipt items with category_id and product_id
      const itemsToInsert = validItems.map((item) => ({
        receipt_id: receipt.id,
        product_name: item.productName.trim(),
        quantity: item.quantity,
        price_cents: Math.round(item.priceCents),
        product_id: productIdMap.get(item.productName.trim()) || null,
        category_id: item.subcategory 
          ? categoryLookup.get(item.subcategory) || fallbackCategoryId
          : fallbackCategoryId,
        is_warranty_item: item.isWarranty || false,
        warranty_end_date: item.isWarranty && item.warrantyEndDate ? item.warrantyEndDate.toISOString().split('T')[0] : null,
        warranty_period_months: item.isWarranty ? 24 : null,
      }))

      const { error: itemsError } = await supabase
        .from('receipt_items')
        .insert(itemsToInsert)

      if (itemsError) {
        console.error('Error creating receipt items:', itemsError)
        toast.error('Produkte konnten nicht gespeichert werden')
        setIsSubmitting(false)
        return
      }

      toast.success('Kassenbon wurde gespeichert')
      
      // Async background tasks
      try {
         // 1. Budget Alerts
         await checkBudgetAlerts(householdId)
         
         // 2. New Receipt Notification
         // Dynamically import to keep client bundle clean/avoid server action issues if any
         const { sendReceiptNotification } = await import('@/app/actions/notifications')
         await sendReceiptNotification(receipt.id)

      } catch (err) {
         console.error("Failed to trigger background tasks:", err)
      }

      router.push(`/dashboard/receipts/${receipt.id}`)
    } catch (error) {
      console.error('Error saving receipt:', error)
      toast.error('Ein Fehler ist aufgetreten')
      setIsSubmitting(false)
    }
  }

  const isFromAIScan = !!initialData?.aiResult

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* AI Scan Info */}
      {isFromAIScan && (
        <Alert className="border-primary/50 bg-primary/5">
          <Sparkles className="h-4 w-4 text-primary" />
          <AlertDescription className="text-primary">
            Von KI erkannt - bitte pruefe die Daten und korrigiere falls noetig.
          </AlertDescription>
        </Alert>
      )}

      {/* Store Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Store</CardTitle>
        </CardHeader>
        <CardContent>
          <StoreSelector
            merchants={merchants}
            selectedMerchantId={selectedMerchantId}
            onSelect={setSelectedMerchantId}
            onCreateNew={() => setShowNewMerchantDialog(true)}
            aiSuggestedName={aiSuggestedMerchant}
          />
        </CardContent>
      </Card>

      {/* Date & Payer */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label>Datum</Label>
            <DatePicker
              date={date}
              onDateChange={setDate}
              maxDate={new Date()}
              placeholder="Datum auswählen"
            />
          </div>

          <PayerSelector
            members={members}
            selectedUserId={paidBy}
            onSelect={setPaidBy}
          />
        </CardContent>
      </Card>

      {/* Products */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Produkte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.length === 0 ? (
            <Alert>
              <AlertDescription>
                Keine Produkte erkannt. Bitte fuege manuell Produkte hinzu.
              </AlertDescription>
            </Alert>
          ) : (
            items.map((item, index) => (
              <ReceiptItemCard
                key={item.id}
                item={item}
                index={index}
                onUpdate={updateItem}
                onDelete={removeItem}
                canDelete={items.length > 1}
              />
            ))
          )}

          <Button variant="outline" onClick={addItem} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Produkt hinzufuegen
          </Button>
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardContent className="pt-6">
          <ReceiptTotals
            calculatedTotalCents={calculatedTotalCents}
            aiTotalCents={isFromAIScan ? aiTotalCents : null}
          />
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="sticky bottom-4 bg-background pt-4 pb-2 -mx-4 px-4 border-t">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Wird gespeichert...
            </>
          ) : (
            'Kassenbon speichern'
          )}
        </Button>
      </div>

      {/* New Merchant Dialog */}
      <Dialog open={showNewMerchantDialog} onOpenChange={setShowNewMerchantDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neuen Store anlegen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="merchantName">Store-Name</Label>
              <Input
                id="merchantName"
                placeholder="z.B. REWE, LIDL, ALDI..."
                value={newMerchantName}
                onChange={(e) => setNewMerchantName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateMerchant()
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewMerchantDialog(false)}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleCreateMerchant}
              disabled={!newMerchantName.trim() || isCreatingMerchant}
            >
              {isCreatingMerchant ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
