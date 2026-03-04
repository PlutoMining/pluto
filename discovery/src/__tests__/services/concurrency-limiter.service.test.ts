import { ConcurrencyLimiter } from '@/services/concurrency-limiter.service';

describe('ConcurrencyLimiter', () => {
  it('throws when created with non-positive limit', () => {
    expect(() => new ConcurrencyLimiter(0)).toThrow('Concurrency limit must be greater than 0');
    expect(() => new ConcurrencyLimiter(-1)).toThrow('Concurrency limit must be greater than 0');
  });

  it('runs tasks immediately when under limit', async () => {
    const limiter = new ConcurrencyLimiter(2);
    const fn = jest.fn().mockResolvedValue(42);

    const result = await limiter.execute(fn);

    expect(result).toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(limiter.getRunningCount()).toBe(0);
    expect(limiter.getQueueLength()).toBe(0);
  });

  it('queues tasks when at limit and runs them in order', async () => {
    const limiter = new ConcurrencyLimiter(1);
    const order: number[] = [];

    const makeTask = (id: number, delay: number) => async () => {
      order.push(id);
      await new Promise((resolve) => setTimeout(resolve, delay));
      order.push(id + 10); // mark completion
      return id;
    };

    const p1 = limiter.execute(makeTask(1, 10));
    const p2 = limiter.execute(makeTask(2, 0));

    // While first task is running, second should be queued
    expect(limiter.getRunningCount()).toBe(1);
    expect(limiter.getQueueLength()).toBe(1);

    const [r1, r2] = await Promise.all([p1, p2]);

    expect(r1).toBe(1);
    expect(r2).toBe(2);
    expect(order).toEqual([1, 11, 2, 12]);
    expect(limiter.getRunningCount()).toBe(0);
    expect(limiter.getQueueLength()).toBe(0);
  });

  it('propagates errors from the wrapped function', async () => {
    const limiter = new ConcurrencyLimiter(1);
    const error = new Error('boom');

    await expect(
      limiter.execute(async () => {
        throw error;
      }),
    ).rejects.toBe(error);

    expect(limiter.getRunningCount()).toBe(0);
    expect(limiter.getQueueLength()).toBe(0);
  });
});

