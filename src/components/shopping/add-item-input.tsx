"use client"

import { useState, useRef, useEffect } from "react"
import { Plus, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { AddItemInput } from "@/types/shopping"

interface AddItemInputProps {
  onAdd: (input: AddItemInput) => Promise<void>
  isLoading?: boolean
  placeholder?: string
}

export function AddItemInput({ 
  onAdd, 
  isLoading = false,
  placeholder = "Produkt hinzufügen..." 
}: AddItemInputProps) {
  const [value, setValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed || isLoading) return

    await onAdd({ product_name: trimmed })
    setValue("")
    inputRef.current?.focus()
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        disabled={isLoading}
        className={cn(
          "h-12 pr-12 rounded-xl",
          "bg-white border-slate-200",
          "placeholder:text-slate-400",
          "focus-visible:ring-primary"
        )}
      />
      <Button
        type="submit"
        size="icon"
        disabled={!value.trim() || isLoading}
        className={cn(
          "absolute right-1.5 top-1.5",
          "w-9 h-9 rounded-lg",
          "bg-primary hover:bg-primary/90"
        )}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Plus className="w-4 h-4" />
        )}
      </Button>
    </form>
  )
}
