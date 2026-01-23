describe("backend config/environment", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("uses default port when PORT is not set", async () => {
    delete process.env.PORT;
    process.env.DISCOVERY_SERVICE_HOST = "http://discovery.test";

    const { config } = await import("../../config/environment");
    expect(config.port).toBe(3000);
  });

  it("reads port from PORT", async () => {
    process.env.PORT = "1234";
    process.env.DISCOVERY_SERVICE_HOST = "http://discovery.test";

    const { config } = await import("../../config/environment");
    expect(config.port).toBe(1234);
  });

  it("uses default Prometheus host when PROMETHEUS_HOST is not set", async () => {
    delete process.env.PROMETHEUS_HOST;
    process.env.DISCOVERY_SERVICE_HOST = "http://discovery.test";

    const { config } = await import("../../config/environment");
    expect(config.prometheusHost).toBe("http://prometheus:9090");
  });

  it("reads Prometheus host from PROMETHEUS_HOST", async () => {
    process.env.PROMETHEUS_HOST = "http://prom.example";
    process.env.DISCOVERY_SERVICE_HOST = "http://discovery.test";

    const { config } = await import("../../config/environment");
    expect(config.prometheusHost).toBe("http://prom.example");
  });

  it("parses boolean flags", async () => {
    process.env.DISCOVERY_SERVICE_HOST = "http://discovery.test";
    process.env.AUTO_LISTEN = "true";
    process.env.DELETE_DATA_ON_DEVICE_REMOVE = "true";

    const { config } = await import("../../config/environment");
    expect(config.autoListen).toBe(true);
    expect(config.deleteDataOnDeviceRemove).toBe(true);
  });

  it("throws when DISCOVERY_SERVICE_HOST is missing", async () => {
    delete process.env.DISCOVERY_SERVICE_HOST;

    await expect(import("../../config/environment")).rejects.toThrow("DISCOVERY_SERVICE_HOST");
  });

  it("throws when PORT is not a number", async () => {
    process.env.PORT = "not-a-number";
    process.env.DISCOVERY_SERVICE_HOST = "http://discovery.test";

    await expect(import("../../config/environment")).rejects.toThrow("Invalid number for PORT");
  });
});
