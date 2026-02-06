'use client'

import * as React from 'react'
import { Check, Loader2, RotateCcw, X, Wand2, Contrast, Image as ImageIcon } from 'lucide-react'
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
  const [activeHandleIndex, setActiveHandleIndex] = React.useState<number | null>(null)

  // Load image
  React.useEffect(() => {
    const img = new Image()
    img.src = imageSrc
    img.onload = async () => {
      setImage(img)
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight })
      
      if (initialCorners && initialCorners.length === 4) {
          // Use AI detected corners if available
          setCorners(initialCorners as [Point, Point, Point, Point])
      } else {
          // Fallback to auto-detect (legacy) or default
          try {
              // Since we have OpenCV loaded potentially, we could use it here too!
              // But strictly speaking, if live detect failed, this might fail too.
              // Let's fallback to defaults for speed.
              
              const w = img.naturalWidth
              const h = img.naturalHeight
              const padX = w * 0.1
              const padY = h * 0.1
              setCorners([
                { x: padX, y: padY },         // TL
                { x: w - padX, y: padY },     // TR
                { x: w - padX, y: h - padY }, // BR
                { x: padX, y: h - padY },     // BL
              ])
          } catch (err) {
              console.warn('Init failed', err)
          }
      }
    }
  }, [imageSrc])

  // Measure container for coordinate mapping
  React.useEffect(() => {
    if (!containerRef.current) return
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        })
      }
    })
    resizeObserver.observe(containerRef.current)
    return () => resizeObserver.disconnect()
  }, [])

  // Coordinate Conversion Helpers
  // Image (Natural) -> Screen (Displayed)
  const toScreen = (pt: Point) => {
    if (!imageSize.width || !containerSize.width) return { x: 0, y: 0 }
    
    const imgRatio = imageSize.width / imageSize.height
    const containerRatio = containerSize.width / containerSize.height
    
    let displayWidth, displayHeight, offsetX, offsetY
    
    if (containerRatio > imgRatio) {
      // Container is wider, fit by height
      displayHeight = containerSize.height
      displayWidth = displayHeight * imgRatio
      offsetX = (containerSize.width - displayWidth) / 2
      offsetY = 0
    } else {
      // Container is taller, fit by width
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

  // Screen -> Image
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

  const handleDrag = (index: number, info: any) => {
    // Framer motion drag info gives delta, but we need absolute position relative to container
    // We can use the visual element interaction? No.
    // Let's rely on updating state ONLY when drag ends or use onDrag.
    // Framer motion onDrag gives (event, info). Info.point is global.
    // We need relative to container.
    
    // Simplification: Let's assume the draggable div's bounding box is correct.
    // Actually, updating state on every frame might be heavy.
    // But we need to draw lines.
  }
  
  // Custom Drag Handler to sync state
  const updateCorner = (index: number, newScreenPt: Point) => {
    const newImagePt = toImage(newScreenPt)
    setCorners(prev => {
      const next: [Point, Point, Point, Point] = [...prev]
      // Clamp to image bounds
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
      // 1. Perspective Crop
      const warpedBlob = await applyPerspectiveWarp(image, corners)
      
      // 2. Apply Filter
      const finalBlob = await applyFilter(warpedBlob, activeFilter)
      
      onComplete(finalBlob)
    } catch (err) {
      console.error('Processing failed', err)
      // Fallback: Just return original if warping fails
      // onComplete(originalBlob)
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
    <div className="flex flex-col h-full bg-black text-white">
      {/* Header */}
      <div className="flex justify-between items-center p-4">
        <Button variant="ghost" onClick={onCancel} className="text-white">
          <RotateCcw className="mr-2 h-4 w-4" /> Neu
        </Button>
        <span className="font-semibold">Zuschneiden</span>
        <Button onClick={handleSave} disabled={isProcessing} className="bg-white text-black hover:bg-gray-200">
          {isProcessing ? <Loader2 className="animate-spin" /> : <Check className="h-4 w-4" />}
        </Button>
      </div>

      {/* Editor Area */}
      <div className="flex-1 bg-black p-5 flex flex-col" style={{ touchAction: 'none' }}>
        <div ref={containerRef} className="relative flex-1 w-full h-full overflow-hidden">
          {/* Render Image Centered */}
          {image && (
            <img
              src={imageSrc}
              alt="Source"
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full object-contain select-none pointer-events-none"
              style={{ 
                maxWidth: '100%', 
                maxHeight: '100%'
              }} 
            />
          )}
          
          {/* SVG Overlay: Dimmer + Frame */}
          {containerSize.width > 0 && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" style={{ overflow: 'visible' }}>
              {/* Dimmed Background using evenodd rule */}
              <path 
                  d={`
                  M 0 0 H ${containerSize.width} V ${containerSize.height} H 0 Z 
                  M ${toScreen(corners[0]).x} ${toScreen(corners[0]).y} 
                  L ${toScreen(corners[1]).x} ${toScreen(corners[1]).y} 
                  L ${toScreen(corners[2]).x} ${toScreen(corners[2]).y} 
                  L ${toScreen(corners[3]).x} ${toScreen(corners[3]).y} Z
                  `}
                  fill="rgba(0, 0, 0, 0.6)"
                  fillRule="evenodd"
              />
              
              {/* White Border Line */}
              <path 
                  d={`M ${toScreen(corners[0]).x} ${toScreen(corners[0]).y} L ${toScreen(corners[1]).x} ${toScreen(corners[1]).y} L ${toScreen(corners[2]).x} ${toScreen(corners[2]).y} L ${toScreen(corners[3]).x} ${toScreen(corners[3]).y} Z`}
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="drop-shadow-md"
              />
              </svg>
          )}

          {/* Draggable Handles */}
          {corners.map((pt, i) => {
            const screenPt = toScreen(pt)
            const isDragging = activeHandleIndex === i
            
            return (
              <React.Fragment key={i}>
                <motion.div
                  drag
                  dragMomentum={false}
                  dragElastic={0}
                  onDragStart={() => setActiveHandleIndex(i)}
                  onDragEnd={() => setActiveHandleIndex(null)}
                  onDrag={(_, info) => {
                    const rect = containerRef.current?.getBoundingClientRect()
                    if (rect) {
                      const x = info.point.x - rect.left
                      const y = info.point.y - rect.top
                      updateCorner(i, { x, y })
                    }
                  }}
                  style={{
                    position: 'absolute',
                    left: 0, 
                    top: 0,
                    x: screenPt.x - 24, // larger hit area
                    y: screenPt.y - 24,
                  }}
                  className="w-12 h-12 z-20 cursor-move flex items-center justify-center outline-none touch-none"
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm ring-1 ring-black/20 ${isDragging ? 'scale-125' : ''} transition-transform`} />
                </motion.div>

                {/* Magnifier Glass */}
                {isDragging && image && (
                  <Magnifier 
                      imageSrc={imageSrc} 
                      x={pt.x} 
                      y={pt.y} 
                      imgWidth={imageSize.width}
                      imgHeight={imageSize.height}
                      screenX={screenPt.x}
                      screenY={screenPt.y}
                  />
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>



      {/* Filter Toolbar */}
      <div className="flex justify-around items-center p-4 bg-gray-900 border-t border-gray-800">
        <FilterButton 
          icon={<ImageIcon />} 
          label="Original" 
          active={activeFilter === 'original'} 
          onClick={() => setActiveFilter('original')} 
        />
        <FilterButton 
          icon={<Contrast />} 
          label="S/W" 
          active={activeFilter === 'bw'} 
          onClick={() => setActiveFilter('bw')} 
        />
        <FilterButton 
          icon={<Wand2 />} 
          label="Grau" 
          active={activeFilter === 'grayscale'} 
          onClick={() => setActiveFilter('grayscale')} 
        />
      </div>
    </div>
  )
}

function FilterButton({ icon, label, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
        active ? 'text-blue-400 bg-blue-400/10' : 'text-gray-400 hover:text-white'
      }`}
    >
      <div className="h-6 w-6">{icon}</div>
      <span className="text-xs">{label}</span>
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
    // Zoom level
    const ZOOM = 2.0
    const SIZE = 96 // Size of magnifier window (pixels)
    
    // We want to show the area around (x,y) from the image.
    // We can use background-position to offset.
    
    // Calculate background position
    // If we want to center (x,y) in the window:
    // BG Size = imgWidth * ZOOM
    // Offset X = - (x * ZOOM - SIZE/2)
    
    const bgAbsWidth = imgWidth * ZOOM
    const bgAbsHeight = imgHeight * ZOOM
    
    const bgPosX = - (x * ZOOM - SIZE/2)
    const bgPosY = - (y * ZOOM - SIZE/2)
    
    // Position the magnifier above the finger, pushed explicitly away to not be covered
    const offsetTop = -80
    
    return (
        <div 
            className="pointer-events-none fixed z-50 rounded-full border-[3px] border-white shadow-xl overflow-hidden bg-black"
            style={{
                width: SIZE,
                height: SIZE,
                // We use fixed positioning based on screen coordinates of the handle handles element
                // NOTE: 'screenX' passed here is actually relative to the container!
                // To display 'fixed' correctly, we would need the container's screen rect.
                // OR we can make this absolute positioned within the container!
                position: 'absolute', 
                left: screenX - SIZE/2, 
                top: screenY - SIZE - 24, // pushed up
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
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
            {/* Crosshair */}
            <div className="absolute inset-0 flex items-center justify-center opacity-70">
                <div className="w-full h-[1px] bg-sky-400/50" />
                <div className="h-full w-[1px] absolute bg-sky-400/50" />
            </div>
        </div>
    )
}
