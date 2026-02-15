"use client"

import { useState } from "react"
import { ChevronDown, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { ItemTile } from "./item-tile"
import type { ShoppingListItem } from "@/types/shopping"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"

interface CheckedItemsSectionProps {
  items: ShoppingListItem[]
  onUncheck: (id: string) => void
  onClearAll: () => void
}

export function CheckedItemsSection({ 
  items, 
  onUncheck, 
  onClearAll 
}: CheckedItemsSectionProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (items.length === 0) {
    return null
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center justify-between">
        <CollapsibleTrigger className="flex items-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground">
          <ChevronDown
            className={cn(
              "w-4 h-4 transition-transform",
              isOpen && "rotate-180"
            )}
          />
          <span>Zuletzt verwendet ({items.length})</span>
        </CollapsibleTrigger>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="text-xs text-muted-foreground hover:text-red-500 gap-1"
        >
          <Trash2 className="w-3 h-3" />
          Leeren
        </Button>
      </div>

      <CollapsibleContent className="pt-2">
        <div className="grid grid-cols-3 gap-3 opacity-60">
          {items.map((item) => (
            <ItemTile
              key={item.id}
              item={item}
              onCheck={() => {}} // Already checked
              onUncheck={onUncheck}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
