'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getAvailableMonths } from '@/lib/settlement-utils'
import type { MonthOption } from '@/types/settlement'
import { Calendar } from 'lucide-react'

interface MonthSelectorProps {
  value: string // Format: 'YYYY-MM'
  onChange: (month: MonthOption) => void
  monthCount?: number
  className?: string
}

export function MonthSelector({
  value,
  onChange,
  monthCount = 12,
  className,
}: MonthSelectorProps) {
  const months = getAvailableMonths(monthCount)

  const handleValueChange = (newValue: string) => {
    const month = months.find((m) => m.value === newValue)
    if (month) {
      onChange(month)
    }
  }

  return (
    <Select value={value} onValueChange={handleValueChange}>
      <SelectTrigger className={className}>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder="Monat waehlen" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {months.map((month) => (
          <SelectItem key={month.value} value={month.value}>
            {month.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
