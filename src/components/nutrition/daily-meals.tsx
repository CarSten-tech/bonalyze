'use client'

import React, { useState } from 'react'

import Link from 'next/link'
import { Coffee, Utensils, Moon, Cookie, Plus, Trash2, ChevronDown } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { NutritionLogEntry } from '@/hooks/use-nutrition-data'

const MEAL_CONFIG = [
  {
    type: 'fruehstueck',
    label: 'Frühstück',
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

interface GroupedMeal {
  id: string
  name: string
  items: NutritionLogEntry[]
  totalKcal: number
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

  // Group items by group_id
  const { singles, groups } = items.reduce(
    (acc, item) => {
      if (item.group_id && item.group_name) {
        if (!acc.groups[item.group_id]) {
          acc.groups[item.group_id] = {
            id: item.group_id,
            name: item.group_name,
            items: [],
            totalKcal: 0,
          }
        }
        acc.groups[item.group_id].items.push(item)
        acc.groups[item.group_id].totalKcal += item.calories_kcal || 0
      } else {
        acc.singles.push(item)
      }
      return acc
    },
    { singles: [] as NutritionLogEntry[], groups: {} as Record<string, GroupedMeal> }
  )

  const sortedGroups = Object.values(groups).sort((a, b) => {
    // Sort by creation time of first item (approx)
    return (
      new Date(b.items[0].created_at).getTime() -
      new Date(a.items[0].created_at).getTime()
    )
  })

  // State for expanded groups
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set())

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId)
    } else {
      newExpanded.add(groupId)
    }
    setExpandedGroups(newExpanded)
  }

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
                  {itemCount} {itemCount === 1 ? 'Eintrag' : 'Einträge'} &middot; {totalKcal.toLocaleString('de-DE')} kcal
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Tippe +, um etwas hinzuzufügen</p>
              )}
            </div>
          </div>
          <Link href={`/dashboard/ernaehrung/mahlzeit/${config.type}`}>
            <Button variant="ghost" size="sm" className={cn('h-9 gap-1.5', config.iconColor)}>
              <Plus className="h-4 w-4" />
              <span className="text-sm sr-only sm:not-sr-only">Hinzufügen</span>
            </Button>
          </Link>
        </div>

        {/* Items List */}
        {(sortedGroups.length > 0 || singles.length > 0) && (
          <div className="mt-3 space-y-1">
            {/* Render Groups First */}
            {sortedGroups.map((group) => {
              const isExpanded = expandedGroups.has(group.id)
              return (
                <div key={group.id} className="rounded-lg bg-white/40 border border-white/50 overflow-hidden">
                  <div
                    className="flex items-center justify-between py-2 px-3 cursor-pointer hover:bg-white/60 transition-colors"
                    onClick={() => toggleGroup(group.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground truncate">
                          {group.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                          {group.items.length} Zutaten
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground tabular-nums">
                        {group.totalKcal.toLocaleString('de-DE')} kcal
                      </span>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 text-muted-foreground transition-transform',
                          isExpanded && 'rotate-180'
                        )}
                      />
                    </div>
                  </div>

                  {/* Expanded Items */}
                  {isExpanded && (
                    <div className="border-t border-white/50 bg-white/20 px-3 pb-2 pt-1 space-y-1">
                      {group.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between py-1 group/item">
                          <span className="text-xs text-muted-foreground truncate flex-1 pl-2 border-l-2 border-primary/20">
                            {item.item_name}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {item.calories_kcal}
                            </span>
                            {onDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-50 hover:opacity-100 hover:text-destructive hover:bg-destructive/10 -mr-2"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onDelete(item.id)
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Render Single Items */}
            {singles.map((item) => (
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
