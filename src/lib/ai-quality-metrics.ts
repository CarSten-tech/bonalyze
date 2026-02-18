import { createEnterpriseAdminClient } from '@/lib/enterprise-admin'
import { logger } from '@/lib/logger'

export type AiMetricType = 'receipt_scan' | 'food_scan' | 'offer_match'

export interface AiQualityMetricInput {
  metricType: AiMetricType
  householdId?: string | null
  userId?: string | null
  confidence?: number | null
  matchScore?: number | null
  model?: string | null
  metadata?: Record<string, unknown>
}

export interface AiQualitySummary {
  totalEvents: number
  avgConfidence: number | null
  avgMatchScore: number | null
  byType: Array<{
    metricType: AiMetricType
    count: number
    avgConfidence: number | null
    avgMatchScore: number | null
  }>
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export async function trackAiQualityMetric(input: AiQualityMetricInput) {
  try {
    const supabase = createEnterpriseAdminClient()
    const { error } = await supabase.from('ai_quality_metrics').insert({
      metric_type: input.metricType,
      household_id: input.householdId ?? null,
      user_id: input.userId ?? null,
      confidence: input.confidence ?? null,
      match_score: input.matchScore ?? null,
      model: input.model ?? null,
      metadata: input.metadata ?? {},
    })

    if (error) {
      logger.error('Failed to track AI quality metric', error, {
        metricType: input.metricType,
        householdId: input.householdId,
      })
    }
  } catch (error) {
    logger.error('AI quality metric tracking crashed', error)
  }
}

export async function getAiQualitySummary(householdId: string, days = 30): Promise<AiQualitySummary> {
  const supabase = createEnterpriseAdminClient()
  const fromIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('ai_quality_metrics')
    .select('metric_type, confidence, match_score')
    .eq('household_id', householdId)
    .gte('created_at', fromIso)

  if (error) throw new Error(error.message)

  const rows = data || []
  const byTypeMap = new Map<AiMetricType, { count: number; confidence: number[]; matchScore: number[] }>()

  const allConfidences: number[] = []
  const allMatchScores: number[] = []

  for (const row of rows) {
    const metricType = row.metric_type as AiMetricType
    const bucket = byTypeMap.get(metricType) || { count: 0, confidence: [], matchScore: [] }
    bucket.count += 1

    if (typeof row.confidence === 'number') {
      bucket.confidence.push(row.confidence)
      allConfidences.push(row.confidence)
    }

    if (typeof row.match_score === 'number') {
      bucket.matchScore.push(row.match_score)
      allMatchScores.push(row.match_score)
    }

    byTypeMap.set(metricType, bucket)
  }

  const byType = [...byTypeMap.entries()].map(([metricType, bucket]) => ({
    metricType,
    count: bucket.count,
    avgConfidence:
      bucket.confidence.length > 0
        ? round2(bucket.confidence.reduce((sum, value) => sum + value, 0) / bucket.confidence.length)
        : null,
    avgMatchScore:
      bucket.matchScore.length > 0
        ? round2(bucket.matchScore.reduce((sum, value) => sum + value, 0) / bucket.matchScore.length)
        : null,
  }))

  return {
    totalEvents: rows.length,
    avgConfidence:
      allConfidences.length > 0
        ? round2(allConfidences.reduce((sum, value) => sum + value, 0) / allConfidences.length)
        : null,
    avgMatchScore:
      allMatchScores.length > 0
        ? round2(allMatchScores.reduce((sum, value) => sum + value, 0) / allMatchScores.length)
        : null,
    byType,
  }
}

export async function getRecentAiQualityEvents(householdId: string, limit = 25) {
  const supabase = createEnterpriseAdminClient()
  const { data, error } = await supabase
    .from('ai_quality_metrics')
    .select('id, metric_type, confidence, match_score, model, metadata, created_at')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)

  return data || []
}
