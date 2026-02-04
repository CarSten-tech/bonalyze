"use client"

import { useState, useEffect } from "react"
import { 
  Flame, 
  Tag, 
  Clock, 
  Palette, 
  Camera, 
  FolderOpen, 
  ArrowRightLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { ShoppingListItem } from "@/types/shopping"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

type Priority = "urgent" | "sale" | "flexible" | null

interface ItemDetailSheetProps {
  item: ShoppingListItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate?: (id: string, updates: { quantity?: number; unit?: string; priority?: "urgent" | "sale" | "flexible" | null }) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  lastChangedBy?: string | null
}

const priorityOptions = [
  { value: "urgent" as Priority, label: "Dringend", icon: Flame, color: "text-red-500 bg-red-50 border-red-200" },
  { value: "sale" as Priority, label: "Angebot", icon: Tag, color: "text-amber-500 bg-amber-50 border-amber-200" },
  { value: "flexible" as Priority, label: "Wenn's passt", icon: Clock, color: "text-blue-500 bg-blue-50 border-blue-200" },
]

const settingsActions = [
  { id: "icon", label: "Icon ändern", icon: Palette, disabled: true },
  { id: "photo", label: "Foto hinzufügen", icon: Camera, disabled: true },
  { id: "category", label: "Kategorie ändern", icon: FolderOpen, disabled: true },
  { id: "move", label: "Verschieben", icon: ArrowRightLeft, disabled: true },
]

export function ItemDetailSheet({ 
  item, 
  open, 
  onOpenChange,
  onUpdate,
  onDelete,
  lastChangedBy 
}: ItemDetailSheetProps) {
  const [quantity, setQuantity] = useState("")
  const [unit, setUnit] = useState<string | null>(null)
  const [selectedPriority, setSelectedPriority] = useState<Priority>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Initialize quantity and unit when item changes
  useEffect(() => {
    if (item && open) {
      setQuantity(item.quantity?.toString() || "")
      setUnit(item.unit || "Stk") // Default to Stk if null, or keep null? Let's suggest Stk
    }
  }, [item, open])

  // Handle closing - save changes first
  const handleOpenChange = async (isOpen: boolean) => {
    if (!isOpen && item && onUpdate) {
      const newQuantity = parseFloat(quantity.replace(',', '.')) || null
      // Use null if unit is empty string
      const newUnit = unit === "" ? null : unit
      
      // Only update if changes were made
      if (newQuantity !== item.quantity || selectedPriority !== item.priority || newUnit !== item.unit) {
        setIsSaving(true)
        await onUpdate(item.id, { 
          quantity: newQuantity || undefined,
          unit: newUnit || undefined,
          priority: selectedPriority || null
        })
        setIsSaving(false)
      }
    }
    
    if (!isOpen) {
      setQuantity("")
      setUnit(null)
      setSelectedPriority(null)
    }
    onOpenChange(isOpen)
  }

  // Initialize priority and unit when item changes
  useEffect(() => {
    if (item && open) {
      setSelectedPriority(item.priority || null)
      setUnit(item.unit || null)
    }
  }, [item, open])

  // Parse last changed info
  const getLastChangedDisplay = () => {
    if (lastChangedBy) {
      return lastChangedBy
    }
    return "Keine Daten vorhanden"
  }

  if (!item) return null

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent 
        side="bottom" 
        hideClose
        className="rounded-t-2xl max-h-[85vh] overflow-y-auto px-6 pt-2"
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        {/* Header */}
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl font-semibold">
              {item.product_name}
            </SheetTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenChange(false)}
              className="text-primary font-medium"
              disabled={isSaving}
            >
              {isSaving ? "Speichert..." : "Fertig"}
            </Button>
          </div>
        </SheetHeader>

        {/* Quantity and Unit Input */}
        <div className="mb-6">
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                type="text"
                inputMode="decimal"
                placeholder="Menge"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="bg-slate-100 border-0 text-center text-lg font-medium"
              />
            </div>
            <div className="flex-[2] flex gap-2 overflow-x-auto pb-1 items-center">
              {["Stk", "Pck", "kg", "g", "l", "ml"].map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnit(unit === u ? null : u)}
                  className={cn(
                    "px-3 py-2 rounded-lg border text-sm font-medium transition-all flex-shrink-0",
                    unit === u
                      ? "bg-slate-800 text-white border-slate-800"
                      : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                  )}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Priority Tags - Horizontal Row */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-slate-600 mb-3">
            Details zu {item.product_name}
          </h3>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {priorityOptions.map((option) => {
              const Icon = option.icon
              const isSelected = selectedPriority === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedPriority(
                    isSelected ? null : option.value
                  )}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-full border transition-all",
                    "text-sm font-medium whitespace-nowrap flex-shrink-0",
                    isSelected 
                      ? option.color
                      : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Settings Grid */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-slate-600 mb-3">
            Einstellungen
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {settingsActions.map((action) => {
              const Icon = action.icon
              return (
                <button
                  key={action.id}
                  type="button"
                  disabled={action.disabled}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2",
                    "p-4 rounded-xl border transition-all",
                    action.disabled
                      ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
                      : "bg-white border-slate-200 text-slate-600 hover:border-primary/50 hover:bg-primary/5"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{action.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Last Change */}
        <div className="pt-4 border-t border-slate-200">
          <h3 className="text-sm font-medium text-slate-600 mb-3">
            Letzte Änderung
          </h3>
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-slate-100 text-slate-500">
                {lastChangedBy ? lastChangedBy.charAt(0).toUpperCase() : "?"}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-slate-500">
              {getLastChangedDisplay()}
            </span>
          </div>
        </div>

        {/* Delete Button */}
        {onDelete && (
          <div className="mt-6 pt-4 border-t border-slate-200">
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => {
                onDelete(item.id)
                handleOpenChange(false)
              }}
            >
              Artikel löschen
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
