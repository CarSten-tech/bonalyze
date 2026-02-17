import { useState, useEffect } from "react"
import { 
  Flame, 
  Tag, 
  Clock, 
  FolderOpen, 
  ArrowRightLeft,
  StickyNote,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { ShoppingListItem, ShoppingList } from "@/types/shopping"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCategories } from "@/hooks/use-categories"

type Priority = string | null

interface ItemDetailSheetProps {
  item: ShoppingListItem | null
  lists?: ShoppingList[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate?: (id: string, updates: Partial<ShoppingListItem>) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  onMove?: (itemId: string, targetListId: string) => Promise<void>
  lastChangedBy?: string | null
}

const priorityOptions = [
  { value: "urgent", label: "Dringend", icon: Flame, color: "text-red-500 bg-red-50 border-red-200" },
  { value: "sale", label: "Angebot", icon: Tag, color: "text-amber-500 bg-amber-50 border-amber-200" },
  { value: "flexible", label: "Wenn's passt", icon: Clock, color: "text-blue-500 bg-blue-50 border-blue-200" },
]

export function ItemDetailSheet({ 
  item, 
  lists = [],
  open, 
  onOpenChange,
  onUpdate,
  onDelete,
  onMove,
  lastChangedBy 
}: ItemDetailSheetProps) {
  const [quantity, setQuantity] = useState("")
  const [unit, setUnit] = useState<string | null>(null)
  const [selectedPriority, setSelectedPriority] = useState<Priority>(null)
  const [note, setNote] = useState("")
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const { data: categories } = useCategories()

  // Initialize state when item changes
  useEffect(() => {
    if (item && open) {
      setQuantity(item.quantity?.toString() || "")
      setUnit(item.unit || "Stk")
      setSelectedPriority(item.priority || null)
      setNote(item.note || "")
      setCategoryId(item.category_id || null)
    }
  }, [item, open])

  // Handle closing - save changes first
  const handleOpenChange = async (isOpen: boolean) => {
    if (!isOpen && item && onUpdate) {
      const newQuantity = parseFloat(quantity.replace(',', '.')) || null
      const newUnit = unit === "" ? null : unit
      const newNote = note.trim() === "" ? null : note.trim()
      
      // Only update if changes were made
      if (
        newQuantity !== item.quantity || 
        selectedPriority !== item.priority || 
        newUnit !== item.unit ||
        newNote !== item.note ||
        categoryId !== item.category_id
      ) {
        setIsSaving(true)
        await onUpdate(item.id, { 
          quantity: newQuantity || undefined,
          unit: newUnit || undefined,
          priority: selectedPriority || null,
          note: newNote,
          category_id: categoryId
        })
        setIsSaving(false)
      }
    }
    
    if (!isOpen) {
      setQuantity("")
      setUnit(null)
      setSelectedPriority(null)
      setNote("")
      setCategoryId(null)
    }
    onOpenChange(isOpen)
  }

  const handleMoveItem = async (targetListId: string) => {
    if (item && onMove) {
      setIsSaving(true)
      await onMove(item.id, targetListId)
      setIsSaving(false)
      onOpenChange(false)
    }
  }

  // Parse last changed info
  const getLastChangedDisplay = () => {
    if (lastChangedBy) {
      return lastChangedBy
    }
    if (item?.last_changed_by_profile?.display_name) {
      return item.last_changed_by_profile.display_name
    }
    return "Keine Daten vorhanden"
  }

  if (!item) return null

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent 
        side="bottom" 
        hideClose
        className="rounded-t-2xl max-h-[90vh] overflow-y-auto px-6 pt-2"
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-muted" />
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
                className="bg-muted border-0 text-center text-lg font-medium"
              />
            </div>
            <div className="flex-[2] flex gap-2 overflow-x-auto pb-1 items-center scrollbar-hide">
              {["Stk", "Pck", "kg", "g", "l", "ml"].map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnit(unit === u ? null : u)}
                  className={cn(
                    "px-3 py-2 rounded-lg border text-sm font-medium transition-all flex-shrink-0",
                    unit === u
                      ? "bg-foreground text-background border-foreground"
                      : "bg-card border-border text-muted-foreground hover:border-slate-300"
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
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Details
          </h3>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
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
                      : "bg-card border-border text-muted-foreground hover:border-slate-300"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Note Field */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <StickyNote className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-muted-foreground">
              Notiz
            </h3>
          </div>
          <Textarea
            placeholder="z.B. die rote Packung, nicht zu teuer..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="bg-muted border-0 resize-none min-h-[80px]"
          />
        </div>

        {/* Category & Move */}
        <div className="mb-6 space-y-4">
          {/* Category */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-muted-foreground">
                Kategorie
              </h3>
            </div>
            <Select 
              value={categoryId || "no-category"} 
              onValueChange={(val) => setCategoryId(val === "no-category" ? null : val)}
            >
              <SelectTrigger className="w-full bg-card border-border">
                <SelectValue placeholder="Kategorie wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-category">Keine Kategorie</SelectItem>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.emoji} {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Move to different List */}
          {lists && lists.length > 1 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-medium text-muted-foreground">
                  Verschieben nach
                </h3>
              </div>
              <Select onValueChange={handleMoveItem}>
                <SelectTrigger className="w-full bg-card border-border">
                  <SelectValue placeholder="--- Liste auswählen ---" />
                </SelectTrigger>
                <SelectContent>
                  {lists
                    .filter(l => l.id !== item.shopping_list_id)
                    .map((list) => (
                      <SelectItem key={list.id} value={list.id}>
                        {list.name}
                      </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Last Change */}
        <div className="pt-4 border-t border-border">
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                {lastChangedBy ? lastChangedBy.charAt(0).toUpperCase() : "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">
                Zuletzt geändert von
              </span>
              <span className="text-sm font-medium">
                {getLastChangedDisplay()}
              </span>
            </div>
          </div>
        </div>

        {/* Delete Button */}
        {onDelete && (
          <div className="mt-6 pt-4 border-t border-border">
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
