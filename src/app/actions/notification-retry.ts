'use server'

import { createServerClient as createClient } from '@/lib/supabase-server'
import { processNotificationRetryQueue } from '@/lib/notification-retry-queue'

interface RetryDashboardStats {
  total: number
  pending: number
  retrying: number
  deadLetter: number
  sent: number
}

interface RetryQueueItem {
  id: string
  notification_type: string
  status: string
  attempt_count: number
  max_attempts: number
  last_error: string | null
  created_at: string
  next_retry_at: string | null
}

interface RetryDashboardResult {
  stats: RetryDashboardStats
  items: RetryQueueItem[]
  error?: string
}

interface RetryDeliveryResult {
  success: boolean
  processed: number
  sent: number
  deadLettered: number
  retryScheduled: number
  error?: string
}

const EMPTY_STATS: RetryDashboardStats = {
  total: 0,
  pending: 0,
  retrying: 0,
  deadLetter: 0,
  sent: 0,
}

function friendlyEnterpriseError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : String(error)
  if (/does not exist|relation .* does not exist|42P01/i.test(message)) {
    return 'Notification Retry Queue ist noch nicht eingerichtet (Migration fehlt).'
  }
  if (/not configured|SUPABASE_SERVICE_ROLE_KEY|enterprise admin client/i.test(message)) {
    return 'Notification Retry Queue ist nicht vollständig konfiguriert.'
  }
  return fallback
}

export async function getNotificationRetryDashboard(householdId: string): Promise<RetryDashboardResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { stats: EMPTY_STATS, items: [], error: 'Nicht eingeloggt' }

  const { data: membership } = await supabase
    .from('household_members')
    .select('role')
    .eq('household_id', householdId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) {
    return { stats: EMPTY_STATS, items: [], error: 'Kein Zugriff auf diesen Haushalt' }
  }

  try {
    const [{ data: statsRows, error: statsError }, { data: items, error: itemsError }] = await Promise.all([
      supabase
        .from('notification_retry_queue')
        .select('status')
        .eq('household_id', householdId),
      supabase
        .from('notification_retry_queue')
        .select('id, notification_type, status, attempt_count, max_attempts, last_error, created_at, next_retry_at')
        .eq('household_id', householdId)
        .order('created_at', { ascending: false })
        .limit(25),
    ])

    if (statsError) throw statsError
    if (itemsError) throw itemsError

    const rows = statsRows || []
    const summary: RetryDashboardStats = { ...EMPTY_STATS, total: rows.length }
    for (const row of rows) {
      if (row.status === 'pending') summary.pending += 1
      if (row.status === 'retrying') summary.retrying += 1
      if (row.status === 'dead_letter') summary.deadLetter += 1
      if (row.status === 'sent') summary.sent += 1
    }

    return {
      stats: summary,
      items: (items || []) as RetryQueueItem[],
    }
  } catch (error) {
    return {
      stats: EMPTY_STATS,
      items: [],
      error: friendlyEnterpriseError(error, 'Retry-Dashboard konnte nicht geladen werden.'),
    }
  }
}

export async function retryNotificationDeliveryQueue(
  householdId: string,
  limit = 25
): Promise<RetryDeliveryResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      success: false,
      processed: 0,
      sent: 0,
      deadLettered: 0,
      retryScheduled: 0,
      error: 'Nicht eingeloggt',
    }
  }

  const { data: membership } = await supabase
    .from('household_members')
    .select('role')
    .eq('household_id', householdId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
    return {
      success: false,
      processed: 0,
      sent: 0,
      deadLettered: 0,
      retryScheduled: 0,
      error: 'Keine Berechtigung für Retry-Operationen',
    }
  }

  try {
    const result = await processNotificationRetryQueue(householdId, limit)
    return {
      success: true,
      ...result,
    }
  } catch (error) {
    return {
      success: false,
      processed: 0,
      sent: 0,
      deadLettered: 0,
      retryScheduled: 0,
      error: friendlyEnterpriseError(error, 'Retry-Verarbeitung fehlgeschlagen.'),
    }
  }
}
