export interface WithRetryOptions {
  retries: number;
  backoffMs: number;
}

export async function withRetry<T>(fn: () => Promise<T>, options: WithRetryOptions): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= options.retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < options.retries) {
        await new Promise((resolve) => setTimeout(resolve, options.backoffMs));
      }
    }
  }

  throw lastError;
}
