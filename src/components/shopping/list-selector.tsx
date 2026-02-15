"use client"

import { useState } from "react"
import { ChevronDown, Plus, Check, List } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import type { ShoppingList } from "@/types/shopping"

interface ListSelectorProps {
  lists: ShoppingList[]
  currentList: ShoppingList | null
  onSelect: (id: string) => void
  onCreate: (name: string) => Promise<ShoppingList | null>
}

export function ListSelector({ 
  lists, 
  currentList, 
  onSelect, 
  onCreate 
}: ListSelectorProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newListName, setNewListName] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = async () => {
    if (!newListName.trim()) return
    
    setIsCreating(true)
    const newList = await onCreate(newListName)
    setIsCreating(false)
    
    if (newList) {
      onSelect(newList.id)
      setNewListName("")
      setIsDialogOpen(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="gap-2 font-semibold text-lg"
          >
            <List className="w-5 h-5" />
            {currentList?.name || "Einkaufsliste"}
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {lists.map((list) => (
            <DropdownMenuItem
              key={list.id}
              onClick={() => onSelect(list.id)}
              className="gap-2"
            >
              {list.id === currentList?.id && (
                <Check className="w-4 h-4 text-primary" />
              )}
              <span className={cn(
                list.id !== currentList?.id && "ml-6"
              )}>
                {list.name}
              </span>
            </DropdownMenuItem>
          ))}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem
            onClick={() => setIsDialogOpen(true)}
            className="gap-2 text-primary"
          >
            <Plus className="w-4 h-4" />
            Neue Liste erstellen
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neue Liste erstellen</DialogTitle>
            <DialogDescription>
              Gib einen Namen für deine neue Einkaufsliste ein.
            </DialogDescription>
          </DialogHeader>
          
          <Input
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder="z.B. REWE, dm, Wochenmarkt..."
            className="mt-2"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate()
            }}
          />
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newListName.trim() || isCreating}
            >
              {isCreating ? "Erstelle..." : "Erstellen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
