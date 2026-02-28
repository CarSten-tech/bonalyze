'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Loader2, Plus, Sparkles, Wand2 } from 'lucide-react'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

import { DatePicker } from './date-picker'
import { StoreSelector, type Merchant } from './store-selector'
import { PayerSelector, type HouseholdMember } from './payer-selector'
import { ReceiptItemCard, type ReceiptItemDraft } from './receipt-item-card'
import { ReceiptTotals } from './receipt-totals'
import { ReceiptAIResponse } from '@/types/receipt-ai'
import { checkBudgetAlerts } from '@/app/actions/budget'
import {
  cleanupProductName,
  normalizeDateOnly,
  normalizeProductName,
} from '@/lib/receipt-normalization'

// Generate unique ID for items
function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

interface LearnedProductMapping {
  canonicalName: string
  subcategory?: string
  category?: string
}

interface DuplicateCandidate {
  id: string
  date: string
  merchantId: string | null
  merchantName: string
  totalAmountCents: number
  score: number
  dateDelta: number
  itemOverlap: number
  exactFingerprint: boolean
}

interface ReceiptEditorProps {
  householdId: string
  currentUserId: string
  mode?: 'create' | 'edit'
  receiptId?: string
  existingReceipt?: {
    merchantId: string | null
    date: string
    paidBy: string
    imagePath: string | null
    items: ReceiptItemDraft[]
  }
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
  mode = 'create',
  receiptId,
  existingReceipt,
  initialData,
  onCancel,
}: ReceiptEditorProps) {
  const router = useRouter()
  const supabase = createClient()

  // Data loading states
  const [merchants, setMerchants] = React.useState<Merchant[]>([])
  const [members, setMembers] = React.useState<HouseholdMember[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [learnedProductMap, setLearnedProductMap] = React.useState<Map<string, LearnedProductMapping>>(
    () => new Map()
  )

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
  const [showDuplicateDialog, setShowDuplicateDialog] = React.useState(false)
  const [duplicateCandidates, setDuplicateCandidates] = React.useState<DuplicateCandidate[]>([])
  const [didInitializeFromAi, setDidInitializeFromAi] = React.useState(false)

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

      const { data: productsData } = await supabase
        .from('products')
        .select('name, category, category_id')
        .eq('household_id', householdId)

      const categoryIds = [...new Set((productsData || []).map((p) => p.category_id).filter(Boolean))] as string[]
      const categoryById = new Map<string, { name: string; parentId: string | null }>()
      const parentNameById = new Map<string, string>()

      if (categoryIds.length > 0) {
        const { data: categoriesData } = await supabase
          .from('categories')
          .select('id, name, parent_id')
          .in('id', categoryIds)

        ;(categoriesData || []).forEach((cat) => {
          categoryById.set(cat.id, { name: cat.name, parentId: cat.parent_id })
        })

        const parentIds = [
          ...new Set((categoriesData || []).map((cat) => cat.parent_id).filter(Boolean)),
        ] as string[]

        if (parentIds.length > 0) {
          const { data: parentData } = await supabase
            .from('categories')
            .select('id, name')
            .in('id', parentIds)

          ;(parentData || []).forEach((parent) => {
            parentNameById.set(parent.id, parent.name)
          })
        }
      }

      const learnedMap = new Map<string, LearnedProductMapping>()
      ;(productsData || []).forEach((product) => {
        const key = normalizeProductName(product.name)
        if (!key) return

        const categoryRef = product.category_id ? categoryById.get(product.category_id) : null
        const parentCategoryName = categoryRef?.parentId
          ? parentNameById.get(categoryRef.parentId)
          : undefined

        learnedMap.set(key, {
          canonicalName: product.name,
          subcategory: categoryRef?.name || undefined,
          category: parentCategoryName || product.category || undefined,
        })
      })
      setLearnedProductMap(learnedMap)

      // Set default payer to current user (or existing receipt payer in edit mode)
      setPaidBy(existingReceipt?.paidBy || currentUserId)

      setIsLoading(false)
    }

    loadData()
  }, [householdId, currentUserId, existingReceipt?.paidBy, supabase])

  // Prefill existing receipt data in edit mode.
  React.useEffect(() => {
    if (mode !== 'edit' || !existingReceipt) return

    setSelectedMerchantId(existingReceipt.merchantId)
    const parsedDate = new Date(existingReceipt.date)
    if (!Number.isNaN(parsedDate.getTime())) {
      setDate(parsedDate)
    }
    setPaidBy(existingReceipt.paidBy)
    setItems(
      existingReceipt.items.length > 0
        ? existingReceipt.items
        : [{ id: generateId(), productName: '', quantity: 1, priceCents: 0 }]
    )
    setImagePath(existingReceipt.imagePath)
    setAiTotalCents(null)
    setAiSuggestedMerchant(null)
  }, [mode, existingReceipt])

  React.useEffect(() => {
    if (!initialData?.aiResult) {
      setDidInitializeFromAi(false)
    }
  }, [initialData?.aiResult])

  // Process initial AI data once after household data has loaded (for learned mappings).
  React.useEffect(() => {
    if (!initialData?.aiResult || didInitializeFromAi || isLoading) return

    const aiResult = initialData.aiResult

    if (aiResult.date) {
      const parsedDate = new Date(aiResult.date)
      if (!isNaN(parsedDate.getTime())) {
        setDate(parsedDate)
      }
    }

    if (initialData.merchantMatch) {
      setSelectedMerchantId(initialData.merchantMatch.id)
    }

    if (aiResult.merchant) {
      setAiSuggestedMerchant(aiResult.merchant)
    }

    if (aiResult.amounts?.total) {
      setAiTotalCents(Math.round(aiResult.amounts.total * 100))
    }

    if (aiResult.items && aiResult.items.length > 0) {
      const scannedItems: ReceiptItemDraft[] = aiResult.items.map((item) => {
        const normalizedKey = normalizeProductName(item.name)
        const learned = learnedProductMap.get(normalizedKey)
        const itemQuantity = item.quantity && item.quantity > 0 ? item.quantity : 1

        return {
          id: generateId(),
          productName: learned?.canonicalName || cleanupProductName(item.name),
          quantity: itemQuantity,
          priceCents: Math.round((item.total_price / itemQuantity) * 100),
          confidence: aiResult.meta?.confidence || 0.5,
          category: learned?.category || item.category,
          subcategory: learned?.subcategory || item.subcategory,
          isWarranty: item.is_warranty_candidate,
          warrantyEndDate: item.is_warranty_candidate ? addYears(new Date(), 2) : undefined,
          estimatedCaloriesKcal: item.estimated_calories_kcal || 0,
          estimatedWeightG: item.estimated_weight_g || 0,
          estimatedProteinG: item.estimated_protein_g || 0,
          estimatedCarbsG: item.estimated_carbs_g || 0,
          estimatedFatG: item.estimated_fat_g || 0,
          isFoodItem: item.is_food_item ?? true,
        }
      })
      setItems(scannedItems)
    }

    if (initialData.imagePath) {
      setImagePath(initialData.imagePath)
    }

    setDidInitializeFromAi(true)
  }, [didInitializeFromAi, initialData, isLoading, learnedProductMap])

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

  const aiScanConfidence = initialData?.aiResult?.meta?.confidence ?? null
  const lowConfidenceItems = items.filter(
    (item) => typeof item.confidence === 'number' && item.confidence < 0.7
  ).length

  const applyQuickFixes = () => {
    setItems((prev) =>
      prev.map((item) => {
        const cleanedName = cleanupProductName(item.productName)
        const normalizedKey = normalizeProductName(cleanedName)
        const learned = learnedProductMap.get(normalizedKey)
        const quantity = item.quantity > 0 ? item.quantity : 1
        const priceCents = Number.isFinite(item.priceCents) ? Math.round(item.priceCents) : 0

        return {
          ...item,
          productName: learned?.canonicalName || cleanedName,
          quantity,
          priceCents,
          subcategory: item.subcategory || learned?.subcategory,
          category: item.category || learned?.category,
        }
      })
    )
    toast.success('Quick-Fixes angewendet')
  }

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
  const handleSubmit = async (forceDuplicateSave = false) => {
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
      const isEditMode = mode === 'edit' && !!receiptId
      const saveDate = normalizeDateOnly(date)

      if (!forceDuplicateSave) {
        const duplicateResponse = await fetch('/api/receipts/check-duplicate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            householdId,
            date: saveDate,
            merchantId: selectedMerchantId,
            totalAmountCents: calculatedTotalCents,
            itemNames: validItems.map((item) => item.productName),
            excludeReceiptId: isEditMode ? receiptId : undefined,
          }),
        })

        if (duplicateResponse.ok) {
          const duplicateData = await duplicateResponse.json()
          if (duplicateData.isDuplicate) {
            setDuplicateCandidates((duplicateData.duplicates || []) as DuplicateCandidate[])
            setShowDuplicateDialog(true)
            setIsSubmitting(false)
            return
          }
        }
      }

      let targetReceiptId: string | null = null

      if (isEditMode) {
        const { data: updatedReceipt, error: updateError } = await supabase
          .from('receipts')
          .update({
            merchant_id: selectedMerchantId,
            date: saveDate,
            total_amount_cents: calculatedTotalCents,
            created_by: paidBy,
            image_url: imagePath,
          })
          .eq('id', receiptId)
          .eq('household_id', householdId)
          .select('id')
          .single()

        if (updateError || !updatedReceipt) {
          console.error('Error updating receipt:', updateError)
          toast.error('Kassenbon konnte nicht aktualisiert werden')
          setIsSubmitting(false)
          return
        }

        targetReceiptId = updatedReceipt.id

        const { error: deleteItemsError } = await supabase
          .from('receipt_items')
          .delete()
          .eq('receipt_id', targetReceiptId)

        if (deleteItemsError) {
          console.error('Error resetting receipt items:', deleteItemsError)
          toast.error('Produkte konnten nicht aktualisiert werden')
          setIsSubmitting(false)
          return
        }
      } else {
        // Create receipt
        const { data: receipt, error: receiptError } = await supabase
          .from('receipts')
          .insert({
            household_id: householdId,
            merchant_id: selectedMerchantId,
            date: saveDate,
            total_amount_cents: calculatedTotalCents,
            created_by: paidBy,
            image_url: imagePath,
          })
          .select()
          .single()

        if (receiptError || !receipt) {
          console.error('Error creating receipt:', receiptError)
          toast.error('Kassenbon konnte nicht erstellt werden')
          setIsSubmitting(false)
          return
        }

        targetReceiptId = receipt.id
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
        const resolvedCategoryId = item.subcategory
          ? categoryLookup.get(item.subcategory) || fallbackCategoryId
          : fallbackCategoryId
        // Upsert product to track price history
        const { data: product, error: productError } = await supabase
          .from('products')
          .upsert({
            household_id: householdId,
            name: cleanupProductName(item.productName.trim()),
            last_price_cents: Math.round(item.priceCents),
            price_updated_at: new Date().toISOString(),
            category: item.category || null,
            category_id: resolvedCategoryId,
          }, {
            onConflict: 'household_id, name',
            ignoreDuplicates: false, 
          })
          .select('id')
          .single()

        if (productError) {
          console.error("Error upserting product:", productError)
          return { name: cleanupProductName(item.productName.trim()), id: null }
        }
        
        return { name: cleanupProductName(item.productName.trim()), id: product?.id || null }
      })

      const productResults = await Promise.all(productPromises)
      const productIdMap = new Map(productResults.map(p => [p.name, p.id]))

      // Create receipt items with category_id and product_id
      const itemsToInsert = validItems.map((item) => ({
        receipt_id: targetReceiptId,
        product_name: cleanupProductName(item.productName.trim()),
        quantity: item.quantity,
        price_cents: Math.round(item.priceCents),
        product_id: productIdMap.get(cleanupProductName(item.productName.trim())) || null,
        category_id: item.subcategory
          ? categoryLookup.get(item.subcategory) || fallbackCategoryId
          : fallbackCategoryId,
        is_warranty_item: item.isWarranty || false,
        warranty_end_date: item.isWarranty && item.warrantyEndDate ? item.warrantyEndDate.toISOString().split('T')[0] : null,
        warranty_period_months: item.isWarranty ? 24 : null,
        // Supply Range nutrition fields
        estimated_calories_kcal: item.estimatedCaloriesKcal || null,
        estimated_weight_g: item.estimatedWeightG || null,
        estimated_protein_g: item.estimatedProteinG || null,
        estimated_carbs_g: item.estimatedCarbsG || null,
        estimated_fat_g: item.estimatedFatG || null,
        is_food_item: item.isFoodItem ?? true,
      }))

      const { error: itemsError } = await supabase
        .from('receipt_items')
        .insert(itemsToInsert)

      if (itemsError) {
        console.error('Error creating receipt items:', itemsError)
        toast.error(mode === 'edit' ? 'Produkte konnten nicht aktualisiert werden' : 'Produkte konnten nicht gespeichert werden')
        setIsSubmitting(false)
        return
      }

      toast.success(mode === 'edit' ? 'Kassenbon wurde aktualisiert' : 'Kassenbon wurde gespeichert')
      
      // Async background tasks
      try {
         // 1. Budget Alerts
         await checkBudgetAlerts(householdId)
         
         if (!isEditMode && targetReceiptId) {
           // 2. New Receipt Notification (create only)
           // Dynamically import to keep client bundle clean/avoid server action issues if any
           const { sendReceiptNotification } = await import('@/app/actions/notifications')
           await sendReceiptNotification(targetReceiptId)
         }

      } catch (err) {
         console.error("Failed to trigger background tasks:", err)
      }

      if (targetReceiptId) {
        router.push(`/dashboard/receipts/${targetReceiptId}`)
      }
    } catch (error) {
      console.error('Error saving receipt:', error)
      toast.error('Ein Fehler ist aufgetreten')
      setIsSubmitting(false)
    }
  }

  const isFromAIScan = mode !== 'edit' && !!initialData?.aiResult

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
          <AlertDescription className="text-primary flex flex-col gap-2">
            <span>
              Von KI erkannt - bitte pruefe die Daten und korrigiere falls noetig.
              {aiScanConfidence !== null && (
                <span className="ml-1">
                  (Konfidenz: {Math.round(aiScanConfidence * 100)}%)
                </span>
              )}
              {lowConfidenceItems > 0 && (
                <span className="ml-1 inline-flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {lowConfidenceItems} unsichere Positionen
                </span>
              )}
            </span>
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={applyQuickFixes}
              >
                <Wand2 className="h-3.5 w-3.5 mr-1.5" />
                Quick-Fix anwenden
              </Button>
            </div>
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
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="w-full"
            size="lg"
          >
            Abbrechen
          </Button>
          <Button
            onClick={() => {
              void handleSubmit(false)
            }}
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
              mode === 'edit' ? 'Änderungen speichern' : 'Kassenbon speichern'
            )}
          </Button>
        </div>
      </div>

      <AlertDialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Möglicher Duplikat-Bon erkannt</AlertDialogTitle>
            <AlertDialogDescription>
              Ein ähnlicher Bon existiert bereits. Prüfe kurz, ob es wirklich ein neuer Einkauf ist.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {duplicateCandidates.length > 0 && (
            <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
              <p className="font-medium">Top-Treffer:</p>
              <p>
                {duplicateCandidates[0].merchantName} am {duplicateCandidates[0].date}
              </p>
              <p>Trefferquote: {duplicateCandidates[0].score}%</p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Zurück</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowDuplicateDialog(false)
                void handleSubmit(true)
              }}
            >
              Trotzdem speichern
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
