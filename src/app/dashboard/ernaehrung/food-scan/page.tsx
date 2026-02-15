'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Camera,
  ArrowLeft,
  Loader2,
  Check,
  Trash2,
  RotateCcw,
  Sparkles,
  ImageIcon,
  SwitchCamera,
  ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useHousehold } from '@/contexts/household-context'
import { addNutritionLog } from '@/app/actions/nutrition'

// ─── Types ───────────────────────────────────────────────────────────────────

interface FoodItem {
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

const MEAL_TYPES = [
  { value: 'fruehstueck', label: 'Frühstück', emoji: '🌅' },
  { value: 'mittagessen', label: 'Mittagessen', emoji: '☀️' },
  { value: 'abendessen', label: 'Abendessen', emoji: '🌙' },
  { value: 'snacks', label: 'Snacks', emoji: '🍿' },
] as const

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

// Select the most likely meal type based on current hour
function getDefaultMealType(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 11) return 'fruehstueck'
  if (hour >= 11 && hour < 15) return 'mittagessen'
  if (hour >= 17 && hour < 22) return 'abendessen'
  return 'snacks'
}

// ─── Page Component ──────────────────────────────────────────────────────────

export default function FoodScanPage() {
  const router = useRouter()
  const { currentHousehold } = useHousehold()

  const [phase, setPhase] = useState<Phase>('capture')
  const [items, setItems] = useState<FoodItem[]>([])
  const [mealDescription, setMealDescription] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [selectedMealType, setSelectedMealType] = useState(getDefaultMealType)
  const [showMealPicker, setShowMealPicker] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // ─── Stream cleanup ──────────────────────────────────────────────────────

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraReady(false)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => stopStream()
  }, [stopStream])

  // ─── Camera Logic ────────────────────────────────────────────────────────

  const startCamera = useCallback(() => {
    setCameraError(null)
    setCameraActive(true)
  }, [])

  // Attach stream once video element is mounted
  useEffect(() => {
    if (!cameraActive) return

    let cancelled = false

    async function initStream() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setCameraError('Kamera wird nicht unterstützt. Nutze die Galerie.')
          return
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        })

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream

          await new Promise<void>((resolve, reject) => {
            const video = videoRef.current!
            video.onloadedmetadata = () => resolve()
            video.onerror = () => reject(new Error('Video error'))
            setTimeout(() => resolve(), 3000)
          })

          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop())
            return
          }

          await videoRef.current.play()
          setCameraReady(true)
        }
      } catch (err) {
        if (cancelled) return
        console.error('[food-scan] Camera error:', err)

        const msg = err instanceof Error ? err.message : ''
        if (msg.includes('NotAllowed') || msg.includes('Permission')) {
          setCameraError('Kamera-Zugriff verweigert. Bitte erlaube den Zugriff in den Einstellungen.')
        } else if (msg.includes('NotFound') || msg.includes('DevicesNotFound')) {
          setCameraError('Keine Kamera gefunden.')
        } else {
          setCameraError('Kamera konnte nicht gestartet werden. Nutze die Galerie.')
        }
        stopStream()
      }
    }

    initStream()
    return () => { cancelled = true }
  }, [cameraActive, stopStream])

  const stopCamera = useCallback(() => {
    stopStream()
    setCameraActive(false)
    setCameraError(null)
  }, [stopStream])

  // ─── Capture ─────────────────────────────────────────────────────────────

  const captureFromCamera = useCallback(() => {
    const video = videoRef.current
    if (!video || video.videoWidth === 0) {
      toast.error('Kamera ist noch nicht bereit.')
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)

    stopCamera()

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    setPreviewUrl(dataUrl)
    const base64 = dataUrl.split(',')[1]
    analyzeImage(base64, 'image/jpeg')
  }, [stopCamera])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (!file.type.startsWith('image/')) {
      toast.error('Bitte wähle ein Bild aus.')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Bild ist zu groß (max 10MB).')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setPreviewUrl(dataUrl)
      const base64 = dataUrl.split(',')[1]
      analyzeImage(base64, file.type || 'image/jpeg')
    }
    reader.onerror = () => toast.error('Fehler beim Lesen des Bildes.')
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
      prev.map((item) => (item.id === id ? recalcItem(item, newQuantity) : item))
    )
  }

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const handleSave = async () => {
    if (items.length === 0 || !currentHousehold) return

    setIsSaving(true)
    try {
      // Generate a group ID if multiple items
      const groupId = items.length > 1 ? crypto.randomUUID() : undefined
      const groupName = items.length > 1 ? (mealDescription || 'Mahlzeit') : undefined

      for (const item of items) {
        await addNutritionLog({
          household_id: currentHousehold.id,
          meal_type: selectedMealType,
          item_name: item.name,
          calories_kcal: item.calories_kcal,
          protein_g: item.protein_g,
          carbs_g: item.carbs_g,
          fat_g: item.fat_g,
          group_id: groupId,
          group_name: groupName,
        })
      }

      toast.success(`${items.length} Lebensmittel als ${MEAL_TYPES.find(m => m.value === selectedMealType)?.label} gespeichert`)
      router.push('/dashboard/ernaehrung')
    } catch {
      toast.error('Fehler beim Speichern')
    } finally {
      setIsSaving(false)
    }
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────

  const resetToCapture = () => {
    stopCamera()
    setPhase('capture')
    setItems([])
    setMealDescription('')
    setPreviewUrl(null)
  }

  const handleBack = () => {
    stopCamera()
    router.back()
  }

  // ─── Total Calculations ──────────────────────────────────────────────────

  const totalCalories = items.reduce((s, i) => s + i.calories_kcal, 0)
  const totalProtein = items.reduce((s, i) => s + i.protein_g, 0)
  const totalCarbs = items.reduce((s, i) => s + i.carbs_g, 0)
  const totalFat = items.reduce((s, i) => s + i.fat_g, 0)

  const currentMeal = MEAL_TYPES.find((m) => m.value === selectedMealType)!

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10"
          onClick={handleBack}
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-400" />
          <span className="text-white font-semibold text-sm">
            {phase === 'capture' && 'Essen fotografieren'}
            {phase === 'analyzing' && 'AI analysiert...'}
            {phase === 'review' && 'Ergebnis prüfen'}
          </span>
        </div>
        <div className="w-10" />
      </div>

      {/* ─── Capture Phase ──────────────────────────────────────────────── */}
      {phase === 'capture' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
          {cameraActive ? (
            <div className="relative w-full max-w-lg flex-1 max-h-[70vh] rounded-2xl overflow-hidden bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
              />

              {!cameraReady && !cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-3">
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                  <p className="text-white/70 text-sm">Kamera wird gestartet...</p>
                </div>
              )}

              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 gap-4 px-8">
                  <Camera className="h-12 w-12 text-red-400" />
                  <p className="text-white/80 text-sm text-center">{cameraError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/30 text-white hover:bg-white/10"
                    onClick={stopCamera}
                  >
                    Zurück
                  </Button>
                </div>
              )}

              {cameraReady && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-6 border-2 border-white/30 rounded-2xl" />
                  <div className="absolute bottom-4 left-0 right-0 text-center">
                    <p className="text-white/70 text-xs font-medium">
                      Richte die Kamera auf dein Essen
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full max-w-lg flex-1 max-h-[70vh] rounded-2xl bg-white/5 border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-4">
              <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
                <Camera className="h-10 w-10 text-white/60" />
              </div>
              <p className="text-white/60 text-sm text-center max-w-[240px]">
                Fotografiere dein Essen und die KI erkennt automatisch Zutaten und Kalorien
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-4 pb-8">
            {cameraActive && cameraReady ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10 h-12 w-12"
                  onClick={stopCamera}
                  aria-label="Kamera schließen"
                >
                  <SwitchCamera className="h-5 w-5" />
                </Button>
                <button
                  onClick={captureFromCamera}
                  aria-label="Foto aufnehmen"
                  className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition-transform"
                >
                  <div className="w-16 h-16 rounded-full bg-white" />
                </button>
                <div className="w-12" />
              </>
            ) : cameraActive && !cameraReady ? null : (
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
              <img src={previewUrl} alt="Essen" className="w-full h-full object-cover" />
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
              aria-label="Neues Foto aufnehmen"
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
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{item.name}</p>
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
                      aria-label={`${item.name} entfernen`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-3">
                    <label
                      htmlFor={`qty-${item.id}`}
                      className="text-white/60 text-xs font-medium min-w-[50px]"
                    >
                      Menge
                    </label>
                    <div className="flex items-center gap-1.5 flex-1">
                      <Input
                        id={`qty-${item.id}`}
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

                  <div className="flex items-center gap-4 text-[10px] text-white/40">
                    <span>P: {item.protein_g}g</span>
                    <span>K: {item.carbs_g}g</span>
                    <span>F: {item.fat_g}g</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ── Sticky footer: meal picker + totals + save ─────────────── */}
          <div className="px-4 py-4 bg-black/90 backdrop-blur-sm border-t border-white/10 space-y-3">
            {/* Meal type picker */}
            <div className="relative">
              <button
                onClick={() => setShowMealPicker(!showMealPicker)}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm"
              >
                <span className="flex items-center gap-2">
                  <span>{currentMeal.emoji}</span>
                  <span className="font-medium">Speichern als: {currentMeal.label}</span>
                </span>
                <ChevronDown className={cn('h-4 w-4 text-white/50 transition-transform', showMealPicker && 'rotate-180')} />
              </button>

              {showMealPicker && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-slate-900 border border-white/20 rounded-xl overflow-hidden shadow-xl z-10">
                  {MEAL_TYPES.map((meal) => (
                    <button
                      key={meal.value}
                      onClick={() => {
                        setSelectedMealType(meal.value)
                        setShowMealPicker(false)
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors',
                        selectedMealType === meal.value
                          ? 'bg-primary/20 text-white'
                          : 'text-white/70 hover:bg-white/10'
                      )}
                    >
                      <span>{meal.emoji}</span>
                      <span className="font-medium">{meal.label}</span>
                      {selectedMealType === meal.value && (
                        <Check className="h-4 w-4 text-primary ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <p className="text-white font-bold text-lg tabular-nums">{totalCalories}</p>
                <p className="text-white/40 text-[10px] uppercase tracking-wider">kcal</p>
              </div>
              <div>
                <p className="text-primary font-bold tabular-nums">{totalProtein.toFixed(1)}g</p>
                <p className="text-white/40 text-[10px] uppercase tracking-wider">Protein</p>
              </div>
              <div>
                <p className="text-amber-400 font-bold tabular-nums">{totalCarbs.toFixed(1)}g</p>
                <p className="text-white/40 text-[10px] uppercase tracking-wider">Carbs</p>
              </div>
              <div>
                <p className="text-rose-400 font-bold tabular-nums">{totalFat.toFixed(1)}g</p>
                <p className="text-white/40 text-[10px] uppercase tracking-wider">Fett</p>
              </div>
            </div>

            {/* Save button */}
            <Button
              onClick={handleSave}
              disabled={isSaving || items.length === 0 || !currentHousehold}
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold gap-2"
            >
              {isSaving ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Check className="h-5 w-5" />
              )}
              {isSaving
                ? 'Wird gespeichert...'
                : `${items.length} ${items.length === 1 ? 'Zutat' : 'Zutaten'} speichern`}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
