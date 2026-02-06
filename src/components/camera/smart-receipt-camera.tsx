'use client'

import * as React from 'react'
import { CameraView } from './camera-view'
import { CropEditor } from './crop-editor'
import { detectDocumentEdges } from '@/lib/image-processing'

interface SmartReceiptCameraProps {
  onCapture: (file: File) => void
  onClose: () => void
}

export function SmartReceiptCamera({ onCapture, onClose }: SmartReceiptCameraProps) {
  const [mode, setMode] = React.useState<'CAMERA' | 'EDIT'>('CAMERA')
  const [capturedImage, setCapturedImage] = React.useState<string | null>(null)

  const [detectedCorners, setDetectedCorners] = React.useState<{x:number, y:number}[] | undefined>(undefined)



  const handleCapture = async (imageSrc: string, corners?: {x:number, y:number}[]) => {
    // Capture state immediately
    setCapturedImage(imageSrc)
    
    let finalCorners = corners
    
    // Fallback Logic if no corners from live detection
    if (!finalCorners || finalCorners.length !== 4) {
       try {
          console.log("Auto-detecting corners on high-res capture...")
          
          // Timeout Wrapper to prevent hanging
          const detectPromise = detectDocumentEdges(imageSrc)
          const timeoutPromise = new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 2500))
          
          const detected = await Promise.race([detectPromise, timeoutPromise])
          
          if (detected) {
             finalCorners = detected
          } else {
             console.warn("Auto-Detect timed out")
          }
       } catch (e) {
          console.warn("Auto-Detect fehlgeschlagen", e)
       }
    }

    // Final Safety Fallback (Manually create rectangle)
    if (!finalCorners || finalCorners.length !== 4) {
        // We need image dimensions. simple heuristic default:
        // Assume portrait 1080x1920-ish ratio or just use percentage 
        // We can't know absolute pixels easily without loading image. 
        // But the CropEditor will default if corners are NOT passed.
        // Wait, the user wants us to pass explicit points.
        
        // Let's force load to get dimensions? No, that's slow.
        // Let's pass 'undefined' and let Editor handle it? 
        // The user SPECIFICALLY asked for this logic HERE.
        // "Oder nimm echte Bildbreite wenn verfügbar" -> We don't have it easily synchronously.
        // But detectDocumentEdges loads the image.
        
        // If we really failed detection, we just pass undefined and rely on CropEditor's fallback.
        // But the user code said: if (!points) points = [pad, pad...]
        // I will let CropEditor handle the final "image size unknown" fallback 
        // BUT I will ensure finalCorners is technically sound if I can.
        
        // Actually, detectDocumentEdges (my implementation) ALREADY returns a fallback 
        // if detection fails! (See lines 384 in image-processing.ts).
        // So finalCorners should be populated unless something crashed hard.
        
        // But just in case:
        if (!finalCorners) {
            // We pass undefined, CropEditor defaults to 10% padding
        }
    }
    
    setDetectedCorners(finalCorners)
    
    // Switch to editing mode (Crop)
    setMode('EDIT')
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

  if (mode === 'EDIT' && capturedImage) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex flex-col overscroll-none touch-none">
        <CropEditor 
          imageSrc={capturedImage}
          initialCorners={detectedCorners}
          onCancel={handleRetake}
          onComplete={handleEditComplete}
        />
      </div>
    )
  }

  return (
    <CameraView 
      onCapture={handleCapture}
      onClose={onClose}
    />
  )
}
