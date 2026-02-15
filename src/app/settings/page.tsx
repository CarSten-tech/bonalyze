'use client'

import Link from 'next/link'
import { useTheme } from 'next-themes'
import { Home, Wallet, Utensils, ChevronRight, Sun, Moon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface SettingsLink {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  description: string
}

const settingsLinks: SettingsLink[] = [
  { 
    href: '/settings/profile', 
    icon: Home, 
    label: 'Profil-Einstellungen',
    description: 'Benachrichtigungen & Persönliches'
  },
  { 
    href: '/settings/household', 
    icon: Home, 
    label: 'Haushalt-Einstellungen',
    description: 'Mitglieder verwalten, Name ändern'
  },
  {
    href: '/settings/budget',
    icon: Wallet,
    label: 'Budget-Einstellungen',
    description: 'Monatliches Budget festlegen'
  },
  {
    href: '/settings/nutrition',
    icon: Utensils,
    label: 'Ernaehrungs-Profile',
    description: 'BMR & Tagesbedarf fuer Haushaltsmitglieder'
  },
]

export default function AppSettingsPage() {
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">App-Einstellungen</h1>
        <p className="text-muted-foreground">
          Konfiguriere deine App-Einstellungen
        </p>
      </div>

      <div className="space-y-3">
        {settingsLinks.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}

        {/* Theme Toggle */}
        <Card
          className="hover:bg-accent/50 transition-colors cursor-pointer"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
        >
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                {isDark ? (
                  <Moon className="h-5 w-5 text-primary" />
                ) : (
                  <Sun className="h-5 w-5 text-primary" />
                )}
              </div>
              <div>
                <p className="font-medium">Erscheinungsbild</p>
                <p className="text-sm text-muted-foreground">
                  {isDark ? 'Dunkler Modus aktiv' : 'Heller Modus aktiv'}
                </p>
              </div>
            </div>
            <div className="relative w-12 h-7 rounded-full bg-muted transition-colors">
              <div
                className={`absolute top-0.5 w-6 h-6 rounded-full shadow-sm transition-all duration-200 flex items-center justify-center ${
                  isDark
                    ? 'left-[calc(100%-1.625rem)] bg-primary'
                    : 'left-0.5 bg-card border border-border'
                }`}
              >
                {isDark ? (
                  <Moon className="h-3.5 w-3.5 text-primary-foreground" />
                ) : (
                  <Sun className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
