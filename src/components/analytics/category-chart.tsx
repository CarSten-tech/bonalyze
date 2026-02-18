'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/components/common/currency'
import { CategoryData } from '@/types/analytics'
import { cn } from '@/lib/utils'

interface CategoryChartProps {
  /** Category data array */
  data: CategoryData[]
  /** Loading state */
  isLoading?: boolean
  /** Enable click to filter receipts */
  clickable?: boolean
  /** Additional className */
  className?: string
}

interface CategoryTooltipProps {
  active?: boolean
  payload?: Array<{ payload: CategoryData }>
}

function CategoryTooltipContent({ active, payload }: CategoryTooltipProps) {
  if (active && payload && payload.length) {
    const entry = payload[0].payload
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-medium">{entry.name}</p>
        <p className="text-muted-foreground">
          {formatCurrency(entry.amount, { inCents: true })}
        </p>
        <p className="text-muted-foreground">{entry.percentage.toFixed(1)}%</p>
      </div>
    )
  }
  return null
}

/**
 * Category Donut Chart Component
 *
 * Shows spending distribution by category with:
 * - Interactive donut chart
 * - Legend with amounts and percentages
 * - Click-to-filter functionality
 */
export function CategoryChart({
  data,
  isLoading = false,
  clickable = true,
  className,
}: CategoryChartProps) {
  const router = useRouter()

  const handleCategoryClick = useCallback(
    (category: string) => {
      if (clickable) {
        router.push(`/dashboard/receipts?category=${encodeURIComponent(category)}`)
      }
    },
    [router, clickable]
  )

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Nach Kategorie</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <Skeleton className="h-[200px] w-[200px] rounded-full" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-3 w-3 rounded-full" />
                <Skeleton className="h-4 w-24" />
                <div className="flex-1" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Nach Kategorie</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Keine Kategoriedaten vorhanden
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Nach Kategorie</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Donut Chart */}
        <div className="flex justify-center">
          <ResponsiveContainer width={200} height={200}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="amount"
                onClick={(_, index) => handleCategoryClick(data[index].name)}
                cursor={clickable ? 'pointer' : 'default'}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    className="transition-opacity hover:opacity-80"
                  />
                ))}
              </Pie>
              <Tooltip content={<CategoryTooltipContent />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="space-y-2">
          {data.map((category) => (
            <CategoryLegendItem
              key={category.name}
              category={category}
              onClick={() => handleCategoryClick(category.name)}
              clickable={clickable}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Category Legend Item
 */
interface CategoryLegendItemProps {
  category: CategoryData
  onClick?: () => void
  clickable?: boolean
}

function CategoryLegendItem({ category, onClick, clickable }: CategoryLegendItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      className={cn(
        'flex items-center gap-3 w-full p-2 rounded-md text-left transition-colors',
        clickable && 'hover:bg-muted cursor-pointer',
        !clickable && 'cursor-default'
      )}
    >
      {/* Color dot */}
      <span
        className="h-3 w-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: category.color }}
      />

      {/* Category name */}
      <span className="text-sm font-medium flex-1 truncate">{category.name}</span>

      {/* Amount */}
      <span className="text-sm text-muted-foreground tabular-nums">
        {formatCurrency(category.amount, { inCents: true })}
      </span>

      {/* Percentage */}
      <span className="text-sm text-muted-foreground tabular-nums w-12 text-right">
        {category.percentage.toFixed(0)}%
      </span>
    </button>
  )
}

/**
 * Compact Category List
 * Shows categories as a simple list without chart
 */
interface CompactCategoryListProps {
  data: CategoryData[]
  isLoading?: boolean
  className?: string
}

export function CompactCategoryList({
  data,
  isLoading = false,
  className,
}: CompactCategoryListProps) {
  if (isLoading) {
    return (
      <div className={cn('space-y-2', className)}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-2 w-2 rounded-full" />
            <Skeleton className="h-3 w-20" />
            <div className="flex-1" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={cn('space-y-1', className)}>
      {data.slice(0, 5).map((category) => (
        <div key={category.name} className="flex items-center gap-2 text-sm">
          <span
            className="h-2 w-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: category.color }}
          />
          <span className="truncate flex-1">{category.name}</span>
          <span className="text-muted-foreground tabular-nums">
            {category.percentage.toFixed(0)}%
          </span>
        </div>
      ))}
    </div>
  )
}
