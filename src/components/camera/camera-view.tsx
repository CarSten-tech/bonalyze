'use client'

import * as React from 'react'
import Webcam from 'react-webcam'
import { Camera, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CameraViewProps {
  onCapture: (imageSrc: string) => void
  onClose: () => void
}

export function CameraView({ onCapture, onClose }: CameraViewProps) {
  const webcamRef = React.useRef<Webcam>(null)
  const [isMounted, setIsMounted] = React.useState(false)
  const [cameraError, setCameraError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    setIsMounted(true)
    
    // Check for secure context
    if (typeof navigator !== 'undefined') {
       if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("Kamera-Zugriff nicht möglich. Bitte nutze HTTPS oder lade ein Bild hoch.")
        setIsLoading(false)
       }
    }
  }, [])

  const capture = React.useCallback(() => {
    try {
      const imageSrc = webcamRef.current?.getScreenshot()
      if (imageSrc) {
        onCapture(imageSrc)
      } else {
        console.error("Screenshot returned null")
      }
    } catch (e) {
      console.error("Capture error", e)
    }
  }, [onCapture])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (evt) => {
        if (evt.target?.result) {
          onCapture(evt.target.result as string)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  // Simplified constraints to ensure better compatibility
  const videoConstraints = {
    facingMode: 'environment', 
  }

  if (!isMounted) return null

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col overscroll-none touch-none">
      {/* Top Bar with robust safe area handling */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent pt-[calc(env(safe-area-inset-top)+1rem)]">
        <div className="w-12" /> 
        <div className="text-white font-medium drop-shadow-md text-lg mt-2">Beleg scannen</div>
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

      {/* Camera Feed */}
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

               <Button 
                 onClick={() => fileInputRef.current?.click()} 
                 className="w-full bg-white text-black hover:bg-gray-200"
               >
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
              videoConstraints={videoConstraints}
              className="absolute inset-0 h-full w-full object-cover"
              playsInline
              onUserMedia={() => setIsLoading(false)}
              onUserMediaError={(err) => {
                console.error("Webcam error:", err)
                setIsLoading(false)
                const msg = typeof err === 'string' ? err : (err as any).message || ''
                if (msg.includes('Permission denied') || msg.includes('NotAllowedError')) {
                   setCameraError("Zugriff auf Kamera verweigert. Bitte erlaube den Zugriff in den Browser-Einstellungen.")
                } else {
                   setCameraError("Kamera konnte nicht gestartet werden. Bitte nutze den Bildupload.")
                }
              }}
            />
            
            {/* Guide Grid Overlay */}
            {!isLoading && (
              <div className="absolute inset-0 pointer-events-none z-10">
                <div className="absolute top-1/3 left-0 right-0 h-px bg-white/30" />
                <div className="absolute top-2/3 left-0 right-0 h-px bg-white/30" />
                <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30" />
                <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/30" />
                
                {/* Active Capture Area Hint */}
                <div className="absolute inset-x-8 inset-y-12 border border-white/40 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.3)]" />
              </div>
            )}
          </>
        )}
      </div>

      {/* Controls */}
      {!cameraError && (
        <div className="h-32 bg-black flex items-center justify-center p-4 pb-safe-bottom z-20">
          <button
            onClick={capture}
            disabled={isLoading}
            className="h-20 w-20 rounded-full border-[6px] border-white/30 bg-white flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50 disabled:scale-100"
            aria-label="Foto aufnehmen"
          >
            <div className="h-16 w-16 rounded-full border-2 border-black" />
          </button>
        </div>
      )}
    </div>
  )
}
