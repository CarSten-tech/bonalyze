'use client'

import * as React from 'react'
import Webcam from 'react-webcam'
import { Camera, X, RefreshCw, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { loadOpenCV } from '@/lib/opencv-loader'
import { useCameraDocumentDetection } from '@/hooks/use-camera-document-detection'

interface CameraViewProps {
  onCapture: (imageSrc: string, corners?: { x: number; y: number }[]) => void
  onClose: () => void
}

export function CameraView({ onCapture, onClose }: CameraViewProps) {
  const webcamRef = React.useRef<Webcam>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const overlayRef = React.useRef<HTMLCanvasElement>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const [isMounted, setIsMounted] = React.useState(false)
  const [cameraError, setCameraError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isOpenCVReady, setIsOpenCVReady] = React.useState(false)

  const { detectedCorners } = useCameraDocumentDetection({
    webcamRef,
    canvasRef,
    overlayRef,
    enabled: isOpenCVReady,
  })

  React.useEffect(() => {
    let isActive = true
    setIsMounted(true)

    if (typeof navigator !== 'undefined' && (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)) {
      setCameraError('Kamera-Zugriff nicht möglich. Bitte nutze HTTPS oder lade ein Bild hoch.')
      setIsLoading(false)
    }

    loadOpenCV()
      .then(() => {
        if (!isActive) return
        setIsOpenCVReady(true)
      })
      .catch(() => {
        // Kamerafeed funktioniert ohne OpenCV, nur ohne Auto-Detection.
      })

    return () => {
      isActive = false
      setIsMounted(false)
    }
  }, [])

  const capture = React.useCallback(() => {
    try {
      const video = webcamRef.current?.video
      if (!video) return

      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const context = canvas.getContext('2d')
      if (!context) return

      context.drawImage(video, 0, 0)
      const imageSrc = canvas.toDataURL('image/jpeg', 0.95)

      if (imageSrc && imageSrc !== 'data:,') {
        onCapture(imageSrc, detectedCorners)
      }
    } catch {
      // noop: Nutzer kann neu versuchen
    }
  }, [detectedCorners, onCapture])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (readerEvent) => {
      if (readerEvent.target?.result) {
        onCapture(readerEvent.target.result as string)
      }
    }
    reader.readAsDataURL(file)
  }

  const videoConstraints = {
    facingMode: 'environment',
    width: { ideal: 3840 },
    height: { ideal: 2160 },
  }

  if (!isMounted) return null

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col overscroll-none touch-none">
      <canvas ref={canvasRef} className="hidden" />

      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent pt-[calc(env(safe-area-inset-top)+1rem)]">
        <div className="w-12" />
        <div className="text-white font-medium drop-shadow-md text-lg mt-2 flex flex-col items-center">
          <span>Beleg scannen</span>
          {isOpenCVReady && <span className="text-[10px] text-green-400 font-mono">AI ACTIVE</span>}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 text-white hover:bg-white/20 bg-black/20 backdrop-blur-sm rounded-full"
          onClick={onClose}
        >
          <X className="h-8 w-8" />
          <span className="sr-only">Schließen</span>
        </Button>
      </div>

      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        {isLoading && !cameraError && (
          <div className="absolute inset-0 flex items-center justify-center text-white z-10">
            <div className="text-center">
              <div className="animate-spin h-10 w-10 border-4 border-white border-t-transparent rounded-full mx-auto mb-4" />
              <p>Kamera wird gestartet...</p>
            </div>
          </div>
        )}

        {cameraError ? (
          <div className="absolute inset-0 flex items-center justify-center text-white z-10 p-6 text-center bg-gray-900/90">
            <div className="space-y-4 max-w-xs mx-auto">
              <div className="bg-red-500/10 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Camera className="h-8 w-8 text-red-500" />
              </div>

              <div>
                <p className="text-lg font-bold mb-2">Kamera nicht verfügbar</p>
                <p className="text-sm text-gray-300 mb-4">{cameraError}</p>
                <p className="text-xs text-gray-500 mb-6">
                  Hinweis: Auf Mobilgeräten funktioniert der Kamera-Zugriff meist nur über HTTPS oder localhost.
                </p>
              </div>

              <Button onClick={() => fileInputRef.current?.click()} className="w-full bg-white text-black hover:bg-gray-200">
                Bild hochladen statt scannen
              </Button>

              <Button onClick={onClose} variant="ghost" className="w-full text-white hover:bg-white/10">
                Abbrechen
              </Button>

              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileUpload}
                aria-label="Bild hochladen"
                title="Bild hochladen"
              />
            </div>
          </div>
        ) : (
          <>
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              screenshotQuality={1.0}
              videoConstraints={videoConstraints}
              className="absolute inset-0 h-full w-full object-cover"
              playsInline
              onUserMedia={() => setIsLoading(false)}
              onUserMediaError={(error) => {
                setIsLoading(false)
                const message = typeof error === 'string' ? error : (error as { message?: string })?.message || ''
                if (message.includes('Permission denied') || message.includes('NotAllowedError')) {
                  setCameraError('Zugriff auf Kamera verweigert. Bitte erlaube den Zugriff in den Browser-Einstellungen.')
                } else {
                  setCameraError('Kamera konnte nicht gestartet werden. Bitte nutze den Bildupload.')
                }
              }}
            />

            <canvas ref={overlayRef} className="absolute inset-0 h-full w-full pointer-events-none z-10 object-cover" />

            {!isLoading && !detectedCorners && (
              <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
                <div className="text-white/50 text-sm font-medium bg-black/40 px-4 py-2 rounded-full backdrop-blur-md">
                  Beleg hier platzieren
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {!cameraError && (
        <div className="h-32 bg-black flex items-center justify-between px-8 pb-safe-bottom z-20">
          <Button variant="ghost" size="icon" className="text-white opacity-0 pointer-events-none">
            <RefreshCw />
          </Button>

          <button
            onClick={capture}
            disabled={isLoading}
            className={`h-20 w-20 rounded-full border-[4px] flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50 disabled:scale-100 ${
              detectedCorners ? 'border-white bg-transparent' : 'border-white bg-white'
            }`}
            aria-label="Foto aufnehmen"
          >
            <div className={`h-16 w-16 rounded-full ${detectedCorners ? 'bg-white' : 'hidden'}`} />
          </button>

          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => fileInputRef.current?.click()}>
            <ImageIcon className="h-6 w-6" />
          </Button>
        </div>
      )}
    </div>
  )
}
