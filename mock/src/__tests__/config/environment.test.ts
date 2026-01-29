describe("mock config/environment", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("parses ports and flags from env", async () => {
    process.env.LISTING_PORT = "7000";
    process.env.PORTS = "9001,9002";
    process.env.LOGS_PUB_ENABLED = "true";

    const { config } = await import("../../config/environment");

    expect(config.listingPort).toBe(7000);
    expect(config.ports).toEqual([9001, 9002]);
    expect(config.logsPubEnabled).toBe(true);
  });

  it("treats LOGS_PUB_ENABLED other than 'true' as false", async () => {
    process.env.LISTING_PORT = "7000";
    process.env.PORTS = "9001";
    process.env.LOGS_PUB_ENABLED = "false";

    const { config } = await import("../../config/environment");
    expect(config.logsPubEnabled).toBe(false);
  });
});
