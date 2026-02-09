/**
 * Circuit Breaker pattern for resilient external API calls.
 * Prevents cascading failures when external services are unavailable.
 */

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation, requests pass through
  OPEN = 'OPEN',         // Failing, requests are rejected immediately
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

interface CircuitBreakerOptions {
  /** Number of failures before opening circuit */
  failureThreshold: number
  /** Time in ms before attempting recovery */
  resetTimeoutMs: number
  /** Number of successful calls in half-open to close circuit */
  successThreshold: number
}

interface CircuitBreakerState {
  state: CircuitState
  failures: number
  successes: number
  lastFailureTime: number
  nextAttemptTime: number
}

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 3,
  resetTimeoutMs: 30000, // 30 seconds
  successThreshold: 2,
}

export class CircuitBreaker {
  private circuits = new Map<string, CircuitBreakerState>()
  private options: CircuitBreakerOptions

  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  /**
   * Get the current state of a circuit.
   */
  getState(name: string): CircuitState {
    const circuit = this.getOrCreateCircuit(name)
    return this.evaluateState(circuit)
  }

  /**
   * Check if circuit allows requests.
   */
  canRequest(name: string): boolean {
    const state = this.getState(name)
    return state !== CircuitState.OPEN
  }

  /**
   * Record a successful call.
   */
  recordSuccess(name: string): void {
    const circuit = this.getOrCreateCircuit(name)
    const currentState = this.evaluateState(circuit)

    if (currentState === CircuitState.HALF_OPEN) {
      circuit.successes++
      if (circuit.successes >= this.options.successThreshold) {
        // Close the circuit
        circuit.state = CircuitState.CLOSED
        circuit.failures = 0
        circuit.successes = 0
        console.log(`[CircuitBreaker] "${name}" closed - service recovered`)
      }
    } else if (currentState === CircuitState.CLOSED) {
      // Reset failure count on success
      circuit.failures = 0
    }
  }

  /**
   * Record a failed call.
   */
  recordFailure(name: string): void {
    const circuit = this.getOrCreateCircuit(name)
    circuit.failures++
    circuit.lastFailureTime = Date.now()
    circuit.successes = 0

    if (circuit.failures >= this.options.failureThreshold) {
      circuit.state = CircuitState.OPEN
      circuit.nextAttemptTime = Date.now() + this.options.resetTimeoutMs
      console.warn(`[CircuitBreaker] "${name}" opened - too many failures (${circuit.failures})`)
    }
  }

  /**
   * Execute a function with circuit breaker protection.
   */
  async execute<T>(
    name: string,
    fn: () => Promise<T>,
    fallback?: () => T | Promise<T>
  ): Promise<T> {
    if (!this.canRequest(name)) {
      console.log(`[CircuitBreaker] "${name}" is OPEN - using fallback`)
      if (fallback) {
        return fallback()
      }
      throw new Error(`Circuit "${name}" is open`)
    }

    try {
      const result = await fn()
      this.recordSuccess(name)
      return result
    } catch (error) {
      this.recordFailure(name)
      if (fallback) {
        return fallback()
      }
      throw error
    }
  }

  /**
   * Get circuit statistics.
   */
  getStats(name: string): CircuitBreakerState & { currentState: CircuitState } {
    const circuit = this.getOrCreateCircuit(name)
    return {
      ...circuit,
      currentState: this.evaluateState(circuit),
    }
  }

  /**
   * Manually reset a circuit.
   */
  reset(name: string): void {
    this.circuits.delete(name)
  }

  private getOrCreateCircuit(name: string): CircuitBreakerState {
    if (!this.circuits.has(name)) {
      this.circuits.set(name, {
        state: CircuitState.CLOSED,
        failures: 0,
        successes: 0,
        lastFailureTime: 0,
        nextAttemptTime: 0,
      })
    }
    return this.circuits.get(name)!
  }

  private evaluateState(circuit: CircuitBreakerState): CircuitState {
    if (circuit.state === CircuitState.OPEN) {
      // Check if we should transition to half-open
      if (Date.now() >= circuit.nextAttemptTime) {
        circuit.state = CircuitState.HALF_OPEN
        circuit.successes = 0
        console.log(`[CircuitBreaker] Transitioning to HALF_OPEN - testing recovery`)
        return CircuitState.HALF_OPEN
      }
      return CircuitState.OPEN
    }
    return circuit.state
  }
}

// Singleton instance for the application
export const circuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeoutMs: 30000, // 30 seconds
  successThreshold: 2,
})

// Named circuits for different services
export const CIRCUITS = {
  OPEN_FOOD_FACTS: 'open-food-facts',
} as const
