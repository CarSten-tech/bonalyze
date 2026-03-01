'use client'

import { Layers3, Sparkles } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useUiMode } from '@/components/layout/ui-mode-sync'

interface UiModeToggleProps {
  className?: string
  compact?: boolean
}

export function UiModeToggle({ className, compact = false }: UiModeToggleProps) {
  const { mode, setMode } = useUiMode()

  if (compact) {
    const isDesignLab = mode === 'design-lab'

    return (
      <button
        type="button"
        onClick={() => setMode(isDesignLab ? 'original' : 'design-lab')}
        className={cn(
          'inline-flex h-9 items-center gap-2 rounded-full border border-border/80 bg-card/90 px-3 text-xs font-semibold text-foreground shadow-sm backdrop-blur transition-all hover:scale-[1.01] hover:border-primary/40 hover:bg-card',
          className
        )}
        aria-label={isDesignLab ? 'Zum Original-Design wechseln' : 'Zum Design-Lab wechseln'}
      >
        {isDesignLab ? <Layers3 className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
        <span>{isDesignLab ? 'Original' : 'Design Lab'}</span>
      </button>
    )
  }

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border border-border/80 bg-card/90 p-1 shadow-sm backdrop-blur',
        className
      )}
      role="group"
      aria-label="UI Modus"
    >
      <button
        type="button"
        onClick={() => setMode('original')}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
          mode === 'original'
            ? 'bg-secondary text-secondary-foreground'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Layers3 className="h-3.5 w-3.5" />
        Original
      </button>
      <button
        type="button"
        onClick={() => setMode('design-lab')}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
          mode === 'design-lab'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Sparkles className="h-3.5 w-3.5" />
        Design Lab
      </button>
    </div>
  )
}

export default UiModeToggle
