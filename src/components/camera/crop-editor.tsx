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
      <div 
        ref={containerRef} 
        className="flex-1 relative overflow-hidden bg-gray-900 m-4 rounded-lg border border-gray-700"
      >
        {/* Background Image (Static, but scaled by CSS "contain") */}
        {/* Actually, best is to render it absolutely centered */}
        {image && (
          <img
            src={imageSrc}
            alt="Source"
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 max-w-full max-h-full object-contain pointer-events-none opacity-50"
          />
        )}
        
        {/* SVG Overlay for Connections */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none drop-shadow-md">
          <line 
            x1={toScreen(corners[0]).x} y1={toScreen(corners[0]).y} 
            x2={toScreen(corners[1]).x} y2={toScreen(corners[1]).y} 
            stroke="#FFFFFF" strokeWidth="2"
          />
          <line 
            x1={toScreen(corners[1]).x} y1={toScreen(corners[1]).y} 
            x2={toScreen(corners[2]).x} y2={toScreen(corners[2]).y} 
            stroke="#FFFFFF" strokeWidth="2"
          />
          <line 
            x1={toScreen(corners[2]).x} y1={toScreen(corners[2]).y} 
            x2={toScreen(corners[3]).x} y2={toScreen(corners[3]).y} 
            stroke="#FFFFFF" strokeWidth="2"
          />
          <line 
            x1={toScreen(corners[3]).x} y1={toScreen(corners[3]).y} 
            x2={toScreen(corners[0]).x} y2={toScreen(corners[0]).y} 
            stroke="#FFFFFF" strokeWidth="2"
          />
        </svg>

        {/* Draggable Handles */}
        {corners.map((pt, i) => {
          const screenPt = toScreen(pt)
          return (
            <motion.div
              key={i}
              drag
              dragMomentum={false}
              dragElastic={0}
              onDrag={(_, info) => {
                // Info.point is screen absolute. Convert to container relative.
                const rect = containerRef.current?.getBoundingClientRect()
                if (rect) {
                  const x = info.point.x - rect.left
                  const y = info.point.y - rect.top
                  updateCorner(i, { x, y })
                }
              }}
              // Position absolute based on current state
              style={{
                position: 'absolute',
                left: 0, 
                top: 0,
                x: screenPt.x - 16, // center - offset half size
                y: screenPt.y - 16,
                touchAction: 'none'
              }}
              className="w-8 h-8 rounded-full border-2 border-primary bg-white shadow-xl z-10 cursor-move flex items-center justify-center"
            >
              <div className="w-2 h-2 rounded-full bg-primary" />
            </motion.div>
          )
        })}
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
