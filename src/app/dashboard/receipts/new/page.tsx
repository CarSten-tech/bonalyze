'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Camera, PenLine, Sparkles, ImagePlus, Scan } from 'lucide-react'

import { createClient } from '@/lib/supabase'
import { useHousehold } from '@/contexts/household-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ReceiptScanner } from '@/components/receipts/receipt-scanner'
import { ReceiptEditor } from '@/components/receipts/receipt-editor'
import { ReceiptAIResponse } from '@/types/receipt-ai'

type PageMode = 'select' | 'scan' | 'edit'

interface ScanResult {
  aiResult: ReceiptAIResponse
  imagePath: string
  merchantMatch?: { id: string; name: string }
}

export default function NewReceiptPage() {
  const { currentHousehold, isLoading: isHouseholdLoading } = useHousehold()
  const supabase = createClient()

  const [mode, setMode] = useState<PageMode>('select')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  
  // Initial state for scanner
  const [initialFile, setInitialFile] = useState<File | undefined>()
  const [initialCamera, setInitialCamera] = useState(false)
  const fileInputRef = useState<HTMLInputElement | null>(null)

  // Load current user
  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
      }
    }
    loadUser()
  }, [supabase])

  const handleScanComplete = useCallback(
    async (
      aiResult: ReceiptAIResponse,
      imagePath: string,
      merchantMatch?: { id: string; name: string }
    ) => {
      setScanResult({
        aiResult,
        imagePath,
        merchantMatch,
      })
      setMode('edit')
    },
    []
  )

  const handleCancel = useCallback(() => {
    setMode('select')
    setScanResult(null)
    setInitialFile(undefined)
    setInitialCamera(false)
  }, [])

  const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setInitialFile(file)
      setMode('scan')
    }
    // Reset input
    e.target.value = ''
  }

  const startCamera = () => {
    setInitialCamera(true)
    setMode('scan')
  }

  // Loading state
  if (isHouseholdLoading || !currentUserId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Mode Selection
  if (mode === 'select') {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/receipts">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-xl font-bold">Neuer Kassenbon</h1>
        </div>

        <div className="text-center py-4">
          <p className="text-muted-foreground">
            Wie moechtest du den Kassenbon erfassen?
          </p>
        </div>

        <div className="space-y-3">
          {/* Smart Scan Option */}
          <Card
            className="cursor-pointer hover:bg-muted/50 transition-colors border-primary/20 bg-primary/5"
            onClick={startCamera}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
                <Scan className="h-7 w-7 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-lg text-primary">Smart Scan</p>
                  <Badge variant="secondary" className="text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    KI
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Foto aufnehmen, Dokument zuschneiden
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Gallery Option */}
          <div className="relative">
             <Card
                className="cursor-pointer hover:bg-muted/50 transition-colors"
             >
                <CardContent className="p-6 flex items-center gap-4">
                   <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted">
                      <ImagePlus className="h-7 w-7 text-muted-foreground" />
                   </div>
                   <div className="flex-1">
                      <p className="font-semibold text-lg">Aus Dateien wählen</p>
                      <p className="text-sm text-muted-foreground">
                         Foto aus der Galerie hochladen
                      </p>
                   </div>
                   {/* Full cover file input */}
                   <input 
                      type="file" 
                      accept="image/*"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={handleGallerySelect}
                      aria-label="Bild aus Galerie wählen"
                      title="Bild aus Galerie wählen"
                   />
                </CardContent>
             </Card>
          </div>

          {/* Manual Entry Option */}
          <Card
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setMode('edit')}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted">
                <PenLine className="h-7 w-7 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-lg">Manuell eingeben</p>
                <p className="text-sm text-muted-foreground">
                  Daten selbst eintragen
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Scan Mode
  if (mode === 'scan' && currentHousehold) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setMode('select')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Kassenbon scannen</h1>
        </div>

        <ReceiptScanner
          householdId={currentHousehold.id}
          onScanComplete={handleScanComplete}
          onCancel={handleCancel}
          initialFile={initialFile}
          initialCamera={initialCamera}
        />
      </div>
    )
  }

  // Edit Mode
  if (mode === 'edit' && currentHousehold) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleCancel}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">
              {scanResult ? 'Kassenbon pruefen' : 'Neuer Kassenbon'}
            </h1>
            {scanResult && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Von KI erkannt - bitte pruefen
              </p>
            )}
          </div>
        </div>

        <ReceiptEditor
          householdId={currentHousehold.id}
          currentUserId={currentUserId}
          initialData={scanResult || undefined}
          onCancel={handleCancel}
        />
      </div>
    )
  }

  // Fallback
  return null
}
