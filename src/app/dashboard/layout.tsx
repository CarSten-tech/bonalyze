'use client'

import { useEffect, useState } from 'react'
import { Loader2, LogOut, Settings, Search, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { createClient } from '@/lib/supabase'
import { HouseholdProvider, useHousehold } from '@/contexts/household-context'
import { BottomNav } from '@/components/layout/bottom-nav'
import { InstallBanner, UpdatePrompt } from '@/components/pwa'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface DashboardLayoutProps {
  children: React.ReactNode
}

function DashboardContent({ children }: DashboardLayoutProps) {
  const router = useRouter()
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
    // TODO: Implement camera capture
    router.push('/dashboard/receipts/new?source=camera')
  }

  const handleScanFromGallery = () => {
    // TODO: Implement gallery picker
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
      <header className="sticky top-0 z-40 bg-background safe-top">
        <div className="flex h-14 items-center justify-between px-4">
          {/* Left: Bonalyze Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <span className="text-primary-foreground font-bold text-lg">B</span>
            </div>
            <span className="text-lg font-semibold">Bonalyze</span>
          </Link>

          {/* Right: Search + User Avatar */}
          <div className="flex items-center gap-2">
            {/* Search Button */}
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
              <Search className="h-5 w-5 text-muted-foreground" />
            </Button>

            {/* User Avatar & Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                  <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                    <AvatarImage src="/avatars/user-avatar.jpg" alt={displayName || ''} />
                    <AvatarFallback className="bg-gradient-to-br from-teal-400 to-cyan-500 text-white text-sm font-medium">
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

      {/* PWA Prompts */}
      <InstallBanner />
      <UpdatePrompt />
    </div>
  )
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <HouseholdProvider>
      <DashboardContent>{children}</DashboardContent>
    </HouseholdProvider>
  )
}
