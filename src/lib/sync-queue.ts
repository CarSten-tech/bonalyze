import { get, set } from './idb'
import { SYNC_ACTIONS, SyncActionType } from './sync-actions'
import { logger } from './logger'
import { toast } from 'sonner'

interface QueueItem {
  id: string
  action: SyncActionType
  payload: unknown
  timestamp: number
  retryCount: number
  nextRetryAt: number
  lastError?: string
}

export interface SyncQueueStatus {
  pending: number
  retrying: number
  failed: number
  nextRetryAt: number | null
}

const QUEUE_KEY = 'sync-queue'
const MAX_RETRIES = 10
const BASE_RETRY_MS = 20 * 1000
const STATUS_EVENT = 'bonalyze:sync-queue-status'

function nowMs(): number {
  return Date.now()
}

function getBackoffMs(retryCount: number): number {
  const exponent = Math.min(retryCount, 8)
  const jitter = Math.floor(Math.random() * 2000)
  return BASE_RETRY_MS * Math.pow(2, exponent) + jitter
}

function computeStatus(queue: QueueItem[]): SyncQueueStatus {
  const now = nowMs()
  const retrying = queue.filter((item) => item.nextRetryAt > now).length
  const failed = queue.filter((item) => item.retryCount >= MAX_RETRIES).length

  const nextRetryAt = queue
    .map((item) => item.nextRetryAt)
    .filter((value) => value > now)
    .sort((a, b) => a - b)[0] || null

  return {
    pending: queue.length,
    retrying,
    failed,
    nextRetryAt,
  }
}

function emitStatus(status: SyncQueueStatus) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<SyncQueueStatus>(STATUS_EVENT, { detail: status }))
}

async function persistQueue(queue: QueueItem[]) {
  await set(QUEUE_KEY, queue)
  emitStatus(computeStatus(queue))
}

export async function getQueueStatus(): Promise<SyncQueueStatus> {
  const queue = (await get<QueueItem[]>(QUEUE_KEY)) || []
  return computeStatus(queue)
}

export function subscribeQueueStatus(listener: (status: SyncQueueStatus) => void): () => void {
  if (typeof window === 'undefined') return () => {}

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<SyncQueueStatus>
    listener(customEvent.detail)
  }

  window.addEventListener(STATUS_EVENT, handler)
  return () => {
    window.removeEventListener(STATUS_EVENT, handler)
  }
}

export async function queueAction(action: SyncActionType, payload: unknown) {
  const item: QueueItem = {
    id: crypto.randomUUID(),
    action,
    payload,
    timestamp: nowMs(),
    retryCount: 0,
    nextRetryAt: nowMs(),
  }

  const queue = (await get<QueueItem[]>(QUEUE_KEY)) || []
  queue.push(item)
  await persistQueue(queue)

  logger.info(`Action queued: ${action}`, { id: item.id })
  toast.info('Lokal gespeichert. Wird gesendet, sobald du online bist.')
}

export async function processQueue(force = false) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      pending: 0,
      retrying: 0,
      failed: 0,
      nextRetryAt: null,
    }
  }

  const queue = (await get<QueueItem[]>(QUEUE_KEY)) || []
  if (queue.length === 0) {
    const status = computeStatus([])
    emitStatus(status)
    return status
  }

  logger.info(`Processing sync queue: ${queue.length} items`, { force })

  const retainedItems: QueueItem[] = []
  let successCount = 0
  const now = nowMs()

  for (const item of queue) {
    if (!force && item.nextRetryAt > now) {
      retainedItems.push(item)
      continue
    }

    try {
      const actionFn = SYNC_ACTIONS[item.action]
      if (!actionFn) {
        throw new Error(`Unknown action: ${item.action}`)
      }

      await actionFn(item.payload as never)
      successCount += 1
      logger.info(`Synced item: ${item.id}`)
    } catch (error) {
      logger.error(`Failed to sync item: ${item.id}`, error)

      const retryCount = item.retryCount + 1
      const retryDelay = getBackoffMs(retryCount)
      const nextRetryAt = nowMs() + retryDelay

      retainedItems.push({
        ...item,
        retryCount,
        nextRetryAt,
        lastError: error instanceof Error ? error.message : String(error),
      })
    }
  }

  if (successCount > 0) {
    toast.success(`${successCount} Einträge synchronisiert`)
  }

  await persistQueue(retainedItems)
  return computeStatus(retainedItems)
}

export async function triggerSyncNow() {
  return processQueue(true)
}
