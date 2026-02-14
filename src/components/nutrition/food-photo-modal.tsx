'use client'

import { useState, useRef, useCallback } from 'react'
import {
  Camera,
  X,
  Loader2,
  Check,
  Trash2,
  RotateCcw,
  Sparkles,
  ImageIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FoodItem {
  id: string
  name: string
  quantity_g: number
  calories_kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
  calories_per_100g: number
  protein_per_100g: number
  carbs_per_100g: number
  fat_per_100g: number
  confidence: number
}

interface FoodScanResult {
  items: FoodItem[]
  meal_description: string
  total_calories: number
  confidence: number
}

type Phase = 'capture' | 'analyzing' | 'review'

interface FoodPhotoModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (items: Array<{
    meal_type: string
    item_name: string
    calories_kcal: number
    protein_g: number
    carbs_g: number
    fat_g: number
  }>) => Promise<void>
  mealType?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function recalcItem(item: FoodItem, newQuantity: number): FoodItem {
  const factor = newQuantity / 100
  return {
    ...item,
    quantity_g: newQuantity,
    calories_kcal: Math.round(item.calories_per_100g * factor),
    protein_g: Math.round(item.protein_per_100g * factor * 10) / 10,
    carbs_g: Math.round(item.carbs_per_100g * factor * 10) / 10,
    fat_g: Math.round(item.fat_per_100g * factor * 10) / 10,
  }
}

function generateId() {
  return Math.random().toString(36).substring(2, 9)
}

// ─── Component ───────────────────────────────────────────────────────────────

export function FoodPhotoModal({
  isOpen,
  onClose,
  onSave,
  mealType = 'snacks',
}: FoodPhotoModalProps) {
  const [phase, setPhase] = useState<Phase>('capture')
  const [items, setItems] = useState<FoodItem[]>([])
  const [mealDescription, setMealDescription] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraActive, setCameraActive] = useState(false)

  // ─── Camera Logic ────────────────────────────────────────────────────────

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraActive(true)
    } catch {
      toast.error('Kamera konnte nicht gestartet werden')
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }, [])

  const captureFromCamera = useCallback(() => {
    if (!videoRef.current) return

    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(videoRef.current, 0, 0)

    stopCamera()

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    setPreviewUrl(dataUrl)
    const base64 = dataUrl.split(',')[1]
    analyzeImage(base64, 'image/jpeg')
  }, [stopCamera])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setPreviewUrl(dataUrl)
      const base64 = dataUrl.split(',')[1]
      analyzeImage(base64, file.type || 'image/jpeg')
    }
    reader.readAsDataURL(file)
  }, [])

  // ─── AI Analysis ────────────────────────────────────────────────────────

  const analyzeImage = async (base64: string, mimeType: string) => {
    setPhase('analyzing')

    try {
      const res = await fetch('/api/food-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mimeType }),
      })

      const json = await res.json()

      if (!json.success) {
        toast.error(json.message || 'Analyse fehlgeschlagen')
        resetToCapture()
        return
      }

      const result = json.data as FoodScanResult
      const enrichedItems: FoodItem[] = result.items.map((item: Omit<FoodItem, 'id'>) => ({
        ...item,
        id: generateId(),
      }))

      setItems(enrichedItems)
      setMealDescription(result.meal_description || '')
      setPhase('review')
    } catch {
      toast.error('Netzwerkfehler. Bitte versuche es erneut.')
      resetToCapture()
    }
  }

  // ─── Review Actions ──────────────────────────────────────────────────────

  const updateQuantity = (id: string, newQuantity: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? recalcItem(item, newQuantity) : item
      )
    )
  }

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const handleSave = async () => {
    if (items.length === 0) return

    setIsSaving(true)
    try {
      const logItems = items.map((item) => ({
        meal_type: mealType,
        item_name: item.name,
        calories_kcal: item.calories_kcal,
        protein_g: item.protein_g,
        carbs_g: item.carbs_g,
        fat_g: item.fat_g,
      }))

      await onSave(logItems)
      toast.success(`${items.length} Lebensmittel gespeichert`)
      handleClose()
    } catch {
      toast.error('Fehler beim Speichern')
    } finally {
      setIsSaving(false)
    }
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────

  const resetToCapture = () => {
    setPhase('capture')
    setItems([])
    setMealDescription('')
    setPreviewUrl(null)
  }

  const handleClose = () => {
    stopCamera()
    resetToCapture()
    onClose()
  }

  if (!isOpen) return null

  // ─── Total Calculations ──────────────────────────────────────────────────

  const totalCalories = items.reduce((s, i) => s + i.calories_kcal, 0)
  const totalProtein = items.reduce((s, i) => s + i.protein_g, 0)
  const totalCarbs = items.reduce((s, i) => s + i.carbs_g, 0)
  const totalFat = items.reduce((s, i) => s + i.fat_g, 0)

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10"
          onClick={handleClose}
        >
          <X className="h-6 w-6" />
        </Button>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-400" />
          <span className="text-white font-semibold text-sm">
            {phase === 'capture' && 'Essen fotografieren'}
            {phase === 'analyzing' && 'AI analysiert...'}
            {phase === 'review' && 'Ergebnis prüfen'}
          </span>
        </div>
        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      {/* ─── Capture Phase ──────────────────────────────────────────────── */}
      {phase === 'capture' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
          {cameraActive ? (
            <div className="relative w-full max-w-md aspect-[3/4] rounded-2xl overflow-hidden bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* Viewfinder overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-6 border-2 border-white/30 rounded-2xl" />
                <div className="absolute bottom-4 left-0 right-0 text-center">
                  <p className="text-white/70 text-xs font-medium">
                    Richte die Kamera auf dein Essen
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-md aspect-[3/4] rounded-2xl bg-white/5 border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-4">
              <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
                <Camera className="h-10 w-10 text-white/60" />
              </div>
              <p className="text-white/60 text-sm text-center max-w-[240px]">
                Fotografiere dein Essen und die KI erkennt automatisch Zutaten und Kalorien
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-4">
            {cameraActive ? (
              <button
                onClick={captureFromCamera}
                aria-label="Foto aufnehmen"
                className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition-transform"
              >
                <div className="w-16 h-16 rounded-full bg-white" />
              </button>
            ) : (
              <>
                <Button
                  onClick={startCamera}
                  size="lg"
                  className="rounded-full bg-primary hover:bg-primary/90 text-white gap-2 h-14 px-6"
                >
                  <Camera className="h-5 w-5" />
                  Kamera
                </Button>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  size="lg"
                  variant="outline"
                  className="rounded-full border-white/30 text-white hover:bg-white/10 gap-2 h-14 px-6"
                >
                  <ImageIcon className="h-5 w-5" />
                  Galerie
                </Button>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      )}

      {/* ─── Analyzing Phase ────────────────────────────────────────────── */}
      {phase === 'analyzing' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
          {previewUrl && (
            <div className="w-48 h-48 rounded-2xl overflow-hidden opacity-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Essen"
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <Sparkles className="h-4 w-4 text-amber-400 absolute -top-1 -right-1" />
            </div>
            <p className="text-white font-semibold">Zutaten werden erkannt...</p>
            <p className="text-white/50 text-sm text-center max-w-[240px]">
              Gemini AI analysiert dein Essen und schätzt Kalorien & Nährwerte
            </p>
          </div>
        </div>
      )}

      {/* ─── Review Phase ───────────────────────────────────────────────── */}
      {phase === 'review' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Preview thumbnail + description */}
          <div className="px-4 py-3 flex items-center gap-3 bg-white/5">
            {previewUrl && (
              <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Essen" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm truncate">
                {mealDescription || 'Erkannte Mahlzeit'}
              </p>
              <p className="text-white/50 text-xs">
                {items.length} {items.length === 1 ? 'Zutat' : 'Zutaten'} erkannt
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-white/60 hover:bg-white/10"
              onClick={resetToCapture}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          {/* Scrollable item list */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {items.map((item) => (
              <Card
                key={item.id}
                className="rounded-xl border-0 bg-white/10 backdrop-blur-sm overflow-hidden"
              >
                <CardContent className="p-4 space-y-3">
                  {/* Item header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate">
                        {item.name}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <div
                          className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            item.confidence >= 0.8
                              ? 'bg-emerald-400'
                              : item.confidence >= 0.6
                                ? 'bg-amber-400'
                                : 'bg-red-400'
                          )}
                        />
                        <span className="text-white/40 text-[10px]">
                          {Math.round(item.confidence * 100)}% Konfidenz
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-400 hover:bg-red-500/20 h-8 w-8"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Editable quantity */}
                  <div className="flex items-center gap-3">
                    <label className="text-white/60 text-xs font-medium min-w-[50px]">
                      Menge
                    </label>
                    <div className="flex items-center gap-1.5 flex-1">
                      <Input
                        type="number"
                        value={item.quantity_g}
                        placeholder="Menge"
                        aria-label={`Menge für ${item.name}`}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0
                          updateQuantity(item.id, val)
                        }}
                        className="h-9 bg-white/10 border-white/20 text-white text-sm w-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-white/50 text-xs">g</span>
                    </div>
                    <span className="text-white font-bold text-sm tabular-nums min-w-[60px] text-right">
                      {item.calories_kcal} kcal
                    </span>
                  </div>

                  {/* Macro summary */}
                  <div className="flex items-center gap-4 text-[10px] text-white/40">
                    <span>P: {item.protein_g}g</span>
                    <span>K: {item.carbs_g}g</span>
                    <span>F: {item.fat_g}g</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Sticky footer with totals & save */}
          <div className="px-4 py-4 bg-black/80 backdrop-blur-sm border-t border-white/10 space-y-3">
            {/* Totals */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <p className="text-white font-bold text-lg tabular-nums">
                  {totalCalories}
                </p>
                <p className="text-white/40 text-[10px] uppercase tracking-wider">
                  kcal
                </p>
              </div>
              <div>
                <p className="text-primary font-bold tabular-nums">
                  {totalProtein.toFixed(1)}g
                </p>
                <p className="text-white/40 text-[10px] uppercase tracking-wider">
                  Protein
                </p>
              </div>
              <div>
                <p className="text-amber-400 font-bold tabular-nums">
                  {totalCarbs.toFixed(1)}g
                </p>
                <p className="text-white/40 text-[10px] uppercase tracking-wider">
                  Carbs
                </p>
              </div>
              <div>
                <p className="text-rose-400 font-bold tabular-nums">
                  {totalFat.toFixed(1)}g
                </p>
                <p className="text-white/40 text-[10px] uppercase tracking-wider">
                  Fett
                </p>
              </div>
            </div>

            {/* Save button */}
            <Button
              onClick={handleSave}
              disabled={isSaving || items.length === 0}
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold gap-2"
            >
              {isSaving ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Check className="h-5 w-5" />
              )}
              {isSaving ? 'Wird gespeichert...' : `${items.length} Zutaten speichern`}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
