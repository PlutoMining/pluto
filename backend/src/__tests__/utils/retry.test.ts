import { withRetry } from "@/utils/retry";

jest.mock("@pluto/logger", () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe("withRetry", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("succeeds on first attempt", async () => {
    const fn = jest.fn().mockResolvedValue("success");
    const promise = withRetry(fn);
    await expect(promise).resolves.toBe("success");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on failure and succeeds on second attempt", async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValueOnce("success");
    const promise = withRetry(fn, { retries: 1, delayMs: 500 });
    await jest.runAllTimersAsync();
    const result = await promise;
    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws last error after all retries exhausted", async () => {
    jest.useRealTimers();
    const err = new Error("final failure");
    const fn = jest.fn().mockRejectedValue(err);
    await expect(withRetry(fn, { retries: 2, delayMs: 10 })).rejects.toThrow(
      "final failure"
    );
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("uses default options (retries=1, delayMs=500)", async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValueOnce("ok");
    const promise = withRetry(fn);
    await jest.runAllTimersAsync();
    const result = await promise;
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("respects custom retries count", async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error("1"))
      .mockRejectedValueOnce(new Error("2"))
      .mockResolvedValueOnce("ok");
    const promise = withRetry(fn, { retries: 2, delayMs: 100 });
    await jest.runAllTimersAsync();
    const result = await promise;
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("logs debug message on retry", async () => {
    const { logger } = jest.requireMock("@pluto/logger");
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValueOnce("ok");
    const promise = withRetry(fn, { retries: 1, delayMs: 500, label: "test-op" });
    await jest.runAllTimersAsync();
    await promise;
    expect(logger.debug).toHaveBeenCalledWith(
      "test-op failed (attempt 1/2), retrying in 500ms"
    );
  });
});
