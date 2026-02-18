'use client'

import { useState, useMemo, type ComponentType } from 'react'
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar 
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { StoreStat, PricePoint } from '@/hooks/use-product-analytics'
import { formatCurrency } from '@/components/common/currency'
import { format, subDays, subMonths, subYears, isAfter } from 'date-fns'
import { de } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { TrendingUp, PieChart as PieChartIcon } from 'lucide-react'

const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'] // Blue, Green, Amber, Red, Purple

function EmptyChartState({ message, icon: Icon }: { message: string, icon?: ComponentType<{ className?: string }> }) {
    return (
        <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
            {Icon && <Icon className="w-8 h-8 mb-2 opacity-50" />}
            <p className="text-sm font-medium">{message}</p>
        </div>
    )
}

export function StoreDistributionChart({ storeStats }: { storeStats: StoreStat[] }) {
  const data = storeStats.map((s, i) => ({
    name: s.merchantName,
    value: s.count,
    color: COLORS[i % COLORS.length]
  }))

  const hasEnoughData = storeStats.length >= 2

  return (
    <Card className="rounded-2xl border-slate-100 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Käufe nach Geschäft</CardTitle>
        <CardDescription>Wo kaufst du am häufigsten?</CardDescription>
      </CardHeader>
      <CardContent className="h-[250px]">
        {hasEnoughData ? (
             <div className="flex items-center justify-center h-full">
                <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                    data={data}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                    ))}
                    </Pie>
                    <Tooltip 
                        cursor={{ fill: 'transparent' }}
                        formatter={(value: number | string | undefined) => [`${value ?? 0}x`, 'Käufe']}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                </PieChart>
                </ResponsiveContainer>
                {/* Simple Legend */}
                <div className="flex flex-col gap-2 ml-4 text-sm">
                    {data.slice(0, 4).map((entry, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="font-medium">{entry.name}</span>
                            <span className="text-muted-foreground">{entry.value}x</span>
                        </div>
                    ))}
                </div>
            </div>
        ) : (
            <EmptyChartState 
                message="Scanne mehr Bons von verschiedenen Geschäften, um hier eine Verteilung zu sehen." 
                icon={PieChartIcon}
            />
        )}
       
      </CardContent>
    </Card>
  )
}

export function StorePriceComparison({ storeStats }: { storeStats: StoreStat[] }) {
    // Determine cheapest store for coloring
    const cheapestPrice = Math.min(...storeStats.map(s => s.avgPrice))

    // Top 5 stores
    const data = storeStats.slice(0, 5).map(s => ({
        name: s.merchantName,
        price: s.avgPrice,
        // Green (#10B981) if within 1% of cheapest, otherwise Blue (#2563EB)
        fillColor: s.avgPrice <= cheapestPrice * 1.01 ? '#10B981' : '#2563EB'
    }))

     const hasEnoughData = storeStats.length >= 2

    return (
        <Card className="rounded-2xl border-slate-100 shadow-sm">
            <CardHeader>
                <CardTitle className="text-base font-semibold">Ø Preis pro Geschäft</CardTitle>
            </CardHeader>
            <CardContent className="h-[250px]">
                {hasEnoughData ? (
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        layout="vertical"
                        data={data}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        barSize={16}
                    >
                        {/* No grid for clean look matching reference image often has minimal grid */}
                        <CartesianGrid horizontal={false} vertical={false} /> 
                        <XAxis 
                            type="number" 
                            tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }} 
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(val) => formatCurrency(val, { inCents: true })}
                            domain={[0, 'auto']}
                        />
                        <YAxis 
                            dataKey="name" 
                            type="category" 
                            width={80} 
                            tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip 
                            formatter={(value: number | string | undefined) => [
                              formatCurrency(typeof value === 'number' ? value : Number(value ?? 0), { inCents: true }),
                              'Ø Preis'
                            ]}
                            cursor={{ fill: 'transparent' }}
                             contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar 
                            dataKey="price" 
                            radius={[0, 4, 4, 0]} 
                            background={{ fill: '#F8FAFC' }} // Light background track 
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fillColor} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
                ) : (
                    <EmptyChartState 
                        message="Kaufe dieses Produkt in verschiedenen Geschäften, um Preise zu vergleichen." 
                        icon={TrendingUp}
                    />
                )}
                
            </CardContent>
        </Card>
    )
}

