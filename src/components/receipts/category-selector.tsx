'use client'

import * as React from 'react'
import { ChevronDown, Check } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { createClient } from '@/lib/supabase'

interface Category {
  id: string
  name: string
  emoji: string | null
  parent_id: string | null
  slug: string
}

interface CategorySelectorProps {
  value?: string // subcategory name
  onChange: (subcategory: string, category: string) => void
  className?: string
}

export function CategorySelector({ value, onChange, className }: CategorySelectorProps) {
  const [open, setOpen] = React.useState(false)
  const [categories, setCategories] = React.useState<Category[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const supabase = createClient()

  // Load categories on mount
  React.useEffect(() => {
    async function loadCategories() {
      const { data } = await supabase
        .from('categories')
        .select('id, name, emoji, parent_id, slug')
        .order('sort_order')

      if (data) {
        setCategories(data)
      }
      setIsLoading(false)
    }
    loadCategories()
  }, [supabase])

  // Group categories by parent
  const mainCategories = categories.filter(c => !c.parent_id)
  const getSubcategories = (parentId: string) => 
    categories.filter(c => c.parent_id === parentId)

  // Find selected subcategory
  const selectedSubcategory = categories.find(c => c.name === value && c.parent_id)
  const selectedMainCategory = selectedSubcategory 
    ? categories.find(c => c.id === selectedSubcategory.parent_id)
    : null

  const handleSelect = (subcategory: Category) => {
    const mainCat = categories.find(c => c.id === subcategory.parent_id)
    onChange(subcategory.name, mainCat?.name || '')
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between text-xs h-8',
            !value && 'text-muted-foreground',
            className
          )}
          disabled={isLoading}
        >
          {isLoading ? (
            'Lädt...'
          ) : value ? (
            <span className="flex items-center gap-1.5 truncate">
              {selectedMainCategory?.emoji && (
                <span>{selectedMainCategory.emoji}</span>
              )}
              <span className="truncate">{value}</span>
            </span>
          ) : (
            'Kategorie wählen...'
          )}
          <ChevronDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Kategorie suchen..." className="h-9" />
          <CommandList>
            <CommandEmpty>Keine Kategorie gefunden.</CommandEmpty>
            {mainCategories.map((mainCat) => {
              const subs = getSubcategories(mainCat.id)
              if (subs.length === 0) return null
              
              return (
                <CommandGroup 
                  key={mainCat.id} 
                  heading={
                    <span className="flex items-center gap-1.5">
                      {mainCat.emoji && <span>{mainCat.emoji}</span>}
                      {mainCat.name}
                    </span>
                  }
                >
                  {subs.map((sub) => (
                    <CommandItem
                      key={sub.id}
                      value={`${mainCat.name} ${sub.name}`}
                      onSelect={() => handleSelect(sub)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          value === sub.name ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {sub.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
