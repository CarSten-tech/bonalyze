'use client'

import { useState } from 'react'
import { Coffee, Utensils, Moon, Cookie, Plus, Trash2 } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import type { NutritionLogEntry } from '@/hooks/use-nutrition-data'

const MEAL_CONFIG = [
  { type: 'fruehstueck', label: 'Fruehstueck', icon: Coffee, color: 'border-l-amber-500' },
  { type: 'mittagessen', label: 'Mittagessen', icon: Utensils, color: 'border-l-primary' },
  { type: 'abendessen', label: 'Abendessen', icon: Moon, color: 'border-l-indigo-500' },
  { type: 'snacks', label: 'Snacks', icon: Cookie, color: 'border-l-rose-400' },
] as const

interface DailyMealsProps {
  meals: Record<string, NutritionLogEntry[]>
  isLoading?: boolean
  onAddLog?: (data: {
    meal_type: string
    item_name: string
    calories_kcal: number
    protein_g: number
    carbs_g: number
    fat_g: number
  }) => Promise<void>
  onDeleteLog?: (logId: string) => Promise<void>
}

function AddFoodSheet({
  mealType,
  mealLabel,
  onAdd,
}: {
  mealType: string
  mealLabel: string
  onAdd: (data: {
    meal_type: string
    item_name: string
    calories_kcal: number
    protein_g: number
    carbs_g: number
    fat_g: number
  }) => Promise<void>
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [kcal, setKcal] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!name || !kcal) return
    setIsSubmitting(true)
    try {
      await onAdd({
        meal_type: mealType,
        item_name: name,
        calories_kcal: parseInt(kcal) || 0,
        protein_g: parseFloat(protein) || 0,
        carbs_g: parseFloat(carbs) || 0,
        fat_g: parseFloat(fat) || 0,
      })
      setName('')
      setKcal('')
      setProtein('')
      setCarbs('')
      setFat('')
      setIsOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
          <Plus className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{mealLabel} hinzufuegen</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Lebensmittel</label>
            <Input
              placeholder="z.B. Magerquark, Haferflocken..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Kalorien (kcal)</label>
            <Input
              type="number"
              placeholder="250"
              value={kcal}
              onChange={(e) => setKcal(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Protein (g)</label>
              <Input
                type="number"
                placeholder="0"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Kohlenh. (g)</label>
              <Input
                type="number"
                placeholder="0"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Fett (g)</label>
              <Input
                type="number"
                placeholder="0"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
              />
            </div>
          </div>
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={!name || !kcal || isSubmitting}
          >
            Hinzufuegen
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function MealSection({
  config,
  items,
  onAdd,
  onDelete,
}: {
  config: (typeof MEAL_CONFIG)[number]
  items: NutritionLogEntry[]
  onAdd?: DailyMealsProps['onAddLog']
  onDelete?: DailyMealsProps['onDeleteLog']
}) {
  const Icon = config.icon
  const totalKcal = items.reduce((sum, item) => sum + (item.calories_kcal || 0), 0)
  const itemCount = items.length

  return (
    <Card className={cn('rounded-2xl border-0 border-l-4 shadow-elevation-1 bg-white overflow-hidden', config.color)}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-50">
              <Icon className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{config.label}</p>
              {itemCount > 0 ? (
                <p className="text-sm text-muted-foreground">
                  {itemCount} Artikel &middot; {totalKcal.toLocaleString('de-DE')} kcal
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Noch keine Eintraege</p>
              )}
            </div>
          </div>
          {onAdd && (
            <AddFoodSheet mealType={config.type} mealLabel={config.label} onAdd={onAdd} />
          )}
        </div>

        {/* Items */}
        {items.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-1.5 px-1 group">
                <span className="text-sm text-foreground truncate flex-1">
                  {item.item_name || 'Unbenannt'}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {(item.calories_kcal || 0).toLocaleString('de-DE')} kcal
                  </span>
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => onDelete(item.id)}
                    >
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function DailyMeals({ meals, isLoading = false, onAddLog, onDeleteLog }: DailyMealsProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="rounded-2xl border-0 shadow-elevation-1">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-xl" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {MEAL_CONFIG.map((config) => (
        <MealSection
          key={config.type}
          config={config}
          items={meals[config.type] || []}
          onAdd={onAddLog}
          onDelete={onDeleteLog}
        />
      ))}
    </div>
  )
}
