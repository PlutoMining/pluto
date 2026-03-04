import { logger } from "@pluto/logger";

export interface RetryOptions {
  retries?: number;
  delayMs?: number;
  label?: string;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {}
): Promise<T> {
  const { retries = 1, delayMs = 500, label = "operation" } = opts;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        logger.debug(`${label} failed (attempt ${attempt + 1}/${retries + 1}), retrying in ${delayMs}ms`);
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
  throw lastError;
}
