export type BackoffOptions = {
  baseDelayMs?: number;
  factor?: number;
  maxAttempts?: number;
};

export function backoffDelay(attempt: number, opts: BackoffOptions = {}): number {
  const { baseDelayMs = 3000, factor = 2 } = opts;
  return baseDelayMs * Math.pow(factor, Math.max(0, attempt - 1));
}

export async function retryWithBackoff<T>(
  fn: (attempt: number) => Promise<T>,
  opts: BackoffOptions = {},
  signal?: AbortSignal,
): Promise<T> {
  const { maxAttempts = 5 } = opts;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      if (attempt === maxAttempts) break;
      await sleep(backoffDelay(attempt, opts), signal);
    }
  }
  throw lastError;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new DOMException('Aborted', 'AbortError'));
    }, { once: true });
  });
}
