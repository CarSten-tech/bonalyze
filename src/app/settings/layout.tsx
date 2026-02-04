'use client'

import { useEffect, useState } from 'react'
import { Loader2, LogOut, Settings, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'

import { createClient } from '@/lib/supabase'
import { HouseholdProvider, useHousehold } from '@/contexts/household-context'
import { HouseholdSwitcher } from '@/components/household-switcher'
import { BottomNav } from '@/components/layout/bottom-nav'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface SettingsLayoutProps {
  children: React.ReactNode
}

function SettingsContent({ children }: SettingsLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const { currentHousehold, isLoading: isHouseholdLoading, households } = useHousehold()

  const supabase = createClient()

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        window.location.href = '/login'
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single()

      if (!profile?.display_name) {
        window.location.href = '/onboarding/profile'
        return
      }

      setDisplayName(profile.display_name)
      setIsLoading(false)
    }

    loadProfile()
  }, [supabase])

  // Redirect to onboarding if no household
  useEffect(() => {
    if (!isHouseholdLoading && !isLoading && households.length === 0) {
      window.location.href = '/onboarding/household'
    }
  }, [isHouseholdLoading, isLoading, households])

  const handleLogout = async () => {
    setIsLoggingOut(true)

    const { error } = await supabase.auth.signOut()

    if (error) {
      toast.error('Abmeldung fehlgeschlagen', {
        description: error.message,
      })
      setIsLoggingOut(false)
      return
    }

    toast.success('Erfolgreich abgemeldet')
    window.location.href = '/login'
  }

  // Handlers for scan actions
  const handleScanFromCamera = () => {
    router.push('/dashboard/receipts/new?source=camera')
  }

  const handleScanFromGallery = () => {
    router.push('/dashboard/receipts/new?source=gallery')
  }

  if (isLoading || isHouseholdLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const initials = displayName
    ? displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Mobile-first Header */}
      <header className="sticky top-0 z-40 bg-background border-b border-border safe-top">
        <div className="flex h-14 items-center justify-between px-4">
          {/* Left: Household Switcher */}
          <HouseholdSwitcher />

          {/* Right: User Avatar & Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium">{displayName}</p>
                  {currentHousehold && (
                    <p className="text-xs text-muted-foreground truncate">
                      {currentHousehold.name}
                    </p>
                  )}
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings/household" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Haushalt-Einstellungen
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings/budget" className="cursor-pointer">
                  <Wallet className="mr-2 h-4 w-4" />
                  Budget-Einstellungen
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                {isLoggingOut ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="mr-2 h-4 w-4" />
                )}
                Abmelden
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>



      {/* Main Content - with padding for bottom nav */}
      <main className="flex-1 overflow-y-auto px-4 py-6 pb-24">
        {children}
      </main>

      {/* Bottom Navigation */}
      <BottomNav
        onScanFromCamera={handleScanFromCamera}
        onScanFromGallery={handleScanFromGallery}
      />
    </div>
  )
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <HouseholdProvider>
      <SettingsContent>{children}</SettingsContent>
    </HouseholdProvider>
  )
}
