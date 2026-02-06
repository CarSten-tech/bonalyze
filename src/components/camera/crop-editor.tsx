'use client'

import * as React from 'react'
import { Check, Loader2, RotateCcw, X, Wand2, Contrast, Image as ImageIcon } from 'lucide-react'
import { toast } from "sonner"
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { applyPerspectiveWarp, applyFilter, detectDocumentEdges, type Point } from '@/lib/image-processing'

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

  // Load image & Update corners
  React.useEffect(() => {
    const img = new Image()
    img.src = imageSrc
    img.onload = async () => {
      setImage(img)
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight })
      
      // If we have corners (either initial or late-arriving), apply them
      if (initialCorners && initialCorners.length === 4) {
          setCorners(initialCorners as [Point, Point, Point, Point])
      } else {
          // Only set default fallback if we haven't set corners yet OR if it's the very first load
          // But here we re-run on imageSrc change.
          const w = img.naturalWidth
          const h = img.naturalHeight
          const padX = w * 0.15
          const padY = h * 0.15
          setCorners([
            { x: padX, y: padY },         // TL
            { x: w - padX, y: padY },     // TR
            { x: w - padX, y: h - padY }, // BR
            { x: padX, y: h - padY },     // BL
          ])
      }
    }
  }, [imageSrc, initialCorners]) // React to updates in corners!

  // Measure container (Robust)
  React.useLayoutEffect(() => {
    if (!containerRef.current) return
    
    const measure = () => {
        const rect = containerRef.current?.getBoundingClientRect()
        if (rect && rect.width > 0 && rect.height > 0) {
            setContainerSize({ width: rect.width, height: rect.height })
        }
    }
    
    measure() // Immediate measure
    
    // Observer for resizing
    const resizeObserver = new ResizeObserver(() => measure())
    resizeObserver.observe(containerRef.current)
    
    return () => resizeObserver.disconnect()
  }, [])

  // Coordinate Conversion Helpers (Same logic)
  const toScreen = (pt: Point) => {
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

      {/* Debug Overlay */}
      {process.env.NODE_ENV === 'development' && (
          <div className="absolute top-20 left-4 z-[60] bg-black/50 text-white text-[10px] p-1 pointer-events-none font-mono">
              Img: {imageSize.width}x{imageSize.height}<br/>
              Cont: {Math.round(containerSize.width)}x{Math.round(containerSize.height)}<br/>
              Corners: {corners.map(c => `(${Math.round(c.x)},${Math.round(c.y)})`).join(' ')}
          </div>
      )}

      {/* Editor Area */}
      <div className="flex-1 relative w-full h-full overflow-hidden bg-gray-900/50">
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
                
                {/* Darken outside area */}
                <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.6)" mask="url(#cropMask)" />
                
                {/* Border Line */}
                <path 
                    d={`M ${toScreen(corners[0]).x} ${toScreen(corners[0]).y} L ${toScreen(corners[1]).x} ${toScreen(corners[1]).y} L ${toScreen(corners[2]).x} ${toScreen(corners[2]).y} L ${toScreen(corners[3]).x} ${toScreen(corners[3]).y} Z`}
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="drop-shadow-[0_0_4px_rgba(0,0,0,0.8)]"
                />
              </svg>

              {/* Handles */}
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
                        
                        const newPt = {
                            x: Math.max(0, Math.min(startPoint.x + dx, imageSize.width)),
                            y: Math.max(0, Math.min(startPoint.y + dy, imageSize.height))
                        }
                        
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
                        left: 0, top: 0,
                        transform: `translate(${screenPt.x - 24}px, ${screenPt.y - 24}px)`,
                        width: '48px',
                        height: '48px',
                        zIndex: 50,
                        touchAction: 'none'
                      }}
                      className="cursor-none flex items-center justify-center outline-none"
                    >
                      {/* Big touch target, visible dot */}
                      <div className="w-6 h-6 bg-white rounded-full shadow-[0_0_0_2px_rgba(0,0,0,0.3)] ring-4 ring-white/30 backdrop-blur-sm transition-transform active:scale-125 pointer-events-none" />
                    </div>
                    
                     {/* Magnifier */}
                    {activeHandleIndex === i && (
                      <Magnifier 
                          imageSrc={imageSrc} 
                          x={pt.x} y={pt.y} 
                          imgWidth={imageSize.width} imgHeight={imageSize.height}
                          screenX={screenPt.x} screenY={screenPt.y}
                      />
                    )}
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
}

function Magnifier({ imageSrc, x, y, imgWidth, imgHeight, screenX, screenY }: MagnifierProps) {
    // Zoom level matching "Microsoft Lens" feels (approx 3x)
    const ZOOM = 3.0
    const SIZE = 120 // Larger view area
    
    const bgAbsWidth = imgWidth * ZOOM
    const bgAbsHeight = imgHeight * ZOOM
    
    // We want the touched point (x,y) to be in the CENTER of the magnifier window
    const bgPosX = - (x * ZOOM - SIZE/2)
    const bgPosY = - (y * ZOOM - SIZE/2)
    
    // Offset logic: "Lupe_Y = Finger_Y - 100px"
    // We position the magnifier absolute relative to the container.
    // screenX/screenY are the center coordinates of the handle.
    // We want the BOTTOM of the magnifier to be some distance above the finger?
    // Or center of magnifier is 100px above?
    // "etwa 80-100 Pixel darüber" usually means the bottom edge is clear of the finger.
    const OFFSET_Y = 100 
    
    return (
        <div 
            className="pointer-events-none fixed z-50 rounded-full border-[4px] border-white shadow-2xl overflow-hidden bg-black"
            style={{
                width: SIZE,
                height: SIZE,
                position: 'absolute', 
                left: screenX - SIZE/2, 
                top: screenY - OFFSET_Y - (SIZE/2), // Center of loupe is offset up by 100 + half size
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
            {/* Fine Crosshair */}
            <div className="absolute inset-0 flex items-center justify-center opacity-80">
                <div className="w-full h-[1px] bg-red-400/80 shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
                <div className="h-full w-[1px] absolute bg-red-400/80 shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
            </div>
        </div>
    )
}
