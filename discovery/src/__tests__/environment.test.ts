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

    process.env.MOCK_DISCOVERY_HOST = "http://mock";

    const { config } = await import("@/config/environment");

    expect(config.port).toBe(3000);
    expect(config.detectMockDevices).toBe(false);
    expect(config.mockDeviceHost).toBe("localhost");
    expect(config.mockDiscoveryHost).toBe("http://mock");
  });

  it("reads env vars", async () => {
    process.env.PORT = "1234";
    process.env.DETECT_MOCK_DEVICES = "true";
    process.env.MOCK_DEVICE_HOST = "device-host";
    process.env.MOCK_DISCOVERY_HOST = "http://mock";

    const { config } = await import("@/config/environment");

    expect(config.port).toBe(1234);
    expect(config.detectMockDevices).toBe(true);
    expect(config.mockDeviceHost).toBe("device-host");
    expect(config.mockDiscoveryHost).toBe("http://mock");
  });
});
