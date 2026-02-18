'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { X, Loader2, Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void
  onClose: () => void
  isOpen: boolean
}

export function BarcodeScanner({ onScan, onClose, isOpen }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cleanupScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop()
        }
        scannerRef.current.clear()
      } catch (err) {
        console.error('Failed to clear scanner', err)
      }
      scannerRef.current = null
    }
  }, [])

  const handleScanSuccess = useCallback(
    (decodedText: string) => {
      if (navigator.vibrate) {
        navigator.vibrate(200)
      }
      cleanupScanner()
      onScan(decodedText)
    },
    [cleanupScanner, onScan]
  )

  useEffect(() => {
    if (!isOpen) {
      cleanupScanner()
      return
    }

    const startScanner = async () => {
      try {
        setIsInitializing(true)
        setError(null)

        // Check for camera support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Kamera wird von diesem Browser nicht unterstuetzt')
        }

        const scanner = new Html5Qrcode('barcode-reader')
        scannerRef.current = scanner

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
          ]
        }

        await scanner.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            handleScanSuccess(decodedText)
          },
          () => {
            // Ignore scan failures (happens every frame)
          }
        )
      } catch (err) {
        console.error('Scanner error:', err)
        setError(err instanceof Error ? err.message : 'Kamera konnte nicht gestartet werden')
      } finally {
        setIsInitializing(false)
      }
    }

    startScanner()

    return () => {
      cleanupScanner()
    }
  }, [cleanupScanner, handleScanSuccess, isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 text-white hover:bg-card/20"
        onClick={onClose}
      >
        <X className="h-8 w-8" />
      </Button>

      <div className="w-full max-w-md relative aspect-square bg-black rounded-lg overflow-hidden border-2 border-primary/50 shadow-2xl">
        <div id="barcode-reader" className="w-full h-full" />
        
        {/* Overlay guides */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 border-2 border-white/50 rounded-lg"></div>
          <div className="absolute top-0 left-0 w-full h-1/4 bg-black/40"></div>
          <div className="absolute bottom-0 left-0 w-full h-1/4 bg-black/40"></div>
          <div className="absolute top-1/4 left-0 w-1/4 h-1/2 bg-black/40"></div>
          <div className="absolute top-1/4 right-0 w-1/4 h-1/2 bg-black/40"></div>
        </div>

        {isInitializing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-6 text-center">
            <Camera className="h-12 w-12 text-destructive mb-4" />
            <p className="text-white font-medium mb-2">Kamera-Fehler</p>
            <p className="text-white/70 text-sm">{error}</p>
            <Button 
              variant="secondary" 
              className="mt-6"
              onClick={onClose}
            >
              Schliessen
            </Button>
          </div>
        )}
      </div>

      <p className="text-white/80 mt-8 text-center text-sm font-medium">
        Scanne einen Barcode auf der Verpackung
      </p>
    </div>
  )
}
