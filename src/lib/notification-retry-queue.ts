import webpush from 'web-push'
import { createEnterpriseAdminClient } from '@/lib/enterprise-admin'
import { logger } from '@/lib/logger'

const BASE_RETRY_DELAY_MS = 60_000

interface RetryQueueInput {
  householdId: string
  userId: string
  subscriptionId: string
  endpoint: string
  payload: Record<string, unknown>
  notificationType: string
  errorMessage: string
  maxAttempts?: number
}

interface RetryQueueItem {
  id: string
  subscription_id: string
  endpoint: string
  payload: Record<string, unknown>
  attempt_count: number
  max_attempts: number
  household_id: string
  user_id: string
  status: 'pending' | 'retrying' | 'sent' | 'dead_letter'
}

function setupWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY

  if (!publicKey || !privateKey) {
    logger.error('VAPID keys missing')
    return null
  }

  webpush.setVapidDetails('mailto:support@bonalyze.app', publicKey, privateKey)
  return webpush
}

function nextRetryIso(attemptCount: number): string {
  const backoffMs = BASE_RETRY_DELAY_MS * Math.pow(2, Math.max(0, attemptCount - 1))
  return new Date(Date.now() + backoffMs).toISOString()
}

export async function enqueueNotificationRetry(input: RetryQueueInput) {
  const supabase = createEnterpriseAdminClient()
  const { error } = await supabase.from('notification_retry_queue').insert({
    household_id: input.householdId,
    user_id: input.userId,
    subscription_id: input.subscriptionId,
    endpoint: input.endpoint,
    payload: input.payload,
    notification_type: input.notificationType,
    status: 'pending',
    attempt_count: 1,
    max_attempts: input.maxAttempts ?? 5,
    next_retry_at: nextRetryIso(1),
    last_error: input.errorMessage,
  })

  if (error) {
    logger.error('Failed to enqueue notification retry', error)
  }
}

export async function getRetryQueueStats(householdId: string) {
  const supabase = createEnterpriseAdminClient()
  const { data, error } = await supabase
    .from('notification_retry_queue')
    .select('status')
    .eq('household_id', householdId)

  if (error) throw new Error(error.message)

  const rows = data || []
  const summary = {
    pending: 0,
    retrying: 0,
    deadLetter: 0,
    sent: 0,
  }

  for (const row of rows) {
    if (row.status === 'pending') summary.pending += 1
    if (row.status === 'retrying') summary.retrying += 1
    if (row.status === 'dead_letter') summary.deadLetter += 1
    if (row.status === 'sent') summary.sent += 1
  }

  return {
    total: rows.length,
    ...summary,
  }
}

export async function listRetryQueueItems(householdId: string, limit = 25) {
  const supabase = createEnterpriseAdminClient()
  const { data, error } = await supabase
    .from('notification_retry_queue')
    .select('id, notification_type, status, attempt_count, max_attempts, last_error, created_at, next_retry_at')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return data || []
}

export async function processNotificationRetryQueue(householdId: string, limit = 25) {
  const supabase = createEnterpriseAdminClient()
  const wp = setupWebPush()
  if (!wp) {
    return { processed: 0, sent: 0, deadLettered: 0, retryScheduled: 0 }
  }

  const nowIso = new Date().toISOString()
  const { data, error } = await supabase
    .from('notification_retry_queue')
    .select('id, subscription_id, endpoint, payload, attempt_count, max_attempts, household_id, user_id, status')
    .eq('household_id', householdId)
    .in('status', ['pending', 'retrying'])
    .lte('next_retry_at', nowIso)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) throw new Error(error.message)

  const items = (data || []) as RetryQueueItem[]

  let sent = 0
  let deadLettered = 0
  let retryScheduled = 0

  for (const item of items) {
    try {
      const { data: subscription } = await supabase
        .from('push_subscriptions')
        .select('id, endpoint, auth_keys')
        .eq('id', item.subscription_id)
        .maybeSingle()

      if (!subscription) {
        await supabase
          .from('notification_retry_queue')
          .update({
            status: 'dead_letter',
            dead_letter_reason: 'SUBSCRIPTION_NOT_FOUND',
            processed_at: new Date().toISOString(),
          })
          .eq('id', item.id)
        deadLettered += 1
        continue
      }

      await wp.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: subscription.auth_keys as { auth: string; p256dh: string },
        },
        JSON.stringify(item.payload)
      )

      await supabase
        .from('notification_retry_queue')
        .update({
          status: 'sent',
          processed_at: new Date().toISOString(),
        })
        .eq('id', item.id)

      sent += 1
    } catch (error) {
      const statusCode = (error as { statusCode?: number })?.statusCode
      const nextAttempt = item.attempt_count + 1
      const errorMessage = error instanceof Error ? error.message : String(error)

      if (statusCode === 410 || nextAttempt > item.max_attempts) {
        await supabase
          .from('notification_retry_queue')
          .update({
            status: 'dead_letter',
            attempt_count: nextAttempt,
            last_error: errorMessage,
            dead_letter_reason: statusCode === 410 ? 'SUBSCRIPTION_GONE' : 'MAX_ATTEMPTS_REACHED',
            processed_at: new Date().toISOString(),
          })
          .eq('id', item.id)
        deadLettered += 1
        continue
      }

      await supabase
        .from('notification_retry_queue')
        .update({
          status: 'retrying',
          attempt_count: nextAttempt,
          next_retry_at: nextRetryIso(nextAttempt),
          last_error: errorMessage,
        })
        .eq('id', item.id)

      retryScheduled += 1
    }
  }

  return {
    processed: items.length,
    sent,
    deadLettered,
    retryScheduled,
  }
}
