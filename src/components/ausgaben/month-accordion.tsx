'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, Receipt, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/components/common/currency'
import { createClient } from '@/lib/supabase'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

interface SubcategoryData {
  name: string
  amountCents: number
  slug?: string
}

interface CategoryData {
  id: string
  name: string
  emoji: string
  amountCents: number
  subcategories: SubcategoryData[]
}

interface CategoryItemProps {
  category: CategoryData
  onSubcategoryClick?: (slug: string) => void
  className?: string
}

/**
 * Category Item Component
 *
 * Expandable category with subcategories.
 * Shows emoji, name, and total amount.
 */
export function CategoryItem({
  category,
  onSubcategoryClick,
  className,
}: CategoryItemProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div className={cn('border-b border-border last:border-0', className)}>
      {/* Category Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full py-3 min-h-touch"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{category.emoji}</span>
          <span className="font-semibold text-foreground">{category.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">
            {formatCurrency(category.amountCents, { inCents: true })}
          </span>
          <ChevronDown
            className={cn(
              'w-4 h-4 text-muted-foreground transition-transform',
              isExpanded && 'rotate-180'
            )}
          />
        </div>
      </button>

      {/* Subcategories */}
      {isExpanded && category.subcategories.length > 0 && (
        <div className="pl-8 pb-3 space-y-2">
          {category.subcategories.map((sub) => (
            <button
              key={sub.name}
              type="button"
              onClick={() => sub.slug && onSubcategoryClick?.(sub.slug)}
              className="flex items-center justify-between w-full py-1 text-sm hover:text-primary transition-colors"
            >
              <span className="text-muted-foreground">{sub.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">
                  {formatCurrency(sub.amountCents, { inCents: true })}
                </span>
                {sub.slug && (
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface MonthData {
  year: number
  monthNumber: number
  monthName: string
  receiptCount: number
  totalAmountCents: number
  categories: CategoryData[]
}

interface ReceiptListItem {
  id: string
  date: string
  total_amount_cents: number
  merchants?: { name: string } | null
}

interface MonthAccordionProps {
  monthData: MonthData
  defaultOpen?: boolean
  onSubcategoryClick?: (slug: string) => void
  householdId?: string
  className?: string
}

/**
 * Month Accordion Component
 *
 * Expandable month card with category breakdown.
 * Contains tabs for Übersicht and Einkäufe (inline).
 */
export function MonthAccordion({
  monthData,
  defaultOpen = false,
  onSubcategoryClick,
  householdId,
  className,
}: MonthAccordionProps) {
  const [activeTab, setActiveTab] = useState<'uebersicht' | 'einkaeufe'>('uebersicht')
  const [receipts, setReceipts] = useState<ReceiptListItem[]>([])
  const [isLoadingReceipts, setIsLoadingReceipts] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Load receipts when tab is opened
  useEffect(() => {
    if (activeTab !== 'einkaeufe' || !householdId) return
    
    async function loadReceipts() {
      setIsLoadingReceipts(true)
      
      const lastDay = new Date(monthData.year, monthData.monthNumber, 0).getDate()
      const startDate = `${monthData.year}-${String(monthData.monthNumber).padStart(2, '0')}-01`
      const endDate = `${monthData.year}-${String(monthData.monthNumber).padStart(2, '0')}-${lastDay}`
      
      const { data } = await supabase
        .from('receipts')
        .select('id, date, total_amount_cents, merchants(name)')
        .eq('household_id', householdId!)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })
      
      if (data) {
        setReceipts(data as ReceiptListItem[])
      }
      setIsLoadingReceipts(false)
    }
    
    loadReceipts()
  }, [activeTab, householdId, monthData.year, monthData.monthNumber, supabase])

  const handleReceiptClick = (receiptId: string) => {
    router.push(`/dashboard/receipts/${receiptId}`)
  }

  return (
    <Accordion
      type="single"
      collapsible
      defaultValue={defaultOpen ? `month-${monthData.monthNumber}` : undefined}
      className={className}
    >
      <AccordionItem
        value={`month-${monthData.monthNumber}`}
        className="border rounded-2xl shadow-elevation-1 bg-card overflow-hidden"
      >
        <AccordionTrigger className="px-4 py-3 hover:no-underline [&>svg]:hidden">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
              <div className="text-left">
                <p className="font-semibold text-foreground">
                  {monthData.monthName} {monthData.year}
                </p>
                <p className="text-xs text-primary font-medium uppercase tracking-wider">
                  {monthData.receiptCount} EINKÄUFE
                </p>
              </div>
            </div>
            <span className="text-xl font-bold text-foreground">
              {formatCurrency(monthData.totalAmountCents, { inCents: true })}
            </span>
          </div>
        </AccordionTrigger>

        <AccordionContent className="px-4 pb-4">
          {/* Tabs */}
          <div className="flex border-b border-border mb-4">
            <button
              type="button"
              onClick={() => setActiveTab('uebersicht')}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors',
                activeTab === 'uebersicht'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Übersicht
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('einkaeufe')}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors',
                activeTab === 'einkaeufe'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Einkäufe ({monthData.receiptCount})
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'uebersicht' && (
            <div>
              {monthData.categories.map((category) => (
                <CategoryItem
                  key={category.id}
                  category={category}
                  onSubcategoryClick={onSubcategoryClick}
                />
              ))}
              {monthData.categories.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  Keine Kategorien für diesen Monat
                </p>
              )}
            </div>
          )}

          {activeTab === 'einkaeufe' && (
            <div className="space-y-2">
              {isLoadingReceipts ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : receipts.length > 0 ? (
                receipts.map((receipt) => (
                  <button
                    key={receipt.id}
                    type="button"
                    onClick={() => handleReceiptClick(receipt.id)}
                    className="flex items-center justify-between w-full p-3 border border-border rounded-lg hover:bg-muted transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Receipt className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-foreground">
                          {receipt.merchants?.name || 'Unbekannt'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(receipt.date).toLocaleDateString('de-DE', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {formatCurrency(receipt.total_amount_cents, { inCents: true })}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  Keine Einkäufe in diesem Monat
                </p>
              )}
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

export default MonthAccordion
