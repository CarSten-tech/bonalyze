'use client'

import { useState } from 'react'
import { Flame, Plus } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

interface ActivityCardProps {
  totalBurned: number
  targetBurned?: number
  isLoading?: boolean
  onAddActivity?: (data: { activity_name: string; burned_calories_kcal: number; duration_minutes: number }) => Promise<void>
}

export function ActivityCard({
  totalBurned,
  targetBurned = 350,
  isLoading = false,
  onAddActivity,
}: ActivityCardProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activityName, setActivityName] = useState('')
  const [calories, setCalories] = useState('')
  const [duration, setDuration] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isLoading) {
    return (
      <Card className="rounded-xl shadow-sm border-0 bg-white h-full">
        <CardContent className="p-5 space-y-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-1.5 w-full" />
        </CardContent>
      </Card>
    )
  }

  const percentage = targetBurned > 0 ? Math.min(Math.round((totalBurned / targetBurned) * 100), 100) : 0

  const handleSubmit = async () => {
    if (!onAddActivity || !activityName || !calories) return

    setIsSubmitting(true)
    try {
      await onAddActivity({
        activity_name: activityName,
        burned_calories_kcal: parseInt(calories) || 0,
        duration_minutes: parseInt(duration) || 0,
      })
      setActivityName('')
      setCalories('')
      setDuration('')
      setIsOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="rounded-xl shadow-sm border-0 bg-gradient-to-br from-white to-orange-50 h-full">
      <CardContent className="p-5 flex flex-col justify-between h-full min-h-[140px]">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-orange-100">
                <Flame className="h-4 w-4 text-orange-600" />
              </div>
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                Aktivitaet
              </span>
            </div>
            <span className="text-xs font-medium text-orange-500 tabular-nums">
              {percentage}%
            </span>
          </div>

          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
              {totalBurned.toLocaleString('de-DE')}
            </span>
            <span className="text-sm font-medium text-muted-foreground">kcal</span>
          </div>
        </div>

        <div className="pt-3 space-y-2">
          <div className="h-2 w-full bg-orange-100/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>

          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-xs w-full text-orange-600 hover:text-orange-700 hover:bg-orange-50">
                <Plus className="h-3 w-3 mr-1" /> Aktivitaet
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl">
              <SheetHeader>
                <SheetTitle>Aktivitaet hinzufuegen</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Aktivitaet</label>
                  <Input
                    placeholder="z.B. Joggen, Radfahren..."
                    value={activityName}
                    onChange={(e) => setActivityName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Kalorien (kcal)</label>
                    <Input
                      type="number"
                      placeholder="350"
                      value={calories}
                      onChange={(e) => setCalories(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Dauer (Min.)</label>
                    <Input
                      type="number"
                      placeholder="30"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={!activityName || !calories || isSubmitting}
                >
                  Hinzufuegen
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </CardContent>
    </Card>
  )
}
