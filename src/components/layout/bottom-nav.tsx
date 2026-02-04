"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Home, Receipt, ShoppingCart, Menu, Camera, Image } from "lucide-react"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { useState } from "react"

/**
 * Bottom Navigation Component
 *
 * 5-tab structure matching the design mockup:
 * 1. HOME (/dashboard) - Dashboard with KPIs
 * 2. AUSGABEN (/receipts) - Receipt list
 * 3. Camera (center FAB) - Opens action sheet for camera/gallery
 * 4. LISTE (/list) - Shopping list
 * 5. MENU (/settings) - Settings and more
 */

interface NavItem {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
}

const navItems: NavItem[] = [
  { href: "/dashboard", icon: Home, label: "HOME" },
  { href: "/dashboard/receipts", icon: Receipt, label: "AUSGABEN" },
  // Camera button is handled separately (center position)
  { href: "/dashboard/list", icon: ShoppingCart, label: "LISTE" },
  { href: "/settings", icon: Menu, label: "MENÜ" },
]

interface BottomNavProps {
  onScanFromCamera?: () => void
  onScanFromGallery?: () => void
}

export function BottomNav({ onScanFromCamera, onScanFromGallery }: BottomNavProps) {
  const pathname = usePathname()
  const [sheetOpen, setSheetOpen] = useState(false)

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/" || pathname === "/dashboard"
    }
    if (href === "/dashboard/receipts") {
      return pathname.startsWith("/dashboard/receipts")
    }
    if (href === "/dashboard/list") {
      return pathname.startsWith("/dashboard/list")
    }
    return pathname.startsWith(href)
  }

  const handleCameraClick = () => {
    setSheetOpen(false)
    onScanFromCamera?.()
  }

  const handleGalleryClick = () => {
    setSheetOpen(false)
    onScanFromGallery?.()
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200"
      style={{ paddingBottom: "var(--safe-bottom)" }}
    >
      <div className="flex items-center justify-around h-12 max-w-lg mx-auto px-2">
        {/* First two nav items */}
        {navItems.slice(0, 2).map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            isActive={isActive(item.href)}
          />
        ))}

        {/* Center Camera FAB Button */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex flex-col items-center justify-center",
                "min-w-touch min-h-touch",
                "-mt-6" // Elevate above the nav bar
              )}
              aria-label="Kassenbon scannen"
            >
              <span
                className={cn(
                  "flex items-center justify-center",
                  "w-14 h-14 rounded-full",
                  "bg-slate-800 text-white",
                  "shadow-lg shadow-slate-900/25",
                  "transition-transform active:scale-95"
                )}
              >
                <Camera className="w-6 h-6" strokeWidth={2} />
              </span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl">
            <SheetTitle className="text-lg font-semibold mb-4">
              Kassenbon erfassen
            </SheetTitle>
            <div className="flex flex-col gap-3 pb-4">
              <Button
                variant="outline"
                size="lg"
                className="w-full justify-start gap-3 h-14 rounded-xl"
                onClick={handleCameraClick}
              >
                <Camera className="w-5 h-5" />
                <span>Foto aufnehmen</span>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full justify-start gap-3 h-14 rounded-xl"
                onClick={handleGalleryClick}
              >
                <Image className="w-5 h-5" />
                <span>Aus Galerie waehlen</span>
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Last two nav items */}
        {navItems.slice(2).map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            isActive={isActive(item.href)}
          />
        ))}
      </div>
    </nav>
  )
}

interface NavLinkProps {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  isActive: boolean
}

function NavLink({ href, icon: Icon, label, isActive }: NavLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center justify-center gap-1",
        "min-w-[60px] min-h-touch",
        "transition-colors"
      )}
    >
      <Icon
        className={cn(
          "w-6 h-6 transition-colors",
          isActive ? "text-primary fill-primary/10" : "text-slate-400"
        )}
      />
      <span
        className={cn(
          "text-[10px] font-medium tracking-wide transition-colors",
          isActive ? "text-primary" : "text-slate-400"
        )}
      >
        {label}
      </span>
    </Link>
  )
}

export default BottomNav
