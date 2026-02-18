'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Loader2,
  Pencil,
  Trash2,
  Image as ImageIcon,
  ShoppingCart,
  Calendar,
} from 'lucide-react'
import { toast } from 'sonner'

import { createClient } from '@/lib/supabase'
import { useHousehold } from '@/contexts/household-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ReceiptItem {
  id: string
  product_name: string
  quantity: number
  price_cents: number
  unit: string | null
}

interface ReceiptDetails {
  id: string
  date: string
  total_amount_cents: number
  image_url: string | null
  notes: string | null
  created_by: string
  merchants: { id: string; name: string } | null
  profiles: { display_name: string } | null
  receipt_items: ReceiptItem[]
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  })
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function ReceiptDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { currentHousehold, isLoading: isHouseholdLoading } = useHousehold()
  const [receipt, setReceipt] = useState<ReceiptDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showImageDialog, setShowImageDialog] = useState(false)

  const supabase = createClient()
  const receiptId = params.id as string

  const loadReceipt = useCallback(async () => {
    if (!currentHousehold || !receiptId) return

    setIsLoading(true)

    const { data, error } = await supabase
      .from('receipts')
      .select(`
        id,
        date,
        total_amount_cents,
        image_url,
        notes,
        created_by,
        merchants(id, name),
        profiles(display_name),
        receipt_items(id, product_name, quantity, price_cents, unit)
      `)
      .eq('id', receiptId)
      .eq('household_id', currentHousehold.id)
      .single()

    if (error) {
      console.error('Error loading receipt:', error)
      toast.error('Kassenbon konnte nicht geladen werden')
      router.push('/dashboard/receipts')
      return
    }

    // Generate signed URL if we have an image path
    let signedImageUrl = null
    if (data.image_url) {
      // Check if it's already a full URL (legacy or external)
      if (data.image_url.startsWith('http')) {
        signedImageUrl = data.image_url
      } else {
        // Generate signed URL
        const { data: signedData } = await supabase.storage
          .from('receipts')
          .createSignedUrl(data.image_url, 3600) // 1 hour expiry
        
        if (signedData) {
          signedImageUrl = signedData.signedUrl
        }
      }
    }

    setReceipt({
      ...data,
      image_url: signedImageUrl,
    } as ReceiptDetails)
    setIsLoading(false)
  }, [currentHousehold, receiptId, supabase, router])

  useEffect(() => {
    if (!currentHousehold) return
    const timeoutId = window.setTimeout(() => {
      void loadReceipt()
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [currentHousehold, loadReceipt])

  const handleDelete = async () => {
    if (!receipt) return

    setIsDeleting(true)

    const { error } = await supabase.from('receipts').delete().eq('id', receipt.id)

    if (error) {
      console.error('Error deleting receipt:', error)
      toast.error('Kassenbon konnte nicht gelöscht werden')
      setIsDeleting(false)
      return
    }

    toast.success('Kassenbon wurde gelöscht')
    router.push('/dashboard/receipts')
  }

  // Calculate totals
  const calculatedTotal = receipt?.receipt_items.reduce(
    (sum, item) => sum + item.price_cents * item.quantity,
    0
  ) || 0

  if (isHouseholdLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!receipt) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Kassenbon nicht gefunden</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/dashboard/receipts">Zurück zur Liste</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/receipts">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">
              {receipt.merchants?.name || 'Unbekannter Store'}
            </h1>
            <p className="text-sm text-muted-foreground">{formatDate(receipt.date)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {receipt.image_url && (
            <Button variant="outline" size="icon" onClick={() => setShowImageDialog(true)}>
              <ImageIcon className="h-4 w-4" />
            </Button>
          )}
          <Button variant="outline" size="icon" asChild>
            <Link href={`/dashboard/receipts/${receipt.id}/edit`}>
              <Pencil className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Meta Info */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <ShoppingCart className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Store</p>
                <p className="font-medium">{receipt.merchants?.name || 'Unbekannt'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Datum</p>
                <p className="font-medium">
                  {new Date(receipt.date).toLocaleDateString('de-DE')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 col-span-2">
              <Avatar className="h-10 w-10">
                <AvatarFallback>
                  {getInitials(receipt.profiles?.display_name || 'U')}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs text-muted-foreground">Bezahlt von</p>
                <p className="font-medium">{receipt.profiles?.display_name || 'Unbekannt'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Produkte ({receipt.receipt_items.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {receipt.receipt_items.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">Keine Produkte erfasst</p>
          ) : (
            <div className="divide-y">
              {receipt.receipt_items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{item.product_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity}x {formatCurrency(item.price_cents)}
                      {item.unit && ` / ${item.unit}`}
                    </p>
                  </div>
                  <p className="font-medium">
                    {formatCurrency(item.price_cents * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex justify-between text-muted-foreground">
            <span>Zwischensumme</span>
            <span>{formatCurrency(calculatedTotal)}</span>
          </div>
          {calculatedTotal !== receipt.total_amount_cents && (
            <div className="flex justify-between text-xs text-amber-600">
              <span>Differenz (Rabatte/Sonstiges)</span>
              <span>{formatCurrency(receipt.total_amount_cents - calculatedTotal)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>Gesamt</span>
            <span>{formatCurrency(receipt.total_amount_cents)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {receipt.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notizen</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{receipt.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Delete Button */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="w-full">
            <Trash2 className="h-4 w-4 mr-2" />
            Kassenbon löschen
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kassenbon wirklich löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Der Kassenbon und alle
              zugehörigen Produkte werden dauerhaft gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image Dialog */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Kassenbon-Foto</DialogTitle>
          </DialogHeader>
          {receipt.image_url && (
            <div className="relative aspect-[3/4] w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={receipt.image_url}
                alt="Kassenbon"
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
