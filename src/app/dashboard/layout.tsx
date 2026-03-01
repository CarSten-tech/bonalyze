'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'

import { createClient } from '@/lib/supabase'
import { HouseholdProvider, useHousehold } from '@/contexts/household-context'
import { BottomNav } from '@/components/layout/bottom-nav'
import { InstallBanner, UpdatePrompt } from '@/components/pwa'
import { NotificationBell } from '@/components/layout/notification-bell'
import { UiModeToggle } from '@/components/layout/ui-mode-toggle'
import { useUiMode } from '@/components/layout/ui-mode-sync'
import { cn } from '@/lib/utils'

interface DashboardLayoutProps {
  children: React.ReactNode
}

function DashboardContent({ children }: DashboardLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isLoading, setIsLoading] = useState(true)
  const { isLoading: isHouseholdLoading, households } = useHousehold()
  const { isDesignLab } = useUiMode()

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single()

      if (!profile?.display_name) {
        // Redirect to settings to set up profile
        router.replace('/settings')
        return
      }

      setIsLoading(false)
    }

    void loadProfile()
  }, [router])

  // Redirect to settings if no household
  useEffect(() => {
    if (!isHouseholdLoading && !isLoading && households.length === 0) {
      router.replace('/settings/household')
    }
  }, [households, isHouseholdLoading, isLoading, router])



  // Handlers for scan actions
  const handleScanFromCamera = () => {
    router.push('/dashboard/receipts/new?source=camera')
  }

  const handleScanFromGallery = () => {
    router.push('/dashboard/receipts/new?source=gallery')
  }

  const handleFoodPhoto = () => {
    router.push('/dashboard/ernaehrung/food-scan')
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
  const isDetailPage = pathname.includes('/ausgaben/kategorie/') || pathname.includes('/ausgaben/produkt/') || pathname.includes('/ernaehrung/mahlzeit/')
  const isCameraPage = pathname.includes('/dashboard/receipts/new') || pathname.includes('/ernaehrung/food-scan')
  // Hide bottom nav on meal entry page too, as requested by user for better search experience
  const isMealEntryPage = pathname.includes('/ernaehrung/mahlzeit/')

  return (
    <div
      className={cn(
        'min-h-screen flex flex-col',
        isDesignLab ? 'design-lab-shell' : 'bg-background'
      )}
    >
      {/* Mobile-first Header - Only on main pages */}
      {!isDetailPage && !isCameraPage && (
        <header className={cn('sticky top-0 z-40 safe-top', isDesignLab ? 'design-lab-header-wrap' : 'bg-background')}>
          <div className={cn('mx-auto flex h-14 max-w-5xl items-center justify-between px-4', isDesignLab && 'h-16')}>
            {/* Left: Bonalyze Logo */}
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-lg bg-primary',
                  isDesignLab && 'rounded-xl bg-[linear-gradient(135deg,#1ecbe1_0%,#1397d6_50%,#1f6fd8_100%)] shadow-[0_10px_28px_-14px_rgba(15,23,42,0.65)]'
                )}
              >
                <span className="text-primary-foreground font-bold text-lg">B</span>
              </div>
              <span className={cn('text-lg font-semibold', isDesignLab && 'tracking-tight')}>Bonalyze</span>
            </Link>

            {/* Right: UI Mode + Notification */}
            <div className="flex items-center gap-2">
              <UiModeToggle compact />
              <div className={cn(isDesignLab && 'rounded-full border border-white/55 bg-white/65 shadow-sm backdrop-blur')}>
                <NotificationBell />
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Main Content - with padding for bottom nav */}
      <main
        className={cn(
          'flex-1 overflow-y-auto',
          isCameraPage
            ? 'overflow-hidden p-0 pb-0'
            : cn(
                'mx-auto w-full max-w-5xl px-4 pb-24',
                isDesignLab ? (isDetailPage ? 'pt-3' : 'pt-5') : isDetailPage ? 'pt-2' : 'py-6'
              )
        )}
      >
        <div className={cn(isDesignLab && !isCameraPage && 'animate-fade-in')}>
          {children}
        </div>
      </main>

      {/* Bottom Navigation */}
      {!isCameraPage && !isMealEntryPage && (
        <BottomNav
          onScanFromCamera={handleScanFromCamera}
          onScanFromGallery={handleScanFromGallery}
          onFoodPhoto={handleFoodPhoto}
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
