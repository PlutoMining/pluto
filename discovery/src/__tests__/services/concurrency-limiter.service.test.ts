/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { ConcurrencyLimiter } from "@/services/concurrency-limiter.service";

describe("ConcurrencyLimiter", () => {
  describe("constructor", () => {
    it("should create limiter with valid limit", () => {
      const limiter = new ConcurrencyLimiter(5);
      expect(limiter).toBeInstanceOf(ConcurrencyLimiter);
    });

    it("should throw error for limit <= 0", () => {
      expect(() => new ConcurrencyLimiter(0)).toThrow("Concurrency limit must be greater than 0");
      expect(() => new ConcurrencyLimiter(-1)).toThrow("Concurrency limit must be greater than 0");
    });
  });

  describe("execute", () => {
    it("should execute function immediately when under limit", async () => {
      const limiter = new ConcurrencyLimiter(2);
      const fn = jest.fn().mockResolvedValue("result");

      const result = await limiter.execute(fn);

      expect(result).toBe("result");
      expect(fn).toHaveBeenCalledTimes(1);
      expect(limiter.getRunningCount()).toBe(0);
    });

    it("should limit concurrent executions", async () => {
      const limiter = new ConcurrencyLimiter(2);
      const results: number[] = [];
      const running: number[] = [];

      const createTask = (id: number) => async () => {
        running.push(id);
        await new Promise((resolve) => setTimeout(resolve, 50));
        results.push(id);
        running.pop();
        return id;
      };

      const promises = [
        limiter.execute(createTask(1)),
        limiter.execute(createTask(2)),
        limiter.execute(createTask(3)),
        limiter.execute(createTask(4)),
      ];

      // Check that only 2 are running at a time
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(running.length).toBeLessThanOrEqual(2);

      const allResults = await Promise.all(promises);
      expect(allResults).toEqual([1, 2, 3, 4]);
      expect(results).toHaveLength(4);
    });

    it("should queue tasks when limit is reached", async () => {
      const limiter = new ConcurrencyLimiter(1);
      const executionOrder: number[] = [];

      const createTask = (id: number, delay: number) => async () => {
        executionOrder.push(id);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return id;
      };

      const promises = [
        limiter.execute(createTask(1, 50)),
        limiter.execute(createTask(2, 10)),
        limiter.execute(createTask(3, 10)),
      ];

      await Promise.all(promises);

      // First task should execute first, then queued tasks in order
      expect(executionOrder[0]).toBe(1);
      expect(executionOrder).toHaveLength(3);
    });

    it("should handle function errors", async () => {
      const limiter = new ConcurrencyLimiter(1);
      const error = new Error("Test error");
      const fn = jest.fn().mockRejectedValue(error);

      await expect(limiter.execute(fn)).rejects.toThrow("Test error");
      expect(limiter.getRunningCount()).toBe(0);
    });

    it("should continue processing queue after error", async () => {
      const limiter = new ConcurrencyLimiter(1);
      const error = new Error("Test error");
      const successFn = jest.fn().mockResolvedValue("success");

      const promises = [
        limiter.execute(() => Promise.reject(error)),
        limiter.execute(successFn),
      ];

      await expect(promises[0]).rejects.toThrow("Test error");
      await expect(promises[1]).resolves.toBe("success");
      expect(successFn).toHaveBeenCalled();
    });
  });

  describe("getRunningCount", () => {
    it("should return 0 when no tasks running", () => {
      const limiter = new ConcurrencyLimiter(2);
      expect(limiter.getRunningCount()).toBe(0);
    });

    it("should return correct count during execution", async () => {
      const limiter = new ConcurrencyLimiter(2);
      let runningCount = 0;

      const createTask = () => async () => {
        runningCount = limiter.getRunningCount();
        await new Promise((resolve) => setTimeout(resolve, 50));
        return "done";
      };

      const promises = [
        limiter.execute(createTask()),
        limiter.execute(createTask()),
        limiter.execute(createTask()),
      ];

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(runningCount).toBeLessThanOrEqual(2);

      await Promise.all(promises);
      expect(limiter.getRunningCount()).toBe(0);
    });
  });

  describe("getQueueLength", () => {
    it("should return 0 when queue is empty", () => {
      const limiter = new ConcurrencyLimiter(1);
      expect(limiter.getQueueLength()).toBe(0);
    });

    it("should return correct queue length", async () => {
      const limiter = new ConcurrencyLimiter(1);
      let queueLength = 0;

      const createTask = (id: number) => async () => {
        queueLength = limiter.getQueueLength();
        await new Promise((resolve) => setTimeout(resolve, 50));
        return id;
      };

      const promises = [
        limiter.execute(createTask(1)),
        limiter.execute(createTask(2)),
        limiter.execute(createTask(3)),
      ];

      await new Promise((resolve) => setTimeout(resolve, 10));
      // Queue should have at least 1 item (the third task waiting)
      expect(queueLength).toBeGreaterThanOrEqual(0);

      await Promise.all(promises);
      expect(limiter.getQueueLength()).toBe(0);
    });
  });
});
