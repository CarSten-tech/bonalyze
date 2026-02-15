'use client'

import { WarrantyCard, WarrantyItem } from './warranty-card'

interface WarrantyListProps {
  items: WarrantyItem[]
  isLoading?: boolean
}

export function WarrantyList({ items, isLoading }: WarrantyListProps) {
  if (isLoading) {
    return <div className="space-y-4">
       {[1, 2, 3].map(i => (
         <div key={i} className="h-48 bg-muted rounded-2xl animate-pulse" />
       ))}
    </div>
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-10 px-4">
        <p className="text-muted-foreground">Keine Garantien gefunden.</p>
        <p className="text-xs text-muted-foreground mt-1">Scanne Kassenbons mit Elektronik-Artikeln.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <WarrantyCard key={item.id} item={item} />
      ))}
    </div>
  )
}
