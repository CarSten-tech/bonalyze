export interface DaySpending {
  day: 'MO' | 'DI' | 'MI' | 'DO' | 'FR' | 'SA' | 'SO'
  percentage: number
  isHighlighted: boolean
}

export interface Tip {
  id: string
  icon: string
  title: string
  description: string
  iconBgColor: string
  iconColor: string
}

export interface InsightsData {
  /** Savings potential in cents for the selected month */
  savingsPotentialCents: number
  /** Efficiency change vs previous month in percent */
  efficiencyPercentage: number
  /** Whether efficiency change is positive */
  isEfficiencyPositive: boolean
  /** Best shopping day bars */
  bestDays: DaySpending[]
  /** Summary sentence for shopping days */
  bestDayDescription: string
  /** Retailer optimization summary */
  retailerOptimization: {
    title: string
    description: string
    savingsAmountCents: number
  }
  /** Product/category trend summary */
  categoryTrend: {
    title: string
    description: string
    emoji: string
  }
  /** Actionable recommendations */
  tips: Tip[]
  /** Data quality and freshness metadata */
  meta: {
    generatedAt: string
    receiptCount: number
    comparableProducts: number
    dataQuality: 'low' | 'medium' | 'high'
  }
}
