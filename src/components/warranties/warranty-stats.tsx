'use client'

import { Shield, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface WarrantyStatsProps {
  activeCount: number
  expiringCount: number
}

export function WarrantyStats({ activeCount, expiringCount }: WarrantyStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Card className="shadow-none border-0 bg-card shadow-elevation-1 rounded-2xl">
        <CardContent className="p-5 flex flex-col justify-center h-full min-h-[110px]">
          <span className="text-sm font-medium text-muted-foreground mb-1">
            Aktive Garantien
          </span>
          <span className="text-4xl font-bold text-primary">
            {activeCount}
          </span>
        </CardContent>
      </Card>

      <Card className="shadow-none border-0 bg-card shadow-elevation-1 rounded-2xl">
        <CardContent className="p-5 flex flex-col justify-center h-full min-h-[110px]">
          <span className="text-sm font-medium text-muted-foreground mb-1">
            Ablaufende (30T)
          </span>
          <div className="flex items-center gap-2">
            <span className="text-4xl font-bold text-destructive">
              {expiringCount}
            </span>
            {expiringCount > 0 && (
              <AlertTriangle className="h-6 w-6 text-destructive fill-destructive/10" />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
