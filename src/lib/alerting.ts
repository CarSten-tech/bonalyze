import { logger } from '@/lib/logger'

type AlertSeverity = 'warning' | 'critical'

interface OperationalAlertInput {
  route: string
  severity: AlertSeverity
  message: string
  correlationId?: string
  details?: Record<string, unknown>
}

const alertThrottleMap = new Map<string, number>()
const DEFAULT_ALERT_COOLDOWN_MS = 5 * 60 * 1000

function getCooldownMs(): number {
  const raw = process.env.ALERT_COOLDOWN_MS
  const parsed = raw ? Number.parseInt(raw, 10) : NaN
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_ALERT_COOLDOWN_MS
  return parsed
}

function shouldSendAlert(key: string): boolean {
  const now = Date.now()
  const cooldownMs = getCooldownMs()
  const expiresAt = alertThrottleMap.get(key)
  if (expiresAt && now < expiresAt) return false
  alertThrottleMap.set(key, now + cooldownMs)
  return true
}

export async function sendOperationalAlert(input: OperationalAlertInput): Promise<void> {
  const webhookUrl = process.env.ALERT_WEBHOOK_URL?.trim()
  if (!webhookUrl) return

  const dedupeKey = `${input.route}:${input.severity}:${input.message}`
  if (!shouldSendAlert(dedupeKey)) return

  const payload = {
    source: 'bonalyze',
    timestamp: new Date().toISOString(),
    route: input.route,
    severity: input.severity,
    message: input.message,
    correlation_id: input.correlationId || null,
    details: input.details || {},
    release:
      process.env.SENTRY_RELEASE ||
      process.env.VERCEL_GIT_COMMIT_SHA ||
      process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
      null,
    environment:
      process.env.SENTRY_ENVIRONMENT ||
      process.env.VERCEL_ENV ||
      process.env.NODE_ENV ||
      'unknown',
  }

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  } catch (error) {
    logger.warn('[alerting] failed to send alert', {
      route: input.route,
      severity: input.severity,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
