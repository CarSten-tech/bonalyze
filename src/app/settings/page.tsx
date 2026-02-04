'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
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
  ChevronRight
} from 'lucide-react'
import { toast } from 'sonner'

import { createClient } from '@/lib/supabase'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

// App version (can be injected from package.json or env)
const APP_VERSION = '2.4.0'

interface MenuItem {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  active?: boolean
}

const menuGroups: MenuItem[][] = [
  [
    { href: '/settings/categories', icon: LayoutGrid, label: 'Kategorien verwalten' },
    { href: '/settings/budget', icon: Target, label: 'Budget-Ziele' },
    { href: '/settings/export', icon: FileDown, label: 'Export (PDF/Excel)' },
    { href: '/settings/payment-methods', icon: CreditCard, label: 'Zahlungsmethoden' },
  ],
  [
    { href: '/settings/help', icon: HelpCircle, label: 'Hilfe & Support' },
    { href: '/settings/household', icon: Settings, label: 'App-Einstellungen' },
  ],
]

export default function SettingsMenuPage() {
  const router = useRouter()
  const supabase = createClient()

  const [displayName, setDisplayName] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
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
  }, [supabase, router])

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const initials = displayName
    ? displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <div className="flex flex-col min-h-[calc(100vh-10rem)]">
      {/* Profile Header */}
      <div className="flex items-center gap-4 py-6">
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
      <nav className="flex-1 space-y-2">
        {menuGroups.map((group, groupIndex) => (
          <div key={groupIndex}>
            {groupIndex > 0 && <Separator className="my-4" />}
            <ul className="space-y-1">
              {group.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center justify-between px-3 py-3 rounded-lg text-foreground hover:bg-accent transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                      <span>{item.label}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
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
  )
}
