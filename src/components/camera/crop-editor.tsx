'use client'

import * as React from 'react'
import { Check, Loader2, RotateCcw, X, Wand2, Contrast, Image as ImageIcon } from 'lucide-react'
import { toast } from "sonner"
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { applyPerspectiveWarp, applyFilter, detectDocumentEdges, detectStrongLines, type Point } from '@/lib/image-processing'

interface CropEditorProps {
  imageSrc: string
  initialCorners?: Point[] // From live detection
  onCancel: () => void
  onComplete: (blob: Blob) => void
}

export function CropEditor({ imageSrc, initialCorners, onCancel, onComplete }: CropEditorProps) {
  const [image, setImage] = React.useState<HTMLImageElement | null>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [corners, setCorners] = React.useState<[Point, Point, Point, Point]>([
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ])
  const [imageSize, setImageSize] = React.useState({ width: 0, height: 0 })
  const [containerSize, setContainerSize] = React.useState({ width: 0, height: 0 })
  
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [activeFilter, setActiveFilter] = React.useState<'original' | 'grayscale' | 'bw'>('original')
  const [showFilters, setShowFilters] = React.useState(false)
  const [activeHandleIndex, setActiveHandleIndex] = React.useState<number | null>(null)
  
  // Magnetic Lines
  const [snapLines, setSnapLines] = React.useState<{horizontal: number[], vertical: number[]}>({ horizontal: [], vertical: [] })

  // Load image & Update corners
  // 1. Load Image (Only when src changes)
  React.useEffect(() => {
    const img = new Image()
    img.src = imageSrc
    img.onload = () => {
      setImage(img)
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight })
      
      // Detect lines for snapping
      detectStrongLines(img.src).then(lines => {
          setSnapLines(lines)
      })
    }
  }, [imageSrc])

  // 2. Sync Corners (When image is ready OR corners change)
  React.useEffect(() => {
    if (imageSize.width === 0 || imageSize.height === 0) return

    if (initialCorners && initialCorners.length === 4) {
        setCorners(initialCorners as [Point, Point, Point, Point])
    } else {
        // Only set defaults if we haven't touched them yet? 
        // Or if this is the first setup.
        // For now, if no initialCorners are provided, we reset to default on mount/image change.
        // To avoid overwriting user edits if this effect runs late, we could check if corners are (0,0).
        // But for this use case (new scan), reset is usually expected if no corners found.
        
        // Check if we are already initialized to avoid reset on re-renders (if any)
        // But simpler: Just set default if we are in a "fresh" state or image changed.
        
        // Actually, detecting if it's a "new" image:
        const w = imageSize.width
        const h = imageSize.height
        const padX = w * 0.15
        const padY = h * 0.15
        
        // Only Apply defaults if we strictly have NO info (prevent overwriting if parent passes undefined later?)
        // The parent initializes with undefined, then passes corners.
        // If we set defaults immediately, then corners arrive, we overwrite defaults. That's good.
        setCorners([
          { x: padX, y: padY },         // TL
          { x: w - padX, y: padY },     // TR
          { x: w - padX, y: h - padY }, // BR
          { x: padX, y: h - padY },     // BL
        ])
    }
  }, [imageSize, initialCorners]) // Decoupled from image loading (no flickering)

  // Measure container (Robust)
  const measure = React.useCallback(() => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) {
        // Only update if changed to avoid loops
        setContainerSize(prev => {
            if (prev.width === rect.width && prev.height === rect.height) return prev
            console.log("CropEditor: Container measured", rect.width, rect.height)
            return { width: rect.width, height: rect.height }
        })
    } else {
        console.warn("CropEditor: Container has 0 dims", rect)
    }
  }, [])

  React.useLayoutEffect(() => {
    measure() // Immediate measure
    
    // Observer for resizing
    const resizeObserver = new ResizeObserver(() => measure())
    if (containerRef.current) {
        resizeObserver.observe(containerRef.current)
    }
    
    // Fallback poll just in case
    const timer = setTimeout(measure, 100)
    const timer2 = setTimeout(measure, 500)
    
    return () => {
        resizeObserver.disconnect()
        clearTimeout(timer)
        clearTimeout(timer2)
    }
  }, [measure])

  // Coordinate Conversion Helpers (Same logic)
  const toScreen = (pt: Point) => {
    // Log if missing dims
    if (!imageSize.width || !containerSize.width) {
        // console.debug("CropEditor: Missing dims for conversion", imageSize, containerSize)
        return { x: 0, y: 0 }
    }
    
    const imgRatio = imageSize.width / imageSize.height
    const containerRatio = containerSize.width / containerSize.height
    
    let displayWidth, displayHeight, offsetX, offsetY
    
    if (containerRatio > imgRatio) {
      displayHeight = containerSize.height
      displayWidth = displayHeight * imgRatio
      offsetX = (containerSize.width - displayWidth) / 2
      offsetY = 0
    } else {
      displayWidth = containerSize.width
      displayHeight = displayWidth / imgRatio
      offsetX = 0
      offsetY = (containerSize.height - displayHeight) / 2
    }
    
    const scale = displayWidth / imageSize.width
    
    return {
      x: offsetX + pt.x * scale,
      y: offsetY + pt.y * scale
    }
  }

  const toImage = (screenPt: Point) => {
    if (!imageSize.width || !containerSize.width) return { x: 0, y: 0 }
    
    const imgRatio = imageSize.width / imageSize.height
    const containerRatio = containerSize.width / containerSize.height
    
    let displayWidth, displayHeight, offsetX, offsetY
    
    if (containerRatio > imgRatio) {
      displayHeight = containerSize.height
      displayWidth = displayHeight * imgRatio
      offsetX = (containerSize.width - displayWidth) / 2
      offsetY = 0
    } else {
      displayWidth = containerSize.width
      displayHeight = displayWidth / imgRatio
      offsetX = 0
      offsetY = (containerSize.height - displayHeight) / 2
    }
    
    const scale = displayWidth / imageSize.width
    
    return {
      x: (screenPt.x - offsetX) / scale,
      y: (screenPt.y - offsetY) / scale
    }
  }
  
  const updateCorner = (index: number, newScreenPt: Point) => {
    const newImagePt = toImage(newScreenPt)
    setCorners(prev => {
      const next: [Point, Point, Point, Point] = [...prev]
      next[index] = {
        x: Math.max(0, Math.min(newImagePt.x, imageSize.width)),
        y: Math.max(0, Math.min(newImagePt.y, imageSize.height))
      }
      return next
    })
  }

  const handleSave = async () => {
    if (!image) return
    setIsProcessing(true)
    try {
      const warpedBlob = await applyPerspectiveWarp(image, corners)
      const finalBlob = await applyFilter(warpedBlob, activeFilter)
      onComplete(finalBlob)
    } catch (err) {
      console.error('Processing failed', err)
      toast.error("Fehler beim Verarbeiten")
    } finally {
      setIsProcessing(false)
    }
  }

  if (!image) return (
    <div className="flex items-center justify-center h-full bg-black text-white">
      <Loader2 className="animate-spin mr-2" /> Bild wird geladen...
    </div>
  )

  return (
    <div className="flex flex-col h-full bg-black text-white touch-none">
      {/* Top Bar: Cancel & Title */}
      <div className="flex justify-between items-center p-4 z-50 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0">
         <Button variant="ghost" size="icon" onClick={onCancel} className="text-white hover:bg-white/20 rounded-full">
            <X className="h-6 w-6" />
         </Button>
         <div className="flex flex-col items-center">
             <span className="font-semibold text-lg drop-shadow-md">Zuschneiden</span>
             <span className="text-xs text-white/70 drop-shadow-md">Ecken ziehen zum Anpassen</span>
         </div>
         {/* Filter Toggle */}
         <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setShowFilters(!showFilters)} 
            className={`rounded-full transition-colors ${showFilters || activeFilter !== 'original' ? 'text-primary bg-white/20' : 'text-white hover:bg-white/20'}`}
         >
            <Contrast className="h-6 w-6" />
         </Button>
      </div>
      
      {/* Filter Overlay (Conditional) */}
      {showFilters && (
         <div className="absolute top-16 right-4 z-50 bg-black/90 backdrop-blur-md rounded-xl border border-white/10 p-2 flex flex-col gap-2 shadow-2xl animate-in fade-in slide-in-from-top-2">
            <FilterOption isActive={activeFilter === 'original'} onClick={() => setActiveFilter('original')} label="Original" />
            <FilterOption isActive={activeFilter === 'bw'} onClick={() => setActiveFilter('bw')} label="Dokument" />
            <FilterOption isActive={activeFilter === 'grayscale'} onClick={() => setActiveFilter('grayscale')} label="Graustufen" />
         </div>
      )}

      {/* Magnifier */}
      {(() => {
          if (activeHandleIndex === null || !image) return null
          
          let pt: Point = { x: 0, y: 0 }
          
          if (activeHandleIndex < 4) {
              pt = corners[activeHandleIndex]
          } else {
              // Side Handle (4=Top, 5=Right, 6=Bottom, 7=Left)
              const sideIdx = activeHandleIndex - 4
              const p1 = corners[sideIdx]
              const p2 = corners[(sideIdx + 1) % 4]
              pt = { x: (p1.x + p2.x)/2, y: (p1.y + p2.y)/2 }
          }
          
          const screenPt = toScreen(pt)
          
          return (
             <Magnifier 
                imageSrc={imageSrc}
                x={pt.x} y={pt.y}
                imgWidth={imageSize.width} imgHeight={imageSize.height}
                screenX={screenPt.x} screenY={screenPt.y}
                activeHandleIndex={activeHandleIndex as number}
             />
          )
      })()}

      {/* Debug Overlay */}
      {(process.env.NODE_ENV === 'development' || true) && (
          <div className="absolute top-20 left-4 z-[60] bg-black/50 text-white text-[10px] p-1 pointer-events-none font-mono">
              Img: {imageSize.width}x{imageSize.height}<br/>
              Cont: {Math.round(containerSize.width)}x{Math.round(containerSize.height)}<br/>
              Corners: {corners.map(c => `(${Math.round(c.x)},${Math.round(c.y)})`).join(' ')}
          </div>
      )}

      {/* Editor Area */}
      <div className="flex-1 relative w-full h-full overflow-hidden bg-black">
        <div ref={containerRef} className="absolute inset-0 w-full h-full touch-none">
          {/* Image */}
          {image && (
            <img
              src={imageSrc}
              alt="Source"
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full object-contain select-none pointer-events-none"
            />
          )}
          
          {/* SVG Overlay & Handles */}
          {/* Always try to render if we have basic dims */}
          {(containerSize.width > 0 && imageSize.width > 0) && (
            <>
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-40" style={{ overflow: 'visible' }}>
                <defs>
                   <mask id="cropMask">
                      <rect x="0" y="0" width="100%" height="100%" fill="white" />
                      <path 
                        d={`M ${toScreen(corners[0]).x} ${toScreen(corners[0]).y} 
                            L ${toScreen(corners[1]).x} ${toScreen(corners[1]).y} 
                            L ${toScreen(corners[2]).x} ${toScreen(corners[2]).y} 
                            L ${toScreen(corners[3]).x} ${toScreen(corners[3]).y} Z`}
                        fill="black" 
                      />
                   </mask>
                </defs>
                
                {/* Darken outside area - Lens style: semi-transparent black */}
                <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.6)" mask="url(#cropMask)" />
                
                {/* Border Line - Solid White */}
                <path 
                    d={`M ${toScreen(corners[0]).x} ${toScreen(corners[0]).y} L ${toScreen(corners[1]).x} ${toScreen(corners[1]).y} L ${toScreen(corners[2]).x} ${toScreen(corners[2]).y} L ${toScreen(corners[3]).x} ${toScreen(corners[3]).y} Z`}
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))' }}
                />
              </svg>

              {/* Side Handles (Midpoints) */}
              {[0, 1, 2, 3].map(i => {
                  const p1 = corners[i]
                  const p2 = corners[(i + 1) % 4]
                  const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
                  const screenMid = toScreen(mid)
                  
                  // Side Drag Handler
                  const handleSidePointerDown = (e: React.PointerEvent) => {
                      e.preventDefault(); e.stopPropagation()
                      // We use a special index > 3 to indicate side? Or just a separate state.
                      // Let's us separate state for clarity or just 0-3 for corners, 4-7 for sides.
                      // 4=Top (0-1), 5=Right (1-2), 6=Bottom (2-3), 7=Left (3-0)
                      setActiveHandleIndex(4 + i) 
                      
                      const startX = e.clientX
                      const startY = e.clientY
                      
                      // Calculate scale
                      const imgRatio = imageSize.width / imageSize.height
                      const containerRatio = containerSize.width / containerSize.height
                      let displayWidth
                      if (containerRatio > imgRatio) {
                           const displayHeight = containerSize.height
                           displayWidth = displayHeight * imgRatio
                      } else {
                           displayWidth = containerSize.width
                      }
                      const scale = displayWidth / imageSize.width
                      
                      const startCorners = [...corners]

                      const onPointerMove = (moveEvent: PointerEvent) => {
                          const dx = (moveEvent.clientX - startX) / scale
                          const dy = (moveEvent.clientY - startY) / scale
                          
                          setCorners(prev => {
                              const next: [Point, Point, Point, Point] = [...prev]
                              
                              const sideIndex = i // 0=Top, 1=Right, 2=Bottom, 3=Left
                              
                              // Move P1 and P2
                              const p1Old = startCorners[i]
                              const p2Old = startCorners[(i + 1) % 4]
                              
                              // Constrain Delta based on side
                              let effectiveDx = dx
                              let effectiveDy = dy
                              
                              if (sideIndex === 0 || sideIndex === 2) {
                                  // Top/Bottom: Only move vertically (Y)
                                  effectiveDx = 0
                              } else {
                                  // Left/Right: Only move horizontally (X)
                                  effectiveDy = 0
                              }

                              const nx1 = p1Old.x + effectiveDx
                              const ny1 = p1Old.y + effectiveDy
                              const nx2 = p2Old.x + effectiveDx
                              const ny2 = p2Old.y + effectiveDy
                              
                              // Clamp logic...
                              if (nx1 < 0 || nx2 < 0 || nx1 > imageSize.width || nx2 > imageSize.width) return prev
                              if (ny1 < 0 || ny2 < 0 || ny1 > imageSize.height || ny2 > imageSize.height) return prev

                              next[i] = { x: nx1, y: ny1 }
                              next[(i + 1) % 4] = { x: nx2, y: ny2 }
                              
                              return next
                          })
                      }
                      
                      const onPointerUp = () => {
                          window.removeEventListener('pointermove', onPointerMove)
                          window.removeEventListener('pointerup', onPointerUp)
                          setActiveHandleIndex(null)
                      }
                      
                      window.addEventListener('pointermove', onPointerMove)
                      window.addEventListener('pointerup', onPointerUp)
                  }

                  return (
                      <div
                          key={`side-${i}`}
                          className="absolute w-10 h-10 -ml-5 -mt-5 z-50 flex items-center justify-center cursor-move"
                          style={{ left: screenMid.x, top: screenMid.y }}
                          onPointerDown={handleSidePointerDown}
                      >
                          {/* Visual: Rotated Pill based on side */}
                          {/* 0=Top(H), 1=Right(V), 2=Bottom(H), 3=Left(V) */}
                          <div 
                            className={`bg-white rounded-full shadow-[0_0_2px_rgba(0,0,0,0.5)] ${
                                (i === 0 || i === 2) 
                                ? "w-6 h-1.5"   // Horizontal
                                : "w-1.5 h-6"   // Vertical
                            }`} 
                          /> 
                      </div>
                  )
              })}

              {/* Corner Handles */}
              {corners.map((pt, i) => {
                const screenPt = toScreen(pt)
                
                // Manual Pointer Events implementation
                const handlePointerDown = (e: React.PointerEvent) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setActiveHandleIndex(i)
                    
                    const startX = e.clientX
                    const startY = e.clientY
                    const startPoint = corners[i] // Image coordinates
                    
                    // We need to map Delta Screen -> Delta Image
                    // Calculate scale factor once
                    const imgRatio = imageSize.width / imageSize.height
                    const containerRatio = containerSize.width / containerSize.height
                    let displayWidth
                    if (containerRatio > imgRatio) {
                         // Container wider, fit height
                         const displayHeight = containerSize.height
                         displayWidth = displayHeight * imgRatio
                    } else {
                         displayWidth = containerSize.width
                    }
                    const scale = displayWidth / imageSize.width

                    const onPointerMove = (moveEvent: PointerEvent) => {
                        const dx = (moveEvent.clientX - startX) / scale
                        const dy = (moveEvent.clientY - startY) / scale
                        
                        let tx = Math.max(0, Math.min(startPoint.x + dx, imageSize.width))
                        let ty = Math.max(0, Math.min(startPoint.y + dy, imageSize.height))

                        // --- Magnetic Snap REMOVED (User Request) ---
                        // "If I pull manually with the magnifier, they should be disabled"

                        const newPt = { x: tx, y: ty }
                        
                        setCorners(prev => {
                            const next: [Point, Point, Point, Point] = [...prev]
                            next[i] = newPt
                            return next
                        })
                    }
                    
                    const onPointerUp = () => {
                        window.removeEventListener('pointermove', onPointerMove)
                        window.removeEventListener('pointerup', onPointerUp)
                        setActiveHandleIndex(null)
                    }
                    
                    window.addEventListener('pointermove', onPointerMove)
                    window.addEventListener('pointerup', onPointerUp)
                }

                return (
                  <React.Fragment key={i}>
                    <div
                      onPointerDown={handlePointerDown}
                      style={{
                        position: 'absolute',
                        left: screenPt.x, 
                        top: screenPt.y,
                        touchAction: 'none'
                      }}
                      className="absolute -ml-5 -mt-5 w-10 h-10 z-50 flex items-center justify-center cursor-move"
                    >
                      {/* Visual: Small White Dot */}
                      <div className="w-2.5 h-2.5 bg-white rounded-full shadow-[0_0_2px_rgba(0,0,0,0.5)] border border-transparent" />
                    </div>
                  </React.Fragment>
                )
              })}
            </>
          )}
        </div>
      </div>

      {/* Bottom Bar: Action Buttons */}
      <div className="p-6 pb-12 bg-gradient-to-t from-black via-black/90 to-transparent flex justify-between items-center z-50">
         {/* Reset/Auto */}
         <Button 
            variant="secondary" 
            size="lg" 
            onClick={() => {
                // Determine rough corners again (Reset)
                const w = imageSize.width
                const h = imageSize.height
                setCorners([
                    { x: w*0.15, y: h*0.15 },
                    { x: w - w*0.15, y: h*0.15 },
                    { x: w - w*0.15, y: h - h*0.15 },
                    { x: w*0.15, y: h - h*0.15 },
                ])
            }}
            className="rounded-full w-14 h-14 bg-white/10 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 p-0"
         >
            <RotateCcw className="h-6 w-6" />
         </Button>

         {/* Confirm Main Action */}
         <Button 
            onClick={handleSave} 
            disabled={isProcessing}
            className="rounded-full w-20 h-20 bg-white text-black hover:bg-gray-200 shadow-[0_0_40px_rgba(255,255,255,0.3)] p-0 flex items-center justify-center transform transition-transform active:scale-95"
         >
            {isProcessing ? <Loader2 className="h-8 w-8 animate-spin" /> : <Check className="h-10 w-10" />}
         </Button>
         
         {/* Spacer to balance layout (or maybe Auto-Detect button later) */}
         <div className="w-14" />
      </div>
    </div>
  )
}