type TimeRange = '30T' | '3M' | '6M' | '1J' | 'Alle'

export function PriceHistoryChart({ priceHistory }: { priceHistory: PricePoint[] }) {
    const [range, setRange] = useState<TimeRange>('3M')

    const filteredData = useMemo(() => {
        const now = new Date()
        let cutoffDate: Date | null = null

        switch (range) {
            case '30T': cutoffDate = subDays(now, 30); break;
            case '3M': cutoffDate = subMonths(now, 3); break;
            case '6M': cutoffDate = subMonths(now, 6); break;
            case '1J': cutoffDate = subYears(now, 1); break;
            case 'Alle': cutoffDate = null; break;
        }

        let filtered = priceHistory
        if (cutoffDate) {
            filtered = priceHistory.filter(p => isAfter(new Date(p.date), cutoffDate!))
        }
        
        // Add timestamp for sorting if needed, ensure sorted
        return filtered
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map(p => ({
                ...p,
                dateFormatted: format(new Date(p.date), 'dd.MM.', { locale: de }),
                timestamp: new Date(p.date).getTime()
            }))
    }, [priceHistory, range])
    
    // Check if we have at least 2 distinct dates/prices to make a line meaningful
    // Or just > 1 data point generally
    const hasEnoughData = filteredData.length >= 2

    return (
        <Card className="rounded-2xl border-slate-100 shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2 gap-4 sm:gap-0">
                <CardTitle className="text-base font-semibold text-muted-foreground uppercase tracking-widest">Preisverlauf</CardTitle>
                <div className="flex bg-muted/50 p-1 rounded-lg">
                    {(['30T', '3M', '6M', '1J', 'Alle'] as TimeRange[]).map((r) => (
                        <button
                            key={r}
                            onClick={() => setRange(r)}
                            className={cn(
                                "px-2.5 py-1 text-[10px] font-bold rounded-md transition-all",
                                range === r 
                                    ? "bg-emerald-500 text-white shadow-sm" 
                                    : "text-muted-foreground hover:text-muted-foreground"
                            )}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </CardHeader>
            <CardContent className="h-[250px]">
                {hasEnoughData ? (
                    <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={filteredData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                            dataKey="dateFormatted" 
                            tick={{ fontSize: 10, fill: '#94a3b8' }} 
                            axisLine={false}
                            tickLine={false}
                            minTickGap={40}
                            interval="preserveStartEnd"
                        />
                        <YAxis 
                            // Start at 0 or at least give a buffer.
                            // 'dataMin - 20%' is not valid recharts syntax directly in domain for calculated percentage in that way without custom function.
                            // Cleaner: use a function or [0, 'auto']
                            domain={[0, 'auto']} 
                            tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(val) => formatCurrency(val, { inCents: true })}
                            width={55}
                        />
                        <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            formatter={(value: number | string | undefined, _name: string | number | undefined, props: { payload?: { merchantName?: string } }) => [
                                formatCurrency(typeof value === 'number' ? value : Number(value ?? 0), { inCents: true }), 
                                props.payload?.merchantName || 'Unbekannt'
                            ]}
                            labelFormatter={(label) => label}
                        />
                        <Line 
                            type="monotone" 
                            dataKey="price" 
                            stroke="#10B981" 
                            strokeWidth={2.5} 
                            dot={{ fill: '#10B981', r: 4, strokeWidth: 2, stroke: '#fff' }} 
                            activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
                ) : (
                    <EmptyChartState 
                        message="Scanne mehr Bons über einen längeren Zeitraum, um den Preisverlauf zu sehen." 
                        icon={TrendingUp}
                    />
                )}
                
            </CardContent>
        </Card>
    )
}
