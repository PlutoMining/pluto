/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

/**
 * Simple concurrency limiter using semaphore pattern.
 * 
 * Limits the number of concurrent async operations to prevent overwhelming
 * resources or external services.
 */
export class ConcurrencyLimiter {
  private running = 0;
  private queue: Array<() => void> = [];

  constructor(private limit: number) {
    if (limit <= 0) {
      throw new Error("Concurrency limit must be greater than 0");
    }
  }

  /**
   * Execute an async function with concurrency limiting.
   * 
   * @param fn - The async function to execute
   * @returns Promise that resolves with the function's result
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const run = async () => {
        this.running++;
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.running--;
          if (this.queue.length > 0) {
            const next = this.queue.shift()!;
            next();
          }
        }
      };

      if (this.running < this.limit) {
        run();
      } else {
        this.queue.push(run);
      }
    });
  }

  /**
   * Get the current number of running operations.
   */
  getRunningCount(): number {
    return this.running;
  }

  /**
   * Get the current number of queued operations.
   */
  getQueueLength(): number {
    return this.queue.length;
  }
}
