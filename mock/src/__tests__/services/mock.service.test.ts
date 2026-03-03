describe("mock.service", () => {
  const originalRandom = Math.random;

  afterEach(() => {
    Math.random = originalRandom;
  });

  it("generates fake logs", async () => {
    Math.random = () => 0;
    const { generateFakeLog } = await import("../../services/mock.service");
    expect(generateFakeLog()).toBe("System started");
  });

  it("generates last fake log entry", async () => {
    Math.random = () => 0.99;
    const { generateFakeLog } = await import("../../services/mock.service");
    expect(generateFakeLog()).toBe("Fan is operating within limits");
  });
});
