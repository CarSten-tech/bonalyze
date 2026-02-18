'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { AlertCircle, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react'
import { useHousehold } from '@/contexts/household-context'
import { getAiQualityDashboard } from '@/app/actions/ai-quality'
import { getNotificationRetryDashboard, retryNotificationDeliveryQueue } from '@/app/actions/notification-retry'
import { getHouseholdAuditLog } from '@/app/actions/audit-log'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface QueueStats {
  total: number
  pending: number
  retrying: number
  deadLetter: number
  sent: number
}

interface AuditItem {
  id: string
  action: string
  entity_type: string
  entity_id: string
  created_at: string
}

export default function EnterpriseInsightsPage() {
  const { currentHousehold } = useHousehold()
  const [isLoading, setIsLoading] = useState(false)
  const [isRetryPending, startRetryTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [aiSummary, setAiSummary] = useState<{
    totalEvents: number
    avgConfidence: number | null
    avgMatchScore: number | null
    byType: Array<{ metricType: string; count: number; avgConfidence: number | null; avgMatchScore: number | null }>
  } | null>(null)

  const [queueStats, setQueueStats] = useState<QueueStats | null>(null)
  const [auditLogs, setAuditLogs] = useState<AuditItem[]>([])

  const householdId = currentHousehold?.id

  const loadDashboard = useCallback(async () => {
    if (!householdId) return

    setIsLoading(true)
    setError(null)

    try {
      const [aiResult, queueResult, auditResult] = await Promise.all([
        getAiQualityDashboard(householdId, 30),
        getNotificationRetryDashboard(householdId),
        getHouseholdAuditLog(householdId, 20, 0),
      ])

      setAiSummary(aiResult.summary)
      setQueueStats(queueResult.stats)
      setAuditLogs(auditResult as AuditItem[])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Daten konnten nicht geladen werden.')
    } finally {
      setIsLoading(false)
    }
  }, [householdId])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  const runRetry = () => {
    if (!householdId) return

    startRetryTransition(async () => {
      try {
        await retryNotificationDeliveryQueue(householdId, 30)
        await loadDashboard()
      } catch (retryError) {
        setError(retryError instanceof Error ? retryError.message : 'Retry fehlgeschlagen.')
      }
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Enterprise Insights</h1>
        <p className="text-sm text-muted-foreground">Audit Logs, Notification-DLQ und AI-Qualitätsmetriken</p>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center gap-2 text-red-700">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4" />
            AI Quality (30 Tage)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-muted-foreground">Events</p>
              <p className="font-semibold">{aiSummary?.totalEvents ?? 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Ø Confidence</p>
              <p className="font-semibold">{aiSummary?.avgConfidence?.toFixed(2) ?? '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Ø Match</p>
              <p className="font-semibold">{aiSummary?.avgMatchScore?.toFixed(2) ?? '—'}</p>
            </div>
          </div>
          <div className="space-y-1">
            {(aiSummary?.byType || []).map((entry) => (
              <div key={entry.metricType} className="flex items-center justify-between border-b py-1">
                <span>{entry.metricType}</span>
                <span className="text-muted-foreground">{entry.count} Events</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <RefreshCw className="h-4 w-4" />
            Notification Retry Queue
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-4 gap-3">
            <div>
              <p className="text-muted-foreground">Pending</p>
              <p className="font-semibold">{queueStats?.pending ?? 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Retrying</p>
              <p className="font-semibold">{queueStats?.retrying ?? 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">DLQ</p>
              <p className="font-semibold">{queueStats?.deadLetter ?? 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Sent</p>
              <p className="font-semibold">{queueStats?.sent ?? 0}</p>
            </div>
          </div>
          <Button onClick={runRetry} disabled={isRetryPending || !householdId}>
            {isRetryPending ? 'Retry läuft...' : 'Retries ausführen'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" />
            Audit Log (neueste 20)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {isLoading && <p className="text-muted-foreground">Lade Daten...</p>}
          {!isLoading && auditLogs.length === 0 && <p className="text-muted-foreground">Keine Einträge vorhanden.</p>}
          {auditLogs.map((log) => (
            <div key={log.id} className="flex flex-col border-b pb-2">
              <span className="font-medium">
                {log.action.toUpperCase()} {log.entity_type}
              </span>
              <span className="text-xs text-muted-foreground">{log.entity_id}</span>
              <span className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString('de-DE')}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
