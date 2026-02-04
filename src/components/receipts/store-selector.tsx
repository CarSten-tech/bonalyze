'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Plus, Store, Sparkles } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'

export interface Merchant {
  id: string
  name: string
}

interface StoreSelectorProps {
  merchants: Merchant[]
  selectedMerchantId: string | null
  onSelect: (merchantId: string) => void
  onCreateNew: () => void
  aiSuggestedName?: string | null
  className?: string
}

export function StoreSelector({
  merchants,
  selectedMerchantId,
  onSelect,
  onCreateNew,
  aiSuggestedName,
  className,
}: StoreSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState('')

  const selectedMerchant = merchants.find((m) => m.id === selectedMerchantId)

  const handleSelect = (merchantId: string) => {
    onSelect(merchantId)
    setOpen(false)
    setSearchValue('')
  }

  const handleCreateNew = () => {
    setOpen(false)
    setSearchValue('')
    onCreateNew()
  }

  // Filter merchants by search value
  const filteredMerchants = merchants.filter((merchant) =>
    merchant.name.toLowerCase().includes(searchValue.toLowerCase())
  )

  // Check if AI suggestion matches a merchant
  const aiSuggestedMerchant = aiSuggestedName
    ? merchants.find(
        (m) => m.name.toLowerCase() === aiSuggestedName.toLowerCase()
      )
    : null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between', className)}
        >
          <span className="flex items-center gap-2 truncate">
            <Store className="h-4 w-4 shrink-0 text-muted-foreground" />
            {selectedMerchant ? (
              <span className="truncate">{selectedMerchant.name}</span>
            ) : (
              <span className="text-muted-foreground">Store auswählen...</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Store suchen..."
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>
              <div className="py-2 text-center text-sm text-muted-foreground">
                Kein Store gefunden
              </div>
            </CommandEmpty>

            {/* AI Suggested Store - Show at top if exists */}
            {aiSuggestedMerchant && searchValue === '' && (
              <CommandGroup heading="KI-Vorschlag">
                <CommandItem
                  value={aiSuggestedMerchant.id}
                  onSelect={() => handleSelect(aiSuggestedMerchant.id)}
                  className="flex items-center gap-2"
                >
                  <Check
                    className={cn(
                      'h-4 w-4',
                      selectedMerchantId === aiSuggestedMerchant.id
                        ? 'opacity-100'
                        : 'opacity-0'
                    )}
                  />
                  <span className="flex-1">{aiSuggestedMerchant.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    KI
                  </Badge>
                </CommandItem>
              </CommandGroup>
            )}

            {/* All Stores */}
            {filteredMerchants.length > 0 && (
              <CommandGroup heading="Bekannte Stores">
                {filteredMerchants.map((merchant) => {
                  // Skip AI suggested merchant if already shown above
                  if (
                    aiSuggestedMerchant &&
                    merchant.id === aiSuggestedMerchant.id &&
                    searchValue === ''
                  ) {
                    return null
                  }
                  return (
                    <CommandItem
                      key={merchant.id}
                      value={merchant.id}
                      onSelect={() => handleSelect(merchant.id)}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          selectedMerchantId === merchant.id
                            ? 'opacity-100'
                            : 'opacity-0'
                        )}
                      />
                      {merchant.name}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )}

            <CommandSeparator />

            {/* Create New Store */}
            <CommandGroup>
              <CommandItem onSelect={handleCreateNew} className="cursor-pointer">
                <Plus className="mr-2 h-4 w-4" />
                <span>Neuen Store anlegen</span>
                {searchValue && (
                  <span className="ml-1 text-muted-foreground">
                    "{searchValue}"
                  </span>
                )}
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
