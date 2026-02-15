'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  LayoutGrid, 
  Target, 
  FileDown, 
  CreditCard, 
  HelpCircle, 
  Settings, 
  LogOut,
  Loader2,
  ChevronRight,
  Shield,
  Apple,
  Tag
} from 'lucide-react'
import { toast } from 'sonner'

import { createClient } from '@/lib/supabase'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet'

// App version
const APP_VERSION = '2.4.0'

interface MenuItem {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
}

const menuGroups: MenuItem[][] = [
  [
    { href: '/dashboard/angebote', icon: Tag, label: 'Angebote' },
    { href: '/dashboard/ernaehrung', icon: Apple, label: 'Ernährung' },
    { href: '/settings/categories', icon: LayoutGrid, label: 'Kategorien verwalten' },
    { href: '/settings/budget', icon: Target, label: 'Budget-Ziele' },
    { href: '/settings/export', icon: FileDown, label: 'Export (PDF/Excel)' },
    { href: '/settings/payment-methods', icon: CreditCard, label: 'Zahlungsmethoden' },
    { href: '/dashboard/warranties', icon: Shield, label: 'Garantie-Safe' },
  ],
  [
    { href: '/settings/help', icon: HelpCircle, label: 'Hilfe & Support' },
    { href: '/settings', icon: Settings, label: 'App-Einstellungen' },
  ],
]

interface MenuSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MenuSheet({ open, onOpenChange }: MenuSheetProps) {
  const router = useRouter()
  const supabase = createClient()

  const [displayName, setDisplayName] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    if (!open) return

    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', user.id)
        .single()

      if (profile) {
        setDisplayName(profile.display_name || user.email?.split('@')[0] || 'Nutzer')
        setAvatarUrl(profile.avatar_url)
      }

      setIsLoading(false)
    }

    loadProfile()
  }, [supabase, router, open])

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

  const handleMenuItemClick = (href: string) => {
    onOpenChange(false)
    router.push(href)
  }

  const initials = displayName
    ? displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[85vw] max-w-md flex flex-col p-0 pt-12">
        <SheetTitle className="sr-only">Menü</SheetTitle>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-col flex-1 px-4 pb-6 overflow-y-auto">
            {/* Profile Header */}
            <div className="flex items-center gap-4 py-4">
              <Avatar className="h-16 w-16 border-2 border-primary/20">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt={displayName || 'Avatar'} />
                ) : null}
                <AvatarFallback className="bg-gradient-to-br from-orange-100 to-orange-200 text-orange-600 text-xl font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-lg font-semibold">{displayName}</h2>
                <p className="text-sm text-muted-foreground">Enterprise Account</p>
              </div>
            </div>

            {/* Menu Groups */}
            <nav className="flex-1 space-y-2 mt-2">
              {menuGroups.map((group, groupIndex) => (
                <div key={groupIndex}>
                  {groupIndex > 0 && <Separator className="my-4" />}
                  <ul className="space-y-1">
                    {group.map((item) => (
                      <li key={item.href}>
                        <button
                          onClick={() => handleMenuItemClick(item.href)}
                          className="w-full flex items-center justify-between px-3 py-3 rounded-lg text-foreground hover:bg-accent transition-colors group text-left"
                        >
                          <div className="flex items-center gap-3">
                            <item.icon className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                            <span>{item.label}</span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>

            {/* Footer: Version + Logout */}
            <div className="mt-auto pt-6">
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                <span>BONALYZE V{APP_VERSION}</span>
                <span className="inline-block h-2 w-2 rounded-full bg-green-500" aria-label="Online"></span>
              </div>

              <Button
                variant="ghost"
                className="w-full justify-center gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 h-12 rounded-xl"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <LogOut className="h-5 w-5" />
                )}
                Abmelden
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
