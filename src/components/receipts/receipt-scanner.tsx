'use client'
/* eslint-disable @next/next/no-img-element -- scanner previews use local object URLs */

import { useState, useRef, useCallback, useEffect } from 'react'
import { ImagePlus, Loader2, AlertCircle, RotateCcw, Scan, X, Images } from 'lucide-react'

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
const MAX_SCAN_IMAGES = 5
const MAX_UPLOAD_LONG_EDGE = 1920
const TARGET_UPLOAD_JPEG_QUALITY = 0.82
const MIN_COMPRESSION_SAVINGS_BYTES = 40 * 1024
const LARGE_JPEG_THRESHOLD_BYTES = 2.5 * 1024 * 1024

interface QueuedScanImage {
  id: string
  file: File
  previewUrl: string
  qualityHint: string | null
}

interface ScanSuccessPayload {
  ai_result: ReceiptAIResponse
  image_path: string
  image_paths?: string[]
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

function createQueueId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

async function optimizeReceiptImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) {
    return file
  }

  let bitmap: ImageBitmap | null = null
  try {
    bitmap = await createImageBitmap(file)
    const width = bitmap.width
    const height = bitmap.height
    const longEdge = Math.max(width, height)
    const scale = longEdge > MAX_UPLOAD_LONG_EDGE ? MAX_UPLOAD_LONG_EDGE / longEdge : 1

    const targetWidth = Math.max(1, Math.round(width * scale))
    const targetHeight = Math.max(1, Math.round(height * scale))

    const needsResize = scale < 1
    const needsReencode = file.type !== 'image/jpeg' || file.size > LARGE_JPEG_THRESHOLD_BYTES

    if (!needsResize && !needsReencode) {
      return file
    }

    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return file
    }

    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight)

    const optimizedBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', TARGET_UPLOAD_JPEG_QUALITY)
    })

    if (!optimizedBlob) {
      return file
    }

    const savings = file.size - optimizedBlob.size
    const shouldUseOriginal = !needsResize && file.type === 'image/jpeg' && savings < MIN_COMPRESSION_SAVINGS_BYTES
    if (shouldUseOriginal) {
      return file
    }

    const optimizedName = file.name.replace(/\.[^.]+$/, '') || 'receipt'
    return new File([optimizedBlob], `${optimizedName}.jpg`, {
      type: 'image/jpeg',
      lastModified: file.lastModified,
    })
  } catch {
    return file
  } finally {
    bitmap?.close()
  }
}

