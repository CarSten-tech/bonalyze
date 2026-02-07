'use client'

import * as React from 'react'
import Webcam from 'react-webcam'
import { Camera, X, RefreshCw, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { loadOpenCV } from '@/lib/opencv-loader'

interface CameraViewProps {
  onCapture: (imageSrc: string, corners?: {x:number, y:number}[]) => void
  onClose: () => void
}

export function CameraView({ onCapture, onClose }: CameraViewProps) {
  const webcamRef = React.useRef<Webcam>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const overlayRef = React.useRef<HTMLCanvasElement>(null)
  
  // Smoothing Queue
  const cornersHistory = React.useRef<{x:number, y:number}[][]>([])
  const NO_DETECTION_RESET_FRAMES = 5
  const noDetectionCount = React.useRef(0)

  const [isMounted, setIsMounted] = React.useState(false)
  const [cameraError, setCameraError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isOpenCVReady, setIsOpenCVReady] = React.useState(false)
  const [detectedCorners, setDetectedCorners] = React.useState<{x:number, y:number}[] | undefined>(undefined)
  
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

    // Load OpenCV
    loadOpenCV().then(() => {
        console.log("OpenCV loaded")
        setIsOpenCVReady(true)
    }).catch(err => {
        console.error("OpenCV load error", err)
        // We can still function without OpenCV, just no auto-detect
    })

  }, [])

  // Edge Detection Loop
  React.useEffect(() => {
      if (!isOpenCVReady || !webcamRef.current?.video || !canvasRef.current || !overlayRef.current) return

      let animationFrameId: number
      const cv = window.cv
      const video = webcamRef.current.video
      
      const processFrame = () => {
          if (video.readyState !== 4) {
             animationFrameId = requestAnimationFrame(processFrame)
             return
          }

          const width = video.videoWidth
          const height = video.videoHeight

          // Sync canvas sizes
          if (canvasRef.current && overlayRef.current) {
               if (canvasRef.current.width !== width) {
                   canvasRef.current.width = width
                   canvasRef.current.height = height
                   overlayRef.current.width = width
                   overlayRef.current.height = height
               }
          }

          let src: any = null
          let dst: any = null
          let contours: any = null
          let hierarchy: any = null
          let M: any = null
          let bestContour: any = null
          // approx/cnt are used inside loop, can be let there or here. 
          // to be safe with cleanup, let's decl here if needed, but loop vars are usually safe if not leaked.
          // actually cnt is from contours.get(i), need to delete it.

          try {
              // 1. Draw video to hidden canvas
              const ctx = canvasRef.current?.getContext('2d')
              if (!ctx) return
              ctx.drawImage(video, 0, 0, width, height)

              // 2. OpenCV Processing
              src = cv.imread(canvasRef.current)
              dst = new cv.Mat()
              
              // Downscale for speed (keep aspect ratio)
              let dsize = new cv.Size(0,0)
              const scale = 350 / Math.max(width, height)
              if (scale < 1) {
                  const w = Math.round(width * scale)
                  const h = Math.round(height * scale)
                  dsize = new cv.Size(w, h)
                  cv.resize(src, dst, dsize, 0, 0, cv.INTER_AREA)
              } else {
                  src.copyTo(dst)
              }

              cv.cvtColor(dst, dst, cv.COLOR_RGBA2GRAY, 0)
              cv.GaussianBlur(dst, dst, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT)
              
              // Use Otsu Thresholding
              cv.threshold(dst, dst, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU)
              
              // Dilate
              M = cv.Mat.ones(5, 5, cv.CV_8U)
              cv.dilate(dst, dst, M, new cv.Point(-1, -1), 2, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue())
              M.delete() 
              
              // Find Contours
              contours = new cv.MatVector()
              hierarchy = new cv.Mat()
              cv.findContours(dst, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

              let maxArea = 0
              // bestContour already declared up top defaults to null

              for (let i = 0; i < contours.size(); ++i) {
                  let cnt = contours.get(i)
                  let area = cv.contourArea(cnt)
                  
                  // Min area filter (5% of screen)
                  if (area < (dst.cols * dst.rows * 0.05)) {
                      cnt.delete()
                      continue 
                  }

                  let peri = cv.arcLength(cnt, true)
                  let approx = new cv.Mat()
                  cv.approxPolyDP(cnt, approx, 0.02 * peri, true)

                  // Basic Quad Check + Convexity
                  if (approx.rows === 4 && area > maxArea && cv.isContourConvex(approx)) {
                      maxArea = area
                      if (bestContour) bestContour.delete()
                      bestContour = approx
                  } else {
                      approx.delete()
                  }
                  cnt.delete()
              }

              // Draw on overlay
              const overlayCtx = overlayRef.current?.getContext('2d')
              if (overlayCtx) {
                  overlayCtx.clearRect(0, 0, width, height)
                  
                  let displayCorners: {x:number, y:number}[] | undefined

                  if (bestContour) {
                      const invScale = 1 / (scale < 1 ? scale : 1)
                      
                      // Extract points
                      const rawPts = []
                      const ptr = bestContour.data32S
                      for(let i=0; i<4; i++) {
                         rawPts.push({
                             x: ptr[i*2] * invScale,
                             y: ptr[i*2+1] * invScale
                         })
                      }
                      
                      // Sort Corners: TL, TR, BR, BL
                      // 1. Sort by Y
                      rawPts.sort((a,b) => a.y - b.y)
                      const top = rawPts.slice(0, 2).sort((a,b) => a.x - b.x)
                      const bottom = rawPts.slice(2, 4).sort((a,b) => a.x - b.x)
                      
                      const pts = [top[0], top[1], bottom[1], bottom[0]]

                      // --- Temporal Smoothing ---
                      cornersHistory.current.push(pts)
                      // Reduce buffer size for faster reactivity (was 5)
                      if (cornersHistory.current.length > 3) {
                          cornersHistory.current.shift()
                      }
                      noDetectionCount.current = 0

                      // Calculate Average
                      const avgCorners = [
                          {x:0,y:0}, {x:0,y:0}, {x:0,y:0}, {x:0,y:0}
                      ]
                      
                      const len = cornersHistory.current.length
                      for (const frame of cornersHistory.current) {
                          for (let i=0; i<4; i++) {
                              avgCorners[i].x += frame[i].x
                              avgCorners[i].y += frame[i].y
                          }
                      }
                      
                      displayCorners = avgCorners.map(p => ({
                          x: p.x / len,
                          y: p.y / len
                      }))
                      
                      bestContour.delete()
                  } else {
                      // No detection this frame
                      noDetectionCount.current++
                      if (noDetectionCount.current < NO_DETECTION_RESET_FRAMES && cornersHistory.current.length > 0) {
                           // Keep showing last known state for a few frames (prevents flickering)
                           const len = cornersHistory.current.length
                           const avgCorners = [
                               {x:0,y:0}, {x:0,y:0}, {x:0,y:0}, {x:0,y:0}
                           ]
                           for (const frame of cornersHistory.current) {
                               for (let i=0; i<4; i++) {
                                   avgCorners[i].x += frame[i].x
                                   avgCorners[i].y += frame[i].y
                               }
                           }
                           displayCorners = avgCorners.map(p => ({
                               x: p.x / len,
                               y: p.y / len
                           }))
                      } else {
                          // Lost it
                          cornersHistory.current = []
                          displayCorners = undefined
                      }
                  }

                  // Update State
                  setDetectedCorners(displayCorners)

                  // --- Lens Style Drawing ---
                  if (displayCorners) {
                      // 1. Darken background
                      overlayCtx.fillStyle = 'rgba(0, 0, 0, 0.5)'
                      overlayCtx.fillRect(0, 0, width, height)

                      // 2. Cut out the hole (Keep full quad hole for focus)
                      overlayCtx.globalCompositeOperation = 'destination-out'
                      overlayCtx.beginPath()
                      overlayCtx.moveTo(displayCorners[0].x, displayCorners[0].y)
                      overlayCtx.lineTo(displayCorners[1].x, displayCorners[1].y)
                      overlayCtx.lineTo(displayCorners[2].x, displayCorners[2].y)
                      overlayCtx.lineTo(displayCorners[3].x, displayCorners[3].y)
                      overlayCtx.closePath()
                      overlayCtx.fill()
                      
                      overlayCtx.globalCompositeOperation = 'source-over'

                      // 3. Draw CORNERS ONLY (L-Shapes)
                      overlayCtx.strokeStyle = 'white'
                      overlayCtx.lineWidth = 8 // Much thicker
                      overlayCtx.lineCap = 'round'
                      overlayCtx.lineJoin = 'round'

                      const cornLen = 40 // Length of L-arms
                      
                      // Helper to draw L at corner
                      const drawCorner = (idx: number, p1: {x:number, y:number}, pPrev: {x:number, y:number}, pNext: {x:number, y:number}) => {
                          // Vector to prev
                          const dx1 = pPrev.x - p1.x
                          const dy1 = pPrev.y - p1.y
                          const len1 = Math.sqrt(dx1*dx1 + dy1*dy1)
                          
                          // Vector to next
                          const dx2 = pNext.x - p1.x
                          const dy2 = pNext.y - p1.y
                          const len2 = Math.sqrt(dx2*dx2 + dy2*dy2)

                          // Avoid div by zero
                          if (len1 < 1 || len2 < 1) return

                          overlayCtx.beginPath()
                          // Draw arm to prev
                          overlayCtx.moveTo(p1.x + (dx1/len1)*Math.min(cornLen, len1), p1.y + (dy1/len1)*Math.min(cornLen, len1))
                          overlayCtx.lineTo(p1.x, p1.y)
                          // Draw arm to next
                          overlayCtx.lineTo(p1.x + (dx2/len2)*Math.min(cornLen, len2), p1.y + (dy2/len2)*Math.min(cornLen, len2))
                          overlayCtx.stroke()
                      }
                      
                      // TL (0) -> Prev is BL (3), Next is TR (1)
                      drawCorner(0, displayCorners[0], displayCorners[3], displayCorners[1])
                      // TR (1) -> Prev is TL (0), Next is BR (2)
                      drawCorner(1, displayCorners[1], displayCorners[0], displayCorners[2])
                      // BR (2) -> Prev is TR (1), Next is BL (3)
                      drawCorner(2, displayCorners[2], displayCorners[1], displayCorners[3])
                      // BL (3) -> Prev is BR (2), Next is TL (0)
                      drawCorner(3, displayCorners[3], displayCorners[2], displayCorners[0])

                      // No circles, just the thick L-corners as requested
                  } else {
                      // No detection: Clear/Transparent
                      setDetectedCorners(undefined)
                  }
              }

              // Cleanup
              src.delete()
              dst.delete()
              contours.delete()
              hierarchy.delete()

          } catch (err) {
              console.warn("CV Error", err)
              // Ensure cleanup if validation fails mid-way
              try {
                  if (src && !src.isDeleted()) src.delete()
                  if (dst && !dst.isDeleted()) dst.delete()
                  if (contours && !contours.isDeleted()) contours.delete()
                  if (hierarchy && !hierarchy.isDeleted()) hierarchy.delete()
              } catch (e) {}
          }

          animationFrameId = requestAnimationFrame(processFrame)
      }

      animationFrameId = requestAnimationFrame(processFrame)
      return () => cancelAnimationFrame(animationFrameId)

  }, [isOpenCVReady])

  const capture = React.useCallback(() => {
    try {
      if (!webcamRef.current) return
      const video = webcamRef.current.video
      if (!video) return

      // Manual Capture for Max Resolution
      // react-webcam's getScreenshot() sometimes defaults to lower res or display res.
      // We want the intrinsic resolution of the video stream (e.g. 4K or 1080p).
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      
      if (ctx) {
          ctx.drawImage(video, 0, 0)
          // High quality JPEG
          const imageSrc = canvas.toDataURL('image/jpeg', 0.95)
          
          if (imageSrc && imageSrc !== 'data:,') {
             // For debugging height
             console.log(`Captured resolution: ${canvas.width}x${canvas.height}`)
             // Use current detected corners if available
             const currentCorners = detectedCorners // Closure capture or ref?
             // Since this is a useCallback with [detectedCorners], it will always have the latest value.
             onCapture(imageSrc, currentCorners)
          } else {
             console.error("Capture failed: empty image")
          }
      }
    } catch (e) {
      console.error("Capture error", e)
    }
  }, [onCapture, detectedCorners])

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

  // High-Res Constraints (4K equivalent or HD)
  const videoConstraints = {
    facingMode: 'environment',
    width: { ideal: 3840 }, 
    height: { ideal: 2160 }
  }

  if (!isMounted) return null

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col overscroll-none touch-none">
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Bar with robust safe area handling */}
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
              screenshotQuality={1.0} // Max quality
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
            
            {/* Draw Overlay */}
            <canvas 
                ref={overlayRef} 
                className="absolute inset-0 h-full w-full pointer-events-none z-10 object-cover" 
            />
            
            {/* Guide Text/Overlay when no stable detection */}
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

      {/* Controls */}
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
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/10"
            onClick={() => {
                fileInputRef.current?.click()
            }}
          >
             <ImageIcon className="h-6 w-6" />
          </Button>
        </div>
      )}
    </div>
  )
}
