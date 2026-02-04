'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

import { useHousehold } from '@/contexts/household-context'
import { useExpensesData } from '@/hooks/use-expenses-data'
import { FilterPills, YearSelector, MonthAccordion, type FilterType } from '@/components/ausgaben'
import { AnalyticsEmptyState, AnalyticsErrorState } from '@/components/analytics'

export default function AusgabenPage() {
  const router = useRouter()
  const { currentHousehold, isLoading: isHouseholdLoading } = useHousehold()

  // State
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [activeFilter, setActiveFilter] = useState<FilterType>('alle')

  // Fetch data
  const {
    months,
    availableYears,
    isLoading,
    error,
    refresh,
  } = useExpensesData({
    year: selectedYear,
    paymentType: activeFilter,
  })

  // Handlers
  const handleYearChange = useCallback((year: number) => {
    setSelectedYear(year)
  }, [])

  const handleFilterChange = useCallback((filter: FilterType) => {
    setActiveFilter(filter)
  }, [])

  const handleSubcategoryClick = useCallback((slug: string) => {
    router.push(`/dashboard/ausgaben/kategorie/${slug}?year=${selectedYear}`)
  }, [router, selectedYear])

  // Loading state
  if (isHouseholdLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // No household
  if (!currentHousehold) {
    return (
      <div className="space-y-6 px-4">
        <div>
          <h1 className="text-2xl font-bold">Ausgaben</h1>
          <p className="text-muted-foreground mt-1">
            Bitte wähle einen Haushalt aus, um die Ausgaben anzuzeigen.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-24">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ausgaben</h1>
        <p className="text-muted-foreground text-sm">Übersicht aller Einkäufe</p>
      </div>

      {/* Filter Pills */}
      <FilterPills
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
      />

      {/* Year Selector */}
      <YearSelector
        selectedYear={selectedYear}
        years={availableYears}
        onYearChange={handleYearChange}
        isLoading={isLoading}
      />

      {/* Error State */}
      {error && <AnalyticsErrorState message={error} onRetry={refresh} />}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && months.length === 0 && (
        <AnalyticsEmptyState
          variant="no_period_data"
          periodLabel={`${selectedYear}`}
        />
      )}

      {/* Month Accordions */}
      {!isLoading && !error && months.length > 0 && (
        <div className="space-y-4">
          {months.map((monthData, index) => (
            <MonthAccordion
              key={`${monthData.year}-${monthData.monthNumber}`}
              monthData={monthData}
              defaultOpen={index === 0}
              onSubcategoryClick={handleSubcategoryClick}
              householdId={currentHousehold.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}
