import { describe, it, expect, vi, beforeEach } from 'vitest'
import { queueAction, processQueue } from '@/lib/sync-queue'
import * as idb from '@/lib/idb'
import { SYNC_ACTIONS } from '@/lib/sync-actions'
import { toast } from 'sonner'

vi.mock('@/lib/idb')
vi.mock('sonner')
vi.mock('@/lib/logger')

describe('Sync Queue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    })
  })

  it('should queue an action', async () => {
    vi.mocked(idb.get).mockResolvedValue([])
    const mockSet = vi.mocked(idb.set).mockResolvedValue()

    await queueAction('ADD_NUTRITION_LOG', { foo: 'bar' })

    expect(mockSet).toHaveBeenCalledWith('sync-queue', expect.arrayContaining([
      expect.objectContaining({
        action: 'ADD_NUTRITION_LOG',
        payload: { foo: 'bar' }
      })
    ]))
    expect(toast.info).toHaveBeenCalled()
  })

  it('should process queue when online', async () => {
    const mockAction = vi.fn().mockResolvedValue({ success: true })
    // @ts-expect-error - injecting mock action for runtime behavior test
    SYNC_ACTIONS['ADD_NUTRITION_LOG'] = mockAction

    const mockItem = {
      id: '1',
      action: 'ADD_NUTRITION_LOG',
      payload: { test: 1 },
      timestamp: Date.now(),
      retryCount: 0
    }

    vi.mocked(idb.get).mockResolvedValue([mockItem])
    vi.mocked(idb.set).mockResolvedValue()

    await processQueue()

    expect(mockAction).toHaveBeenCalledWith({ test: 1 })
    expect(idb.set).toHaveBeenCalledWith('sync-queue', [])
    expect(toast.success).toHaveBeenCalled()
  })

  it('should not process queue if offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false })
    const mockedGet = vi.mocked(idb.get)

    await processQueue()

    expect(mockedGet).not.toHaveBeenCalled()
  })

  it('should handle failed syncs and retry', async () => {
    const mockAction = vi.fn().mockRejectedValue(new Error('api fail'))
    // @ts-expect-error - injecting mock action for runtime behavior test
    SYNC_ACTIONS['ADD_NUTRITION_LOG'] = mockAction

    const mockItem = {
      id: '1',
      action: 'ADD_NUTRITION_LOG',
      payload: { test: 1 },
      timestamp: Date.now(),
      retryCount: 0
    }

    vi.mocked(idb.get).mockResolvedValue([mockItem])
    vi.mocked(idb.set).mockResolvedValue()

    await processQueue()

    // Should stay in queue with incremented retry count
    expect(idb.set).toHaveBeenCalledWith('sync-queue', [
      expect.objectContaining({ id: '1', retryCount: 1 })
    ])
  })
})
