'use client'

import { Sparkles } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MEAL_TYPE_LABELS } from '@/lib/nutrition-utils'
import type { SmartSuggestion } from '@/hooks/use-smart-suggestions'

interface SmartSuggestionCardProps {
  suggestion: SmartSuggestion
  onLog: (mealType: string) => Promise<void>
  onDismiss: () => Promise<void>
}

export function SmartSuggestionCard({ suggestion, onLog, onDismiss }: SmartSuggestionCardProps) {
  const mealLabel = MEAL_TYPE_LABELS[suggestion.suggestedMealType] || 'Snacks'

  return (
    <Card className="rounded-2xl border-0 border-l-4 border-l-primary shadow-elevation-1 bg-card overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-primary/10 shrink-0 mt-0.5">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-semibold text-foreground">Smart Suggestion</p>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">NEU</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Basierend auf deinem letzten Einkauf bei {suggestion.merchantName}: Moechtest du{' '}
              <span className="font-medium text-foreground">{suggestion.productName}</span>{' '}
              zum {mealLabel} loggen?
            </p>
            {suggestion.estimatedCalories > 0 && (
              <p className="text-xs text-muted-foreground mt-1 tabular-nums">
                ~{suggestion.estimatedCalories} kcal &middot; {suggestion.estimatedProtein}g P &middot; {suggestion.estimatedCarbs}g K &middot; {suggestion.estimatedFat}g F
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3 pl-12">
          <Button
            size="sm"
            className="h-8"
            onClick={() => onLog(suggestion.suggestedMealType)}
          >
            Loggen
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-muted-foreground"
            onClick={onDismiss}
          >
            Ausblenden
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
