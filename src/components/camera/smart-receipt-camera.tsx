'use client'

import * as React from 'react'
import { CameraView } from './camera-view'
import { CropEditor } from './crop-editor'
import { detectDocumentEdges } from '@/lib/image-processing'

interface SmartReceiptCameraProps {
  onCapture: (file: File) => void
  onClose: () => void
}

import { createPortal } from 'react-dom'

export function SmartReceiptCamera({ onCapture, onClose }: SmartReceiptCameraProps) {
  const [mode, setMode] = React.useState<'CAMERA' | 'EDIT'>('CAMERA')
  const [capturedImage, setCapturedImage] = React.useState<string | null>(null)
  const [mounted, setMounted] = React.useState(false)

  const [detectedCorners, setDetectedCorners] = React.useState<{x:number, y:number}[] | undefined>(undefined)

  React.useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Effect: Run detection in background when image is captured
  React.useEffect(() => {
    if (!capturedImage || mode !== 'EDIT') return

    const runDetection = async () => {
       console.log("Starting background edge detection...")
       try {
          // Timeout race just in case, but now it won't block UI
          const detectPromise = detectDocumentEdges(capturedImage)
          const timeoutPromise = new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 3000))
          
          const detected = await Promise.race([detectPromise, timeoutPromise])
          
          if (detected) {
            console.log("Edge detection success", detected)
            setDetectedCorners(detected)
          } else {
            console.warn("Edge detection timed out")
          }
       } catch (e) {
          console.warn("Edge detection failed", e)
       }
    }

    // Only run if we don't have corners yet (or provided from outside)
    if (!detectedCorners) {
       runDetection()
    }
  }, [capturedImage, mode])

  const handleCapture = async (imageSrc: string, corners?: {x:number, y:number}[]) => {
    // 1. Immediate UI Switch
    console.log("Capture triggered, switching to Editor")
    setCapturedImage(imageSrc)
    setMode('EDIT')
    
    // If live corners were passed, use them immediately
    if (corners && corners.length === 4) {
        setDetectedCorners(corners)
    } else {
        setDetectedCorners(undefined) // Trigger effect
    }
  }

  const handleEditComplete = (blob: Blob) => {
    // Convert Blob to File
    const file = new File([blob], `scan-${Date.now()}.jpg`, { type: 'image/jpeg' })
    onCapture(file)
  }

  const handleRetake = () => {
    setCapturedImage(null)
    setDetectedCorners(undefined)
    setMode('CAMERA')
  }

  if (!mounted) return null

  const content = (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col overscroll-none touch-none h-[100dvh]">
      {mode === 'EDIT' && capturedImage ? (
        <CropEditor 
          imageSrc={capturedImage}
          initialCorners={detectedCorners}
          onCancel={handleRetake}
          onComplete={handleEditComplete}
        />
      ) : (
        <CameraView 
          onCapture={handleCapture}
          onClose={onClose}
        />
      )}
    </div>
  )

  return createPortal(content, document.body)
}
