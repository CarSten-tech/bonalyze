'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { Calendar as CalendarIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { PeriodPreset, DateRange } from '@/lib/date-utils'

interface PeriodSelectorProps {
  /** Currently selected preset */
  value: PeriodPreset
  /** Custom date range (when preset is 'custom') */
  customRange?: DateRange
  /** Callback when period changes */
  onChange: (preset: PeriodPreset, customRange?: DateRange) => void
  /** Additional className */
  className?: string
}

/**
 * Period Selector Component
 *
 * Provides preset period tabs (Week, Month, Quarter, Year)
 * and a custom range picker dialog.
 */
export function PeriodSelector({
  value,
  customRange,
  onChange,
  className,
}: PeriodSelectorProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [tempStartDate, setTempStartDate] = useState<Date | undefined>(
    customRange ? new Date(customRange.startDate) : undefined
  )
  const [tempEndDate, setTempEndDate] = useState<Date | undefined>(
    customRange ? new Date(customRange.endDate) : undefined
  )

  // Main presets for tabs
  const mainPresets: { value: PeriodPreset; label: string }[] = [
    { value: 'this_week', label: 'Woche' },
    { value: 'this_month', label: 'Monat' },
    { value: 'this_quarter', label: 'Quartal' },
    { value: 'this_year', label: 'Jahr' },
  ]

  // Rolling periods for dialog
  const rollingPresets: { value: PeriodPreset; label: string }[] = [
    { value: 'last_30_days', label: 'Letzte 30 Tage' },
    { value: 'last_60_days', label: 'Letzte 60 Tage' },
    { value: 'last_90_days', label: 'Letzte 90 Tage' },
  ]

  const handleTabChange = (newValue: string) => {
    if (newValue === 'custom') {
      setIsDialogOpen(true)
    } else {
      onChange(newValue as PeriodPreset)
    }
  }

  const handleRollingPreset = (preset: PeriodPreset) => {
    onChange(preset)
    setIsDialogOpen(false)
  }

  const handleApplyCustomRange = () => {
    if (tempStartDate && tempEndDate) {
      const range: DateRange = {
        startDate: format(tempStartDate, 'yyyy-MM-dd'),
        endDate: format(tempEndDate, 'yyyy-MM-dd'),
      }
      onChange('custom', range)
      setIsDialogOpen(false)
    }
  }

  const isCustomActive =
    value === 'custom' ||
    value === 'last_30_days' ||
    value === 'last_60_days' ||
    value === 'last_90_days'

  const getCustomLabel = (): string => {
    if (value === 'last_30_days') return '30 Tage'
    if (value === 'last_60_days') return '60 Tage'
    if (value === 'last_90_days') return '90 Tage'
    if (value === 'custom' && customRange) {
      return `${format(new Date(customRange.startDate), 'dd.MM.')} - ${format(new Date(customRange.endDate), 'dd.MM.')}`
    }
    return 'Custom'
  }

  // Determine which tab should be active
  const activeTab = mainPresets.find((p) => p.value === value)
    ? value
    : 'custom'

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid grid-cols-5 w-full max-w-md">
          {mainPresets.map((preset) => (
            <TabsTrigger
              key={preset.value}
              value={preset.value}
              className="text-xs sm:text-sm"
            >
              {preset.label}
            </TabsTrigger>
          ))}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <TabsTrigger
                value="custom"
                className={cn(
                  'text-xs sm:text-sm',
                  isCustomActive && 'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground'
                )}
              >
                {isCustomActive ? getCustomLabel() : 'Custom'}
              </TabsTrigger>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Zeitraum wählen</DialogTitle>
                <DialogDescription>
                  Wähle einen vordefinierten Zeitraum oder definiere einen eigenen.
                </DialogDescription>
              </DialogHeader>

              {/* Rolling Periods */}
              <div className="space-y-2">
                {rollingPresets.map((preset) => (
                  <Button
                    key={preset.value}
                    variant={value === preset.value ? 'secondary' : 'outline'}
                    className="w-full justify-start"
                    onClick={() => handleRollingPreset(preset.value)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>

              <Separator />

              {/* Custom Range Picker */}
              <div className="space-y-4">
                <p className="text-sm font-medium">Eigener Zeitraum</p>

                {/* Start Date */}
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Von</label>
                  <div className="border rounded-md p-2">
                    <Calendar
                      mode="single"
                      selected={tempStartDate}
                      onSelect={setTempStartDate}
                      locale={de}
                      disabled={(date) =>
                        date > new Date() || (tempEndDate ? date > tempEndDate : false)
                      }
                      initialFocus
                    />
                  </div>
                </div>

                {/* End Date */}
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Bis</label>
                  <div className="border rounded-md p-2">
                    <Calendar
                      mode="single"
                      selected={tempEndDate}
                      onSelect={setTempEndDate}
                      locale={de}
                      disabled={(date) =>
                        date > new Date() || (tempStartDate ? date < tempStartDate : false)
                      }
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={handleApplyCustomRange}
                  disabled={!tempStartDate || !tempEndDate}
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Anwenden
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsList>
      </Tabs>
    </div>
  )
}

/**
 * Compact Period Selector
 * Shows current selection as a dropdown trigger
 */
interface CompactPeriodSelectorProps {
  value: PeriodPreset
  customRange?: DateRange
  onChange: (preset: PeriodPreset, customRange?: DateRange) => void
  className?: string
}

export function CompactPeriodSelector({
  value,
  customRange,
  onChange,
  className,
}: CompactPeriodSelectorProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const getLabel = (): string => {
    const labels: Record<PeriodPreset, string> = {
      this_week: 'Diese Woche',
      this_month: 'Dieser Monat',
      this_quarter: 'Dieses Quartal',
      this_year: 'Dieses Jahr',
      last_30_days: 'Letzte 30 Tage',
      last_60_days: 'Letzte 60 Tage',
      last_90_days: 'Letzte 90 Tage',
      custom: customRange
        ? `${format(new Date(customRange.startDate), 'dd.MM.')} - ${format(new Date(customRange.endDate), 'dd.MM.')}`
        : 'Custom',
    }
    return labels[value]
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={cn('gap-2', className)}>
          <CalendarIcon className="h-4 w-4" />
          {getLabel()}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Zeitraum wählen</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <PeriodSelector
            value={value}
            customRange={customRange}
            onChange={(preset, range) => {
              onChange(preset, range)
              setIsDialogOpen(false)
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
