import { ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface CategoryHeaderProps {
  name: string
  count?: number
  isCollapsed?: boolean
  onToggle?: () => void
}

export function CategoryHeader({ name, count, isCollapsed, onToggle }: CategoryHeaderProps) {
  return (
    <div 
      onClick={onToggle}
      className={cn(
        "flex items-center gap-2 py-3 px-1 mt-4 mb-1 text-muted-foreground select-none cursor-pointer hover:text-foreground transition-colors",
        isCollapsed && "opacity-70"
      )}
    >
      <div className="flex items-center justify-center w-5 h-5">
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </div>
      
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