export function ReceiptScanner({ householdId, onScanComplete, onCancel, initialFile, initialCamera }: ReceiptScannerProps) {
  const [state, setState] = useState<ScanState>('idle')
  const [progress, setProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const [debugInfo, setDebugInfo] = useState<Record<string, unknown> | null>(null)
  const [queuedImages, setQueuedImages] = useState<QueuedScanImage[]>([])
  const [showSmartCamera, setShowSmartCamera] = useState(Boolean(initialCamera))
  const queuedImagesRef = useRef<QueuedScanImage[]>([])
  const didApplyInitialFileRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    queuedImagesRef.current = queuedImages
  }, [queuedImages])

  useEffect(() => {
    return () => {
      queuedImagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl))
    }
  }, [])

  const assessImageQuality = useCallback(async (file: File): Promise<string | null> => {
    try {
      const bitmap = await createImageBitmap(file)
      const minEdge = Math.min(bitmap.width, bitmap.height)
      const longEdge = Math.max(bitmap.width, bitmap.height)
      bitmap.close()

      if (minEdge < 900) {
        return 'Niedrige Auflösung erkannt. Wenn möglich näher ran oder besseres Licht nutzen.'
      }

      if (longEdge / minEdge > 4.2) {
        return 'Sehr schmaler Zuschnitt erkannt. Prüfe, ob der ganze Bon sichtbar ist.'
      }
    } catch {
      return null
    }
    return null
  }, [])

  const clearQueuedImages = useCallback(() => {
    setQueuedImages((previous) => {
      previous.forEach((image) => URL.revokeObjectURL(image.previewUrl))
      return []
    })
  }, [])

  const resetState = useCallback(() => {
    setState('idle')
    setProgress(0)
    setErrorMessage('')
    setDebugInfo(null)
    clearQueuedImages()
    setShowSmartCamera(false)
  }, [clearQueuedImages])

  const appendFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) {
      return
    }

    const availableSlots = MAX_SCAN_IMAGES - queuedImagesRef.current.length
    if (availableSlots <= 0) {
      setState('error')
      setErrorMessage(`Maximal ${MAX_SCAN_IMAGES} Bilder pro Bon erlaubt.`)
      return
    }

    const acceptedFiles = files.slice(0, availableSlots)
    const preparedImages = await Promise.all(
      acceptedFiles.map(async (file) => {
        const optimizedFile = await optimizeReceiptImage(file)
        return {
          id: createQueueId(),
          file: optimizedFile,
          previewUrl: URL.createObjectURL(optimizedFile),
          qualityHint: await assessImageQuality(file),
        }
      })
    )

    if (preparedImages.length > 0) {
      setQueuedImages((previous) => [...previous, ...preparedImages])
      setState('idle')
      setErrorMessage('')
      setDebugInfo(null)
    }

    if (acceptedFiles.length < files.length) {
      setState('error')
      setErrorMessage(`Nur ${MAX_SCAN_IMAGES} Bilder sind pro Bon moeglich.`)
    }
  }, [assessImageQuality])

  const removeQueuedImage = useCallback((id: string) => {
    setQueuedImages((previous) => {
      const image = previous.find((entry) => entry.id === id)
      if (image) {
        URL.revokeObjectURL(image.previewUrl)
      }
      return previous.filter((entry) => entry.id !== id)
    })
    setErrorMessage('')
  }, [])

  const processQueuedImages = useCallback(async () => {
    const images = queuedImagesRef.current
    if (images.length === 0) {
      setState('error')
      setErrorMessage('Bitte mindestens ein Bild auswaehlen.')
      return
    }

    try {
      setState('uploading')
      setProgress(20)
      setErrorMessage('')
      setDebugInfo(null)

      const formData = new FormData()
      formData.append('household_id', householdId)
      const endpoint = images.length > 1 ? '/api/receipts/scan-multi' : '/api/receipts/scan'

      if (images.length > 1) {
        images.forEach((image) => {
          formData.append('images', image.file)
        })
      } else {
        formData.append('image', images[0].file)
      }

      const requestPromise = fetch(endpoint, {
        method: 'POST',
        body: formData,
      })

      await new Promise((resolve) => setTimeout(resolve, 250))
      setState('processing')
      setProgress(60)

      const response = await requestPromise
      let result: ScanApiResponse | null = null
      try {
        result = (await response.json()) as ScanApiResponse
      } catch {
        result = null
      }

      if (!response.ok || !result || !result.success) {
        const failureMessage = result && !result.success ? result.message : undefined
        const failureDebug = result && !result.success ? result.debug : undefined
        setState('error')
        setErrorMessage(failureMessage || 'Ein Fehler ist aufgetreten')
        setDebugInfo(
          failureDebug || {
            endpoint,
            status: response.status,
          }
        )
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

  // Handle initial file once (e.g. gallery handoff from parent route)
  useEffect(() => {
    if (!initialFile || didApplyInitialFileRef.current) {
      return
    }
    didApplyInitialFileRef.current = true

    const timeoutId = setTimeout(() => {
      void appendFiles([initialFile])
    }, 0)

    return () => clearTimeout(timeoutId)
  }, [appendFiles, initialFile])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : []
    if (files.length > 0) {
      void appendFiles(files)
    }
    event.target.value = ''
  }

  const openSmartCamera = () => {
    setShowSmartCamera(true)
  }

  const handleSmartCameraCapture = (file: File) => {
    setShowSmartCamera(false)
    void appendFiles([file])
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
        }}
      />
    )
  }

  const previewUrl = queuedImages[0]?.previewUrl || null
  const hasQueuedImages = queuedImages.length > 0
  const queuedQualityHints = queuedImages.filter((image) => image.qualityHint).length

  // Idle State - Show options
  if (state === 'idle') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Kassenbon scannen</h2>
          <p className="text-muted-foreground mt-1">
            {hasQueuedImages
              ? 'Fuege weitere Bilder hinzu oder starte die Analyse'
              : 'Fotografiere den Kassenbon oder waehle ein Foto aus'}
          </p>
        </div>

        {hasQueuedImages && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Images className="h-4 w-4" />
                {queuedImages.length} von {MAX_SCAN_IMAGES} Bildern ausgewaehlt
              </span>
              {queuedQualityHints > 0 && (
                <span className="text-amber-600">
                  {queuedQualityHints} Bild{queuedQualityHints === 1 ? '' : 'er'} mit Hinweis
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {queuedImages.map((image, index) => (
                <div key={image.id} className="rounded-lg border bg-muted/20 p-2">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-md bg-muted">
                    <img
                      src={image.previewUrl}
                      alt={`Bon-Bild ${index + 1}`}
                      className="h-full w-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => removeQueuedImage(image.id)}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                      aria-label="Bild entfernen"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {image.qualityHint && (
                    <p className="mt-2 text-[11px] leading-tight text-amber-600">{image.qualityHint}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

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
                <p className="text-sm text-muted-foreground">Ein oder mehrere Fotos nutzen</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {hasQueuedImages ? (
          <div className="space-y-2">
            <Button onClick={() => void processQueuedImages()} className="w-full">
              {queuedImages.length > 1 ? `Analysiere ${queuedImages.length} Bilder` : 'Bild analysieren'}
            </Button>
            <Button variant="outline" onClick={resetState} className="w-full">
              Auswahl zuruecksetzen
            </Button>
          </div>
        ) : (
          <Button variant="outline" onClick={onCancel} className="w-full">
            Abbrechen
          </Button>
        )}

        {/* Hidden file input for gallery */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          aria-label="Bilder aus Galerie auswaehlen"
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
            {state === 'uploading'
              ? queuedImages.length > 1
                ? `Lade ${queuedImages.length} Bilder hoch...`
                : 'Lade Bild hoch...'
              : queuedImages.length > 1
                ? `Analysiere ${queuedImages.length} Bilder...`
                : 'Analysiere Kassenbon...'}
          </p>
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-muted-foreground">
            Die KI liest den Kassenbon{queuedImages.length > 1 ? ' aus mehreren Fotos' : ''}
          </p>
          {queuedQualityHints > 0 && (
            <p className="text-xs text-amber-600 flex items-center justify-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" />
              {queuedQualityHints} Bild{queuedQualityHints === 1 ? '' : 'er'} mit Qualitaetshinweis
            </p>
          )}
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
          <Button onClick={() => void processQueuedImages()} className="w-full" disabled={!hasQueuedImages}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Erneut versuchen
          </Button>
          <Button variant="outline" onClick={resetState} className="w-full">
            Auswahl zuruecksetzen
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
