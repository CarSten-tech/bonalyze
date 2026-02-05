'use client'

import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, ReferenceLine 
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { StoreStat, PricePoint } from '@/hooks/use-product-analytics'
import { formatCurrency } from '@/components/common/currency'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'

interface ProductChartsProps {
  priceHistory: PricePoint[]
  storeStats: StoreStat[]
}

const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'] // Blue, Green, Amber, Red, Purple

export function StoreDistributionChart({ storeStats }: { storeStats: StoreStat[] }) {
  const data = storeStats.map((s, i) => ({
    name: s.merchantName,
    value: s.count,
    color: COLORS[i % COLORS.length]
  }))

  return (
    <Card className="rounded-2xl border-slate-100 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Käufe nach Geschäft</CardTitle>
        <CardDescription>Wo kaufst du am häufigsten?</CardDescription>
      </CardHeader>
      <CardContent className="h-[250px] flex items-center justify-center">
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
                formatter={(value: number) => [`${value}x`, 'Käufe']}
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
      </CardContent>
    </Card>
  )
}

export function StorePriceComparison({ storeStats }: { storeStats: StoreStat[] }) {
    // Top 5 stores
    const data = storeStats.slice(0, 5).map(s => ({
        name: s.merchantName,
        price: s.avgPrice
    }))

    return (
        <Card className="rounded-2xl border-slate-100 shadow-sm">
            <CardHeader>
                <CardTitle className="text-base font-semibold">Ø Preis pro Geschäft</CardTitle>
                 <CardDescription>Wo ist es durchschnittlich am günstigsten?</CardDescription>
            </CardHeader>
            <CardContent className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        layout="vertical"
                        data={data}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="#f1f5f9" />
                        <XAxis type="number" hide />
                        <YAxis 
                            dataKey="name" 
                            type="category" 
                            width={80} 
                            tick={{ fontSize: 12, fill: '#64748b' }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip 
                            formatter={(value: number) => [formatCurrency(value, { inCents: true }), 'Ø Preis']}
                            cursor={{ fill: 'transparent' }}
                             contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="price" fill="#2563EB" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}

export function PriceHistoryChart({ priceHistory }: { priceHistory: PricePoint[] }) {
    const data = priceHistory.map(p => ({
        ...p,
        dateFormatted: format(new Date(p.date), 'dd.MM.', { locale: de }),
        timestamp: new Date(p.date).getTime()
    }))

    return (
        <Card className="rounded-2xl border-slate-100 shadow-sm">
            <CardHeader>
                <CardTitle className="text-base font-semibold">Preisverlauf</CardTitle>
                <CardDescription>Entwicklung über die Zeit</CardDescription>
            </CardHeader>
            <CardContent className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                            dataKey="dateFormatted" 
                            tick={{ fontSize: 12, fill: '#94a3b8' }} 
                            axisLine={false}
                            tickLine={false}
                            minTickGap={30}
                        />
                         <YAxis 
                            domain={['auto', 'auto']}
                            hide
                        />
                        <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            formatter={(value: number, name: string, props: any) => [
                                formatCurrency(value, { inCents: true }), 
                                props.payload.merchantName
                            ]}
                            labelFormatter={(label) => label}
                        />
                        <Line 
                            type="monotone" 
                            dataKey="price" 
                            stroke="#10B981" 
                            strokeWidth={3} 
                            dot={{ fill: '#10B981', r: 3, strokeWidth: 0 }} 
                            activeDot={{ r: 6 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}
