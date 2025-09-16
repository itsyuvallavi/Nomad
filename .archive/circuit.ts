/**
 * Circuit breaker pattern for resilient API calls
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  threshold?: number;      // Number of failures before opening
  cooldownMs?: number;      // Time to wait before trying again
  resetTimeMs?: number;     // Time window for counting failures
}

export class Circuit {
  private state: CircuitState = 'CLOSED';
  private fails = 0;
  private openedAt = 0;
  private failureTimestamps: number[] = [];
  
  constructor(
    private threshold = 5,
    private cooldownMs = 60000,
    private resetTimeMs = 60000
  ) {}
  
  canCall(): boolean {
    // Clean old failure timestamps
    const now = Date.now();
    this.failureTimestamps = this.failureTimestamps.filter(
      ts => now - ts < this.resetTimeMs
    );
    
    // Check if we should transition from OPEN to HALF_OPEN
    if (this.state === 'OPEN' && now - this.openedAt > this.cooldownMs) {
      this.state = 'HALF_OPEN';
      return true;
    }
    
    return this.state !== 'OPEN';
  }
  
  success(): void {
    this.fails = 0;
    this.failureTimestamps = [];
    this.state = 'CLOSED';
  }
  
  fail(): void {
    const now = Date.now();
    this.failureTimestamps.push(now);
    this.fails = this.failureTimestamps.length;
    
    if (this.fails >= this.threshold) {
      this.state = 'OPEN';
      this.openedAt = now;
    } else if (this.state === 'HALF_OPEN') {
      // Failed in half-open state, go back to open
      this.state = 'OPEN';
      this.openedAt = now;
    }
  }
  
  getState(): CircuitState {
    return this.state;
  }
  
  getStats() {
    return {
      state: this.state,
      failures: this.fails,
      lastOpened: this.openedAt ? new Date(this.openedAt) : null,
      canCall: this.canCall()
    };
  }
}

// Factory for creating circuit breakers
export class CircuitBreakerFactory {
  private static circuits = new Map<string, Circuit>();
  
  static get(
    name: string, 
    options?: CircuitBreakerOptions
  ): Circuit {
    if (!this.circuits.has(name)) {
      this.circuits.set(name, new Circuit(
        options?.threshold,
        options?.cooldownMs,
        options?.resetTimeMs
      ));
    }
    return this.circuits.get(name)!;
  }
  
  static reset(name?: string): void {
    if (name) {
      this.circuits.delete(name);
    } else {
      this.circuits.clear();
    }
  }
  
  static getAll(): Map<string, Circuit> {
    return this.circuits;
  }
}