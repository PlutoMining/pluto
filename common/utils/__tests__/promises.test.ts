import { delay } from "../promises";

describe("promises", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("resolves after the specified delay", async () => {
    const done = jest.fn();
    const promise = delay(50).then(done);

    jest.advanceTimersByTime(49);
    await Promise.resolve();
    expect(done).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    await promise;
    expect(done).toHaveBeenCalledTimes(1);
  });
});