function FilterOption({ isActive, onClick, label }: { isActive: boolean, onClick: () => void, label: string }) {
    return (
        <button 
            onClick={onClick}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all text-left flex items-center justify-between min-w-[120px] ${isActive ? 'bg-white text-black' : 'text-white hover:bg-white/10'}`}
        >
            {label}
            {isActive && <Check className="h-3 w-3 ml-2" />}
        </button>
    )
}

interface MagnifierProps {
    imageSrc: string
    x: number // Image coordinate X
    y: number // Image coordinate Y
    imgWidth: number
    imgHeight: number
    screenX: number
    screenY: number
    activeHandleIndex: number
}

function Magnifier({ imageSrc, x, y, imgWidth, imgHeight, screenX, screenY, activeHandleIndex }: MagnifierProps) {
    // Zoom level reduced (3.0 -> 2.0)
    const ZOOM = 2.0
    const SIZE = 120 // Larger view area
    
    const bgAbsWidth = imgWidth * ZOOM
    const bgAbsHeight = imgHeight * ZOOM
    
    // We want the touched point (x,y) to be in the CENTER of the magnifier window
    const bgPosX = - (x * ZOOM - SIZE/2)
    const bgPosY = - (y * ZOOM - SIZE/2)
    
    // Offset logic: "Lupe_Y = Finger_Y - 100px"
    const OFFSET_Y = 100 

    // Determine corner style
    // 0=TL, 1=TR, 2=BR, 3=BL
    // 4=Top, 5=Right, 6=Bottom, 7=Left
    const isCorner = activeHandleIndex < 4
    const cornerId = activeHandleIndex
    
    return (
        <div 
            className="pointer-events-none fixed z-50 rounded-full border-[3px] border-white shadow-2xl overflow-hidden bg-black"
            style={{
                width: SIZE,
                height: SIZE,
                position: 'absolute', 
                left: screenX - SIZE/2, 
                top: screenY - OFFSET_Y - (SIZE/2),
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            }}
        >
            <div 
                style={{
                    width: '100%',
                    height: '100%',
                    backgroundImage: `url(${imageSrc})`,
                    backgroundSize: `${bgAbsWidth}px ${bgAbsHeight}px`,
                    backgroundPosition: `${bgPosX}px ${bgPosY}px`,
                    backgroundRepeat: 'no-repeat'
                }}
            />
            {/* Corner Indicator (White L-shape) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {isCorner && (
                    <div className="relative w-8 h-8 opacity-90">
                        {/* Top Left Corner style */}
                        {(cornerId === 0) && (
                             <div className="absolute top-0 left-0 w-full h-full border-l-[3px] border-t-[3px] border-white" />
                        )}
                        {/* Top Right */}
                        {(cornerId === 1) && (
                             <div className="absolute top-0 right-0 w-full h-full border-r-[3px] border-t-[3px] border-white" />
                        )}
                        {/* Bottom Right */}
                        {(cornerId === 2) && (
                             <div className="absolute bottom-0 right-0 w-full h-full border-r-[3px] border-b-[3px] border-white" />
                        )}
                        {/* Bottom Left */}
                        {(cornerId === 3) && (
                             <div className="absolute bottom-0 left-0 w-full h-full border-l-[3px] border-b-[3px] border-white" />
                        )}
                    </div>
                )}
                
                {/* Side lines? Maybe just a straight line for sides */}
                {!isCorner && (
                    <div className="relative w-8 h-8 opacity-90 flex items-center justify-center">
                        {/* Top/Bottom (4, 6) -> Horizontal Line */}
                        {(cornerId === 4 || cornerId === 6) && <div className="w-full h-[3px] bg-white" />}
                        {/* Left/Right (5, 7) -> Vertical Line */}
                        {(cornerId === 5 || cornerId === 7) && <div className="h-full w-[3px] bg-white" />}
                    </div>
                )}
            </div>
        </div>
    )
}
