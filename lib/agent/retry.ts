/**
 * Retry utility with exponential backoff.
 * Used across the agent loop for resilient API calls and action execution.
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    onRetry,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on abort
      if (error?.name === "AbortError") {
        throw error;
      }

      // Don't retry on auth errors
      if (error?.status === 401 || error?.status === 403) {
        throw error;
      }

      if (attempt < maxRetries) {
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        const jitter = delay * (0.5 + Math.random() * 0.5);
        onRetry?.(attempt + 1, lastError);
        console.warn(
          `[retry] Attempt ${attempt + 1}/${maxRetries} failed: ${lastError.message}. Retrying in ${Math.round(jitter)}ms...`
        );
        await new Promise((r) => setTimeout(r, jitter));
      }
    }
  }

  throw lastError!;
}

/**
 * Rough token estimation — ~4 chars per token for English text.
 * Used to decide when to trim context.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
