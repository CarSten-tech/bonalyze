'use client'
/* eslint-disable @next/next/no-img-element -- scanner previews use local object URLs */

import { useState, useRef, useCallback, useEffect } from 'react'
import { ImagePlus, Loader2, AlertCircle, RotateCcw, Scan } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ReceiptAIResponse } from '@/types/receipt-ai'
import { SmartReceiptCamera } from '@/components/camera/smart-receipt-camera'

interface ReceiptScannerProps {
  householdId: string
  onScanComplete: (result: ReceiptAIResponse, imagePath: string, merchantMatch?: { id: string; name: string }) => void
  onCancel: () => void
  initialFile?: File
  initialCamera?: boolean
}

type ScanState = 'idle' | 'uploading' | 'processing' | 'error'

interface ScanSuccessPayload {
  ai_result: ReceiptAIResponse
  image_path: string
  merchant_match?: { id: string; name: string }
}

interface ScanApiSuccess {
  success: true
  data: ScanSuccessPayload
  debug?: Record<string, unknown>
}

interface ScanApiFailure {
  success: false
  message?: string
  debug?: Record<string, unknown>
}

type ScanApiResponse = ScanApiSuccess | ScanApiFailure

export function ReceiptScanner({ householdId, onScanComplete, onCancel, initialFile, initialCamera }: ReceiptScannerProps) {
  const [state, setState] = useState<ScanState>('idle')
  const [progress, setProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const [debugInfo, setDebugInfo] = useState<Record<string, unknown> | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [showSmartCamera, setShowSmartCamera] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const resetState = useCallback(() => {
    setState('idle')
    setProgress(0)
    setErrorMessage('')
    setDebugInfo(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }, [previewUrl])

  const processImage = useCallback(async (file: File) => {
    try {
      // Show preview
      const preview = URL.createObjectURL(file)
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return preview
      })

      // Start upload
      setState('uploading')
      setProgress(20)

      // Log file info before upload
      console.log('[SCAN DEBUG] File info:', {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
        householdId,
      })

      const formData = new FormData()
      formData.append('image', file)
      formData.append('household_id', householdId)

      const response = await fetch('/api/receipts/scan', {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) {
        throw new Error(`Scan request failed with status ${response.status}`)
      }

      setState('processing')
      setProgress(60)

      const result = (await response.json()) as ScanApiResponse

      // Log debug info
      if (result.debug) {
        console.log('[SCAN DEBUG] Response:', JSON.stringify(result.debug, null, 2))
      }

      if (!result.success) {
        setState('error')
        setErrorMessage(result.message || 'Ein Fehler ist aufgetreten')
        setDebugInfo(result.debug || null)
        return
      }

      setProgress(100)

      // Small delay to show 100% progress
      await new Promise((resolve) => setTimeout(resolve, 300))

      onScanComplete(
        result.data.ai_result,
        result.data.image_path,
        result.data.merchant_match
      )
    } catch (error) {
      console.error('Scan error:', error)
      setState('error')
      setErrorMessage('Verbindungsfehler. Bitte erneut versuchen.')
    }
  }, [householdId, onScanComplete])

  // Handle initial props
  useEffect(() => {
    if (initialFile) {
      void processImage(initialFile)
      return
    }
    if (initialCamera) {
      setShowSmartCamera(true)
    }
  }, [initialFile, initialCamera, processImage]) // Run once on mount for provided initial values

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      processImage(file)
    }
    // Reset input to allow re-selecting same file
    event.target.value = ''
  }

  const openSmartCamera = () => {
    setShowSmartCamera(true)
  }

  const handleSmartCameraCapture = (file: File) => {
    setShowSmartCamera(false)
    processImage(file)
  }

  const openGallery = () => {
    fileInputRef.current?.click()
  }

  // Smart Camera View
  if (showSmartCamera) {
    return (
      <SmartReceiptCamera
        onCapture={handleSmartCameraCapture}
        onClose={() => {
            setShowSmartCamera(false)
            onCancel()
        }}
      />
    )
  }

  // Idle State - Show options
  if (state === 'idle') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Kassenbon scannen</h2>
          <p className="text-muted-foreground mt-1">
            Fotografiere den Kassenbon oder wähle ein Foto aus
          </p>
        </div>

        <div className="space-y-3">
          <Card
            className="cursor-pointer hover:bg-muted/50 transition-colors border-primary/20 bg-primary/5"
            onClick={openSmartCamera}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                <Scan className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <p className="font-semibold text-lg text-primary">Smart Scan</p>
                <p className="text-sm text-muted-foreground">Kamera mit Dokumenten-Modus</p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={openGallery}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                <ImagePlus className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold">Aus Galerie wählen</p>
                <p className="text-sm text-muted-foreground">Vorhandenes Foto nutzen</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Button variant="outline" onClick={onCancel} className="w-full">
          Abbrechen
        </Button>

        {/* Hidden file input for gallery */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          aria-label="Bild aus Galerie auswählen"
          className="hidden"
        />
      </div>
    )
  }

  // Processing State
  if (state === 'uploading' || state === 'processing') {
    return (
      <div className="space-y-6">
        {previewUrl && (
          <div className="relative aspect-[3/4] max-h-[300px] mx-auto overflow-hidden rounded-lg bg-muted">
            <img
              src={previewUrl}
              alt="Kassenbon"
              className="w-full h-full object-contain"
            />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-white" />
            </div>
          </div>
        )}

        <div className="text-center space-y-4">
          <p className="font-medium">
            {state === 'uploading' ? 'Lade Bild hoch...' : 'Analysiere Kassenbon...'}
          </p>
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-muted-foreground">
            Die KI liest den Kassenbon
          </p>
        </div>
      </div>
    )
  }

  // Error State
  if (state === 'error') {
    return (
      <div className="space-y-6">
        {previewUrl && (
          <div className="relative aspect-[3/4] max-h-[200px] mx-auto overflow-hidden rounded-lg bg-muted opacity-50">
            <img
              src={previewUrl}
              alt="Kassenbon"
              className="w-full h-full object-contain"
            />
          </div>
        )}

        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Fehler beim Scannen</h3>
            <p className="text-muted-foreground mt-1">{errorMessage}</p>
          </div>
        </div>

        {/* Debug Info */}
        {debugInfo && (
          <div className="mt-4 p-3 bg-muted rounded-lg text-left">
            <p className="text-xs font-mono text-muted-foreground mb-2">Debug Info:</p>
            <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}

        <div className="space-y-2">
          <Button onClick={resetState} className="w-full">
            <RotateCcw className="h-4 w-4 mr-2" />
            Erneut versuchen
          </Button>
          <Button variant="outline" onClick={onCancel} className="w-full">
            Abbrechen
          </Button>
        </div>
      </div>
    )
  }

  return null
}
