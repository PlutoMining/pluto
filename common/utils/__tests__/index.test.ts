import { asyncForEach, delay, sanitizeHostname, validateTCPPort } from "../index";

describe("index", () => {
  it("re-exports utilities", async () => {
    expect(sanitizeHostname("my-host.name")).toBe("my__host__name");
    expect(validateTCPPort(3000)).toBe(true);

    const values: number[] = [];
    await asyncForEach([1, 2], async (value) => {
      values.push(value);
    });
    expect(values).toEqual([1, 2]);

    jest.useFakeTimers();
    const p = delay(1);
    jest.advanceTimersByTime(1);
    await p;
    jest.useRealTimers();
  });
});
