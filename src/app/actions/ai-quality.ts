'use server'

import { createServerClient as createClient } from '@/lib/supabase-server'
import type { AiMetricType } from '@/lib/ai-quality-metrics'

interface AiSummary {
  totalEvents: number
  avgConfidence: number | null
  avgMatchScore: number | null
  byType: Array<{
    metricType: string
    count: number
    avgConfidence: number | null
    avgMatchScore: number | null
  }>
}

interface AiDashboardResult {
  summary: AiSummary
  recent: Array<{
    id: string
    metric_type: string
    confidence: number | null
    match_score: number | null
    model: string | null
    metadata: Record<string, unknown> | null
    created_at: string
  }>
  error?: string
}

const EMPTY_SUMMARY: AiSummary = {
  totalEvents: 0,
  avgConfidence: null,
  avgMatchScore: null,
  byType: [],
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function friendlyAiError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (/does not exist|relation .* does not exist|42P01/i.test(message)) {
    return 'AI-Quality-Metriken sind noch nicht eingerichtet (Migration fehlt).'
  }
  return 'AI-Quality-Daten konnten nicht geladen werden.'
}

export async function getAiQualityDashboard(householdId: string, days = 30): Promise<AiDashboardResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { summary: EMPTY_SUMMARY, recent: [], error: 'Nicht eingeloggt' }
  }

  const { data: membership } = await supabase
    .from('household_members')
    .select('id')
    .eq('household_id', householdId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) {
    return { summary: EMPTY_SUMMARY, recent: [], error: 'Kein Zugriff auf diesen Haushalt' }
  }

  try {
    const fromIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    const [{ data: rows, error: rowsError }, { data: recent, error: recentError }] = await Promise.all([
      supabase
        .from('ai_quality_metrics')
        .select('metric_type, confidence, match_score')
        .eq('household_id', householdId)
        .gte('created_at', fromIso),
      supabase
        .from('ai_quality_metrics')
        .select('id, metric_type, confidence, match_score, model, metadata, created_at')
        .eq('household_id', householdId)
        .order('created_at', { ascending: false })
        .limit(25),
    ])

    if (rowsError) throw rowsError
    if (recentError) throw recentError

    const byTypeMap = new Map<
      AiMetricType,
      { count: number; confidences: number[]; matchScores: number[] }
    >()

    const allConfidences: number[] = []
    const allMatchScores: number[] = []

    for (const row of rows || []) {
      const metricType = row.metric_type as AiMetricType
      const bucket = byTypeMap.get(metricType) || { count: 0, confidences: [], matchScores: [] }
      bucket.count += 1
      if (typeof row.confidence === 'number') {
        bucket.confidences.push(row.confidence)
        allConfidences.push(row.confidence)
      }
      if (typeof row.match_score === 'number') {
        bucket.matchScores.push(row.match_score)
        allMatchScores.push(row.match_score)
      }
      byTypeMap.set(metricType, bucket)
    }

    const byType = [...byTypeMap.entries()].map(([metricType, bucket]) => ({
      metricType,
      count: bucket.count,
      avgConfidence:
        bucket.confidences.length > 0
          ? round2(bucket.confidences.reduce((sum, value) => sum + value, 0) / bucket.confidences.length)
          : null,
      avgMatchScore:
        bucket.matchScores.length > 0
          ? round2(bucket.matchScores.reduce((sum, value) => sum + value, 0) / bucket.matchScores.length)
          : null,
    }))

    return {
      summary: {
        totalEvents: (rows || []).length,
        avgConfidence:
          allConfidences.length > 0
            ? round2(allConfidences.reduce((sum, value) => sum + value, 0) / allConfidences.length)
            : null,
        avgMatchScore:
          allMatchScores.length > 0
            ? round2(allMatchScores.reduce((sum, value) => sum + value, 0) / allMatchScores.length)
            : null,
        byType,
      },
      recent:
        (recent as Array<{
          id: string
          metric_type: string
          confidence: number | null
          match_score: number | null
          model: string | null
          metadata: Record<string, unknown> | null
          created_at: string
        }> | null) || [],
    }
  } catch (error) {
    return {
      summary: EMPTY_SUMMARY,
      recent: [],
      error: friendlyAiError(error),
    }
  }
}
