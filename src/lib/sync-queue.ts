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
}

const QUEUE_KEY = 'sync-queue'

export async function queueAction(action: SyncActionType, payload: unknown) {
  const item: QueueItem = {
    id: crypto.randomUUID(),
    action,
    payload,
    timestamp: Date.now(),
    retryCount: 0,
  }

  const queue = (await get<QueueItem[]>(QUEUE_KEY)) || []
  queue.push(item)
  await set(QUEUE_KEY, queue)
  
  logger.info(`Action queued: ${action}`, { id: item.id })
  toast.info('Lokal gespeichert. Wird gesendet, sobald du online bist.')
}

export async function processQueue() {
  if (!navigator.onLine) return

  const queue = (await get<QueueItem[]>(QUEUE_KEY)) || []
  if (queue.length === 0) return

  logger.info(`Processing sync queue: ${queue.length} items`)
  
  const failedItems: QueueItem[] = []
  let successCount = 0

  for (const item of queue) {
    try {
      const actionFn = SYNC_ACTIONS[item.action]
      if (!actionFn) {
        throw new Error(`Unknown action: ${item.action}`)
      }

      await actionFn(item.payload as never)
      successCount++
      logger.info(`Synced item: ${item.id}`)
    } catch (error) {
      logger.error(`Failed to sync item: ${item.id}`, error)
      item.retryCount++
      if (item.retryCount < 5) { // Retain specific retry logic
        failedItems.push(item)
      } else {
        logger.error(`Dropping item after max retries: ${item.id}`)
      }
    }
  }

  if (successCount > 0) {
    toast.success(`${successCount} Einträge synchronisiert`)
  }

  // Update queue with only failed items
  await set(QUEUE_KEY, failedItems)
}
