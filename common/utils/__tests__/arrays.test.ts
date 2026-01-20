import { asyncForEach } from "../arrays";

describe("arrays", () => {
  it("iterates sequentially with index and items", async () => {
    const seen: Array<{ value: number; index: number; total: number }> = [];
    const items = [1, 2, 3];

    await asyncForEach(items, async (value, index, all) => {
      await Promise.resolve();
      seen.push({ value, index, total: all.length });
    });

    expect(seen).toEqual([
      { value: 1, index: 0, total: 3 },
      { value: 2, index: 1, total: 3 },
      { value: 3, index: 2, total: 3 },
    ]);
  });
});
