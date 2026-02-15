'use client'

import { useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, addDays, subDays, isToday } from 'date-fns'
import { de } from 'date-fns/locale'

import { useNutritionData } from '@/hooks/use-nutrition-data'
import { useNutritionDeficit } from '@/hooks/use-nutrition-deficit'
import { useSmartSuggestions } from '@/hooks/use-smart-suggestions'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  EnergieWidget,
  ActivityCard,
  FluidCard,
  DailyMeals,
  SmartSuggestionCard,
} from '@/components/nutrition'
import { cn } from '@/lib/utils'

// Day navigator
function DayNavigation({
  currentDate,
  onDateChange,
}: {
  currentDate: Date
  onDateChange: (date: Date) => void
}) {
  const isCurrentDay = isToday(currentDate)
  const dayLabel = isCurrentDay
    ? 'Heute'
    : format(currentDate, 'EEEE', { locale: de })
  const dateLabel = format(currentDate, 'd. MMMM', { locale: de })

  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => onDateChange(subDays(currentDate, 1))}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="flex flex-col items-center">
        <span className="text-sm font-semibold text-foreground">{dayLabel}</span>
        <span className="text-xs text-muted-foreground">{dateLabel}</span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => onDateChange(addDays(currentDate, 1))}
        disabled={isCurrentDay}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

// Nutrition Deficit Hero
function NutritionDeficitHero({ selectedDate }: { selectedDate: Date }) {
  const { data, isLoading } = useNutritionDeficit(selectedDate)

  if (isLoading) {
    return (
      <Card className="rounded-xl shadow-sm border-0 bg-gradient-to-br from-white via-white to-slate-50">
        <CardContent className="p-6 space-y-3">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-3 w-56" />
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  return (
    <Card className="rounded-2xl shadow-sm border-0 bg-gradient-to-br from-white via-white to-slate-50 overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row">
          <div className="flex-1 p-6 border-b sm:border-b-0 sm:border-r border-border">
             <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Defizit Heute</p>
             <div className="flex items-baseline gap-1">
                <span className={cn("text-5xl font-black tabular-nums tracking-tighter", data.dailyDeficit >= 0 ? "text-primary" : "text-destructive")}>
                  {data.dailyDeficit > 0 ? '+' : ''}{data.dailyDeficit.toLocaleString('de-DE')}
                </span>
                <span className="text-xl font-bold text-muted-foreground/60">kcal</span>
             </div>
          </div>
          <div className="flex-1 p-6 bg-background">
             <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Defizit Gesamt</p>
             <div className="flex items-baseline gap-1">
                <span className={cn("text-3xl font-bold tabular-nums tracking-tighter", data.totalDeficit >= 0 ? "text-emerald-600" : "text-destructive")}>
                  {data.totalDeficit > 0 ? '+' : ''}{data.totalDeficit.toLocaleString('de-DE')}
                </span>
                <span className="text-sm font-semibold text-muted-foreground/60">kcal</span>
             </div>
             <p className="text-[10px] text-muted-foreground mt-1 italic">
                Über {data.daysTracked} {data.daysTracked === 1 ? 'Tag' : 'Tage'}
             </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ErnaehrungPage() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const { data, isLoading, addLog, removeLog } = useNutritionData(selectedDate)
  const { suggestion, logSuggestion, dismissSuggestion } = useSmartSuggestions()

  const handleDateChange = useCallback((date: Date) => {
    setSelectedDate(date)
  }, [])

  const handleAddFluid = useCallback(async (ml: number) => {
    await addLog({ meal_type: 'fluid', fluid_ml: ml })
  }, [addLog])

  const handleAddActivity = useCallback(async (actData: {
    activity_name: string
    burned_calories_kcal: number
    duration_minutes: number
  }) => {
    await addLog({ meal_type: 'activity', ...actData })
  }, [addLog])

  return (
    <div className="space-y-5 pb-6">
      {/* Day Navigation */}
      <DayNavigation currentDate={selectedDate} onDateChange={handleDateChange} />

      {/* Smart Suggestion */}
      {suggestion && (
        <SmartSuggestionCard
          suggestion={suggestion}
          onLog={logSuggestion}
          onDismiss={dismissSuggestion}
        />
      )}

      {/* Calorie Deficit Hero */}
      <NutritionDeficitHero selectedDate={selectedDate} />

      {/* Energie Widget */}
      <EnergieWidget
        consumed={data?.consumption.calories || 0}
        target={data?.targets.calories || 2000}
        protein={{
          current: data?.consumption.protein || 0,
          target: data?.targets.protein || 75,
        }}
        carbs={{
          current: data?.consumption.carbs || 0,
          target: data?.targets.carbs || 250,
        }}
        fat={{
          current: data?.consumption.fat || 0,
          target: data?.targets.fat || 65,
        }}
        isLoading={isLoading}
      />

      {/* Activity + Fluid Grid */}
      <div className="grid grid-cols-2 gap-4">
        <ActivityCard
          totalBurned={data?.activity.totalBurned || 0}
          isLoading={isLoading}
          onAddActivity={handleAddActivity}
        />
        <FluidCard
          totalMl={data?.fluid.totalMl || 0}
          targetMl={data?.targets.water || 2500}
          isLoading={isLoading}
          onAddFluid={handleAddFluid}
        />
      </div>

      {/* Tagesuebersicht */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">Tagesübersicht</h2>
        </div>
        <DailyMeals
          meals={data?.meals || { fruehstueck: [], mittagessen: [], abendessen: [], snacks: [] }}
          isLoading={isLoading}
          onDeleteLog={removeLog}
        />
      </section>
    </div>
  )
}
