'use client'

import { useEffect, useState } from 'react'
import { Loader2, Search } from 'lucide-react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'

import { createClient } from '@/lib/supabase'
import { HouseholdProvider, useHousehold } from '@/contexts/household-context'
import { BottomNav } from '@/components/layout/bottom-nav'
import { InstallBanner, UpdatePrompt } from '@/components/pwa'
import { Button } from '@/components/ui/button'
import { NotificationBell } from '@/components/layout/notification-bell'

interface DashboardLayoutProps {
  children: React.ReactNode
}

function DashboardContent({ children }: DashboardLayoutProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
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
        // Redirect to settings to set up profile
        window.location.href = '/settings'
        return
      }

      setIsLoading(false)
    }

    loadProfile()
  }, [supabase])

  // Redirect to settings if no household
  useEffect(() => {
    if (!isHouseholdLoading && !isLoading && households.length === 0) {
      window.location.href = '/settings/household'
    }
  }, [isHouseholdLoading, isLoading, households])



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



  // Determine if we should show the global header
  // Hide on detail pages where we have specific headers (Category Detail, Product Detail)
  const pathname = usePathname() // Need to import this
  const isDetailPage = pathname.includes('/ausgaben/kategorie/') || pathname.includes('/ausgaben/produkt/') || pathname.includes('/ernaehrung/mahlzeit/')
  const isCameraPage = pathname.includes('/dashboard/receipts/new')

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Mobile-first Header - Only on main pages */}
      {!isDetailPage && !isCameraPage && (
        <header className="sticky top-0 z-40 bg-background safe-top">
            <div className="flex h-14 items-center justify-between px-4">
    
            {/* Left: Bonalyze Logo */}
            <Link href="/dashboard" className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <span className="text-primary-foreground font-bold text-lg">B</span>
                </div>
                <span className="text-lg font-semibold">Bonalyze</span>
            </Link>
    
            {/* Right: Notification Bell */}
            <div className="flex items-center gap-2">
                <NotificationBell />
            </div>
            </div>
        </header>
      )}

      {/* Main Content - with padding for bottom nav */}
      <main className={`flex-1 overflow-y-auto ${isCameraPage ? 'p-0 pb-0 overflow-hidden' : `px-4 pb-24 ${isDetailPage ? 'pt-2' : 'py-6'}`}`}>
        {children}
      </main>

      {/* Bottom Navigation */}
      {!isCameraPage && (
        <BottomNav
            onScanFromCamera={handleScanFromCamera}
            onScanFromGallery={handleScanFromGallery}
        />
      )}

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
