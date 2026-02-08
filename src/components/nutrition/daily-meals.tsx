'use client'

import Link from 'next/link'
import { Coffee, Utensils, Moon, Cookie, Plus, Trash2 } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { NutritionLogEntry } from '@/hooks/use-nutrition-data'

const MEAL_CONFIG = [
  {
    type: 'fruehstueck',
    label: 'Fruehstueck',
    icon: Coffee,
    emoji: '\u{1F305}',
    color: 'border-l-amber-500',
    bgGradient: 'bg-gradient-to-r from-amber-50 to-orange-50',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
  },
  {
    type: 'mittagessen',
    label: 'Mittagessen',
    icon: Utensils,
    emoji: '\u{1F37D}\u{FE0F}',
    color: 'border-l-primary',
    bgGradient: 'bg-gradient-to-r from-teal-50 to-emerald-50',
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-600',
  },
  {
    type: 'abendessen',
    label: 'Abendessen',
    icon: Moon,
    emoji: '\u{1F319}',
    color: 'border-l-indigo-500',
    bgGradient: 'bg-gradient-to-r from-indigo-50 to-violet-50',
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
  },
  {
    type: 'snacks',
    label: 'Snacks',
    icon: Cookie,
    emoji: '\u{1F36A}',
    color: 'border-l-rose-400',
    bgGradient: 'bg-gradient-to-r from-rose-50 to-pink-50',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-500',
  },
] as const

interface DailyMealsProps {
  meals: Record<string, NutritionLogEntry[]>
  isLoading?: boolean
  onDeleteLog?: (logId: string) => Promise<void>
}

function MealSection({
  config,
  items,
  onDelete,
}: {
  config: (typeof MEAL_CONFIG)[number]
  items: NutritionLogEntry[]
  onDelete?: DailyMealsProps['onDeleteLog']
}) {
  const Icon = config.icon
  const totalKcal = items.reduce((sum, item) => sum + (item.calories_kcal || 0), 0)
  const itemCount = items.length

  return (
    <Card className={cn('rounded-2xl border-0 border-l-4 shadow-elevation-1 overflow-hidden', config.color, config.bgGradient)}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-xl', config.iconBg)}>
              <Icon className={cn('h-5 w-5', config.iconColor)} />
            </div>
            <div>
              <p className="font-semibold text-foreground">{config.label}</p>
              {itemCount > 0 ? (
                <p className="text-sm text-muted-foreground">
                  {itemCount} {itemCount === 1 ? 'Eintrag' : 'Eintraege'} &middot; {totalKcal.toLocaleString('de-DE')} kcal
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Tippe +, um etwas hinzuzufuegen</p>
              )}
            </div>
          </div>
          <Link href={`/dashboard/ernaehrung/mahlzeit/${config.type}`}>
            <Button variant="ghost" size="sm" className={cn('h-9 gap-1.5', config.iconColor)}>
              <Plus className="h-4 w-4" />
              <span className="text-sm sr-only sm:not-sr-only">Hinzufuegen</span>
            </Button>
          </Link>
        </div>

        {/* Items */}
        {items.length > 0 && (
          <div className="mt-3 space-y-1">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2 px-1 group rounded-lg hover:bg-white/50 transition-colors">
                <span className="text-sm text-foreground truncate flex-1">
                  {item.item_name || 'Unbenannt'}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground tabular-nums font-medium">
                    {(item.calories_kcal || 0).toLocaleString('de-DE')} kcal
                  </span>
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      onClick={() => onDelete(item.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
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

export function DailyMeals({ meals, isLoading = false, onDeleteLog }: DailyMealsProps) {
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
          onDelete={onDeleteLog}
        />
      ))}
    </div>
  )
}
