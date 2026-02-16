import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface CategoryHeaderProps {
  name: string
  emoji?: string | null
  count?: number
}

export function CategoryHeader({ name, emoji, count }: CategoryHeaderProps) {
  return (
    <div className="flex items-center gap-2 py-3 px-1 mt-4 mb-1 text-muted-foreground select-none">
      <span className="text-xl leading-none" role="img" aria-label={name}>
        {emoji || "📦"}
      </span>
      <h3 className="font-medium text-sm tracking-tight flex-1">
        {name}
      </h3>
      {count !== undefined && (
        <span className="text-xs bg-muted/50 px-2 py-0.5 rounded-full font-mono">
          {count}
        </span>
      )}
    </div>
  )
}
