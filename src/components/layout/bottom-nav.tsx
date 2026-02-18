"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Home, Receipt, ShoppingCart, Menu, Camera, ImageIcon, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { MenuSheet } from "./menu-sheet"

/**
 * Bottom Navigation Component
 *
 * 5-tab structure matching the design mockup:
 * 1. HOME (/dashboard) - Dashboard with KPIs
 * 2. AUSGABEN (/receipts) - Receipt list
 * 3. Camera (center FAB) - Opens action sheet for camera/gallery
 * 4. LISTE (/list) - Shopping list
 * 5. MENU - Opens slide-in sheet from right
 */

interface NavItem {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
}

const navItems: NavItem[] = [
  { href: "/dashboard", icon: Home, label: "HOME" },
  { href: "/dashboard/ausgaben", icon: Receipt, label: "AUSGABEN" },
  // Camera button is handled separately (center position)
  { href: "/dashboard/list", icon: ShoppingCart, label: "LISTE" },
  // MENÜ is handled separately (opens sheet)
]

interface BottomNavProps {
  onScanFromCamera?: () => void
  onScanFromGallery?: () => void
  onFoodPhoto?: () => void
}

export function BottomNav({ onScanFromCamera, onScanFromGallery, onFoodPhoto }: BottomNavProps) {
  const pathname = usePathname()
  const [cameraSheetOpen, setCameraSheetOpen] = useState(false)
  const [menuSheetOpen, setMenuSheetOpen] = useState(false)

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/" || pathname === "/dashboard"
    }
    if (href === "/dashboard/ausgaben") {
      return pathname.startsWith("/dashboard/ausgaben")
    }
    if (href === "/dashboard/list") {
      return pathname.startsWith("/dashboard/list")
    }
    return pathname.startsWith(href)
  }

  const handleCameraClick = () => {
    setCameraSheetOpen(false)
    onScanFromCamera?.()
  }

  const handleGalleryClick = () => {
    setCameraSheetOpen(false)
    onScanFromGallery?.()
  }

  const handleFoodPhotoClick = () => {
    setCameraSheetOpen(false)
    onFoodPhoto?.()
  }

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border"
        style={{ paddingBottom: "var(--safe-bottom-nav)" }}
      >
        <div className="flex items-center justify-around h-12 max-w-lg mx-auto px-2">
          {/* First two nav items (HOME, AUSGABEN) */}
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
          <Sheet open={cameraSheetOpen} onOpenChange={setCameraSheetOpen}>
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
                    "bg-foreground text-background",
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
                Was möchtest du tun?
              </SheetTitle>
              <div className="flex flex-col gap-3 pb-4">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full justify-start gap-3 h-14 rounded-xl"
                  onClick={handleFoodPhotoClick}
                >
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <div className="flex flex-col items-start">
                    <span className="font-semibold">Essen erkennen (AI)</span>
                    <span className="text-[10px] text-muted-foreground">Kalorien & Nährwerte per Foto</span>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full justify-start gap-3 h-14 rounded-xl"
                  onClick={handleCameraClick}
                >
                  <Camera className="w-5 h-5" />
                  <span>Kassenbon scannen</span>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full justify-start gap-3 h-14 rounded-xl"
                  onClick={handleGalleryClick}
                >
                  <ImageIcon className="w-5 h-5" />
                  <span>Kassenbon aus Galerie</span>
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          {/* LISTE nav item */}
          {navItems.slice(2).map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              isActive={isActive(item.href)}
            />
          ))}

          {/* MENÜ Button - opens slide-in sheet */}
          <button
            type="button"
            onClick={() => setMenuSheetOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center gap-1",
              "min-w-[60px] min-h-touch",
              "transition-colors"
            )}
          >
            <Menu
              className={cn(
                "w-6 h-6 transition-colors",
                menuSheetOpen ? "text-primary" : "text-muted-foreground"
              )}
            />
            <span
              className={cn(
                "text-[10px] font-medium tracking-wide transition-colors",
                menuSheetOpen ? "text-primary" : "text-muted-foreground"
              )}
            >
              MENÜ
            </span>
          </button>
        </div>
      </nav>

      {/* Menu Sheet (slides in from right) */}
      <MenuSheet open={menuSheetOpen} onOpenChange={setMenuSheetOpen} />
    </>
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
          isActive ? "text-primary fill-primary/10" : "text-muted-foreground"
        )}
      />
      <span
        className={cn(
          "text-[10px] font-medium tracking-wide transition-colors",
          isActive ? "text-primary" : "text-muted-foreground"
        )}
      >
        {label}
      </span>
    </Link>
  )
}

export default BottomNav
