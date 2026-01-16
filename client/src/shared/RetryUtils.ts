/**
 * Retry Utilities
 * 
 * Provides retry logic with exponential backoff for failed operations.
 * Useful for handling transient network errors.
 */

import { logger } from './logger';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  shouldRetry: () => true,
};

/**
 * Calculate delay for exponential backoff
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  const delay = options.initialDelayMs * Math.pow(options.backoffMultiplier, attempt - 1);
  return Math.min(delay, options.maxDelayMs);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * @param fn - Function to retry
 * @param options - Retry options
 * @returns Result of the function
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      logger.debug(`Attempt ${attempt}/${opts.maxAttempts}`, { fn: fn.name });
      return await fn();
    } catch (error) {
      lastError = error;

      if (!opts.shouldRetry(error, attempt)) {
        logger.warn(`Retry condition not met, giving up`, { attempt, error });
        throw error;
      }

      if (attempt < opts.maxAttempts) {
        const delay = calculateDelay(attempt, opts);
        logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms`, { error });
        await sleep(delay);
      }
    }
  }

  logger.error(`All ${opts.maxAttempts} attempts failed`, { lastError });
  throw lastError;
}

/**
 * Retry a function with a simple delay between attempts
 * @param fn - Function to retry
 * @param maxAttempts - Maximum number of attempts
 * @param delayMs - Delay between attempts in milliseconds
 */
export async function retryWithDelay<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> {
  return retryWithBackoff(fn, {
    maxAttempts,
    initialDelayMs: delayMs,
    backoffMultiplier: 1,
  });
}

