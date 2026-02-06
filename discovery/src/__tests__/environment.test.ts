describe("config/environment", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("uses defaults when env vars are missing", async () => {
    delete process.env.PORT;
    delete process.env.DETECT_MOCK_DEVICES;
    delete process.env.MOCK_DEVICE_HOST;
    delete process.env.PYASIC_VALIDATION_BATCH_SIZE;
    delete process.env.PYASIC_VALIDATION_CONCURRENCY;
    delete process.env.PYASIC_VALIDATION_TIMEOUT;

    process.env.MOCK_DISCOVERY_HOST = "http://mock";
    process.env.PYASIC_BRIDGE_HOST = "http://pyasic-bridge:8000";

    const { config } = await import("@/config/environment");

    expect(config.port).toBe(3000);
    expect(config.detectMockDevices).toBe(false);
    expect(config.mockDeviceHost).toBeUndefined();
    expect(config.mockDiscoveryHost).toBe("http://mock");
    expect(config.pyasicBridgeHost).toBe("http://pyasic-bridge:8000");
    expect(config.pyasicValidationBatchSize).toBe(10);
    expect(config.pyasicValidationConcurrency).toBe(3);
    expect(config.pyasicValidationTimeout).toBe(3000);
  });

  it("reads env vars", async () => {
    process.env.PORT = "1234";
    process.env.DETECT_MOCK_DEVICES = "true";
    process.env.MOCK_DEVICE_HOST = "device-host";
    process.env.MOCK_DISCOVERY_HOST = "http://mock";
    process.env.PYASIC_BRIDGE_HOST = "http://pyasic-bridge:9000";
    process.env.PYASIC_VALIDATION_BATCH_SIZE = "20";
    process.env.PYASIC_VALIDATION_CONCURRENCY = "5";
    process.env.PYASIC_VALIDATION_TIMEOUT = "5000";

    const { config } = await import("@/config/environment");

    expect(config.port).toBe(1234);
    expect(config.detectMockDevices).toBe(true);
    expect(config.mockDeviceHost).toBe("device-host");
    expect(config.mockDiscoveryHost).toBe("http://mock");
    expect(config.pyasicBridgeHost).toBe("http://pyasic-bridge:9000");
    expect(config.pyasicValidationBatchSize).toBe(20);
    expect(config.pyasicValidationConcurrency).toBe(5);
    expect(config.pyasicValidationTimeout).toBe(5000);
  });

  it("throws when MOCK_DISCOVERY_HOST is missing", async () => {
    delete process.env.MOCK_DISCOVERY_HOST;

    await expect(import("@/config/environment")).rejects.toThrow("MOCK_DISCOVERY_HOST");
  });

  it("throws when PORT is not a number", async () => {
    process.env.PORT = "not-a-number";
    process.env.MOCK_DISCOVERY_HOST = "http://mock";
    process.env.PYASIC_BRIDGE_HOST = "http://pyasic-bridge:8000";

    await expect(import("@/config/environment")).rejects.toThrow("Invalid number for PORT");
  });

  it("throws when PYASIC_BRIDGE_HOST is missing", async () => {
    delete process.env.PYASIC_BRIDGE_HOST;
    process.env.MOCK_DISCOVERY_HOST = "http://mock";

    await expect(import("@/config/environment")).rejects.toThrow("PYASIC_BRIDGE_HOST");
  });
});
