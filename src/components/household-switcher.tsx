'use client'

import { Home, ChevronDown, Plus, Check, Settings } from 'lucide-react'
import Link from 'next/link'

import { useHousehold } from '@/contexts/household-context'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'

export function HouseholdSwitcher() {
  const { currentHousehold, households, isLoading, switchHousehold } = useHousehold()

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-4 w-24" />
      </div>
    )
  }

  if (!currentHousehold) {
    return (
      <Button variant="outline" size="sm" asChild>
        <Link href="/onboarding/household">
          <Plus className="mr-2 h-4 w-4" />
          Haushalt erstellen
        </Link>
      </Button>
    )
  }

  // Only show dropdown if user has multiple households
  if (households.length === 1) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Home className="h-4 w-4 text-primary" />
        </div>
        <span className="text-sm font-medium">{currentHousehold.name}</span>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Home className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-medium max-w-[150px] truncate">
            {currentHousehold.name}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Haushalt wechseln</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {households.map((household) => (
          <DropdownMenuItem
            key={household.id}
            onClick={() => switchHousehold(household.id)}
            className="flex items-center justify-between cursor-pointer"
          >
            <span className="truncate">{household.name}</span>
            {household.id === currentHousehold.id && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings/household" className="flex items-center cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            Haushalt-Einstellungen
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/onboarding/household" className="flex items-center cursor-pointer">
            <Plus className="mr-2 h-4 w-4" />
            Neuen Haushalt erstellen
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
