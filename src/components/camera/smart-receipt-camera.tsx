'use client'

import * as React from 'react'
import { CameraView } from './camera-view'
import { CropEditor } from './crop-editor'

interface SmartReceiptCameraProps {
  onCapture: (file: File) => void
  onClose: () => void
}

export function SmartReceiptCamera({ onCapture, onClose }: SmartReceiptCameraProps) {
  const [mode, setMode] = React.useState<'CAMERA' | 'EDIT'>('CAMERA')
  const [capturedImage, setCapturedImage] = React.useState<string | null>(null)

  const [detectedCorners, setDetectedCorners] = React.useState<{x:number, y:number}[] | undefined>(undefined)

  const handleCapture = (imageSrc: string, corners?: {x:number, y:number}[]) => {
    // Capture state immediately
    setCapturedImage(imageSrc)
    setDetectedCorners(corners)
    
    // Switch to editing mode (Crop)
    setMode('EDIT')
    // CRITICAL: Do NOT call onCapture(file) here. 
    // The flow is: Camera -> Capture -> Edit/Crop -> Complete -> Upload
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
