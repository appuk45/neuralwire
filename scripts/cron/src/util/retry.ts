export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  shouldRetry?: (e: unknown) => boolean;
  onRetry?: (attempt: number, error: unknown, nextDelayMs: number) => void;
}

function defaultShouldRetry(e: unknown): boolean {
  const obj = e as { status?: number; code?: number } | null;
  const code = obj?.status ?? obj?.code;
  if (typeof code !== 'number') return true;
  if (code === 429) return true;
  if (code >= 500 && code < 600) return true;
  return false;
}

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 1000;
  const shouldRetry = opts.shouldRetry ?? defaultShouldRetry;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (attempt === maxAttempts || !shouldRetry(e)) throw e;
      const delay = baseDelayMs * 2 ** (attempt - 1);
      opts.onRetry?.(attempt, e, delay);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}
