import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CircuitBreaker } from '@/lib/circuit-breaker'

describe('CircuitBreaker', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('should start in CLOSED state', () => {
    const cb = new CircuitBreaker({ failureThreshold: 2 })
    expect(cb.getState('test')).toBe('CLOSED')
  })

  it('should transition to OPEN after reaching failure threshold', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 2 })
    
    // First failure
    await expect(cb.execute('test', async () => { throw new Error('fail') })).rejects.toThrow('fail')
    expect(cb.getState('test')).toBe('CLOSED')

    // Second failure -> OPEN
    await expect(cb.execute('test', async () => { throw new Error('fail') })).rejects.toThrow('fail')
    expect(cb.getState('test')).toBe('OPEN')
  })

  it('should transition to HALF_OPEN after recovery timeout', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 1000 })
    
    await expect(cb.execute('test', async () => { throw new Error('fail') })).rejects.toThrow('fail')
    expect(cb.getState('test')).toBe('OPEN')

    // Fast forward time
    vi.advanceTimersByTime(1100)
    
    // evaluateState transitions to HALF_OPEN on next call
    expect(cb.getState('test')).toBe('HALF_OPEN')
  })

  it('should close after success in HALF_OPEN state', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 1000, successThreshold: 1 })
    
    await expect(cb.execute('test', async () => { throw new Error('fail') })).rejects.toThrow('fail')
    vi.advanceTimersByTime(1100)
    
    await cb.execute('test', async () => 'success')
    expect(cb.getState('test')).toBe('CLOSED')
  })
})
