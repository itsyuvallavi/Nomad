/**
 * Retry utility with exponential backoff and timeout
 */

export interface RetryOptions {
  retries?: number;
  timeoutMs?: number;
  backoffMultiplier?: number;
  maxBackoffMs?: number;
}

export async function withRetry<T>(
  fn: () => Promise<T>, 
  opts: RetryOptions = {}
): Promise<T> {
  const { 
    retries = 1, 
    timeoutMs = 10000,
    backoffMultiplier = 2,
    maxBackoffMs = 5000
  } = opts;
  
  let lastErr: any;
  
  for (let i = 0; i <= retries; i++) {
    try {
      return await Promise.race([
        fn(),
        new Promise<never>((_, rej) => 
          setTimeout(() => rej(new Error('timeout')), timeoutMs)
        )
      ]);
    } catch (e) {
      lastErr = e;
      
      // Don't retry on last attempt
      if (i < retries) {
        // Exponential backoff with jitter
        const baseDelay = Math.min(250 * Math.pow(backoffMultiplier, i), maxBackoffMs);
        const jitter = baseDelay * (0.5 + Math.random() * 0.5);
        await new Promise(r => setTimeout(r, jitter));
      }
    }
  }
  
  throw lastErr;
}