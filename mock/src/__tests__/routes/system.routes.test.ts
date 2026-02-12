import routes from "@/routes/system.routes";

describe("system.routes", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      LISTING_PORT: "7000",
      PORTS: "9001",
      LOGS_PUB_ENABLED: "false",
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("mounts /api/system/info", () => {
    const layer = (routes as any).stack.find((l: any) => l.route?.path === "/api/system/info");
    expect(layer).toBeTruthy();
    expect(layer.route.methods).toMatchObject({ get: true });
  });

  it("mounts /api/system", () => {
    const layer = (routes as any).stack.find((l: any) => l.route?.path === "/api/system");
    expect(layer).toBeTruthy();
    expect(layer.route.methods).toMatchObject({ patch: true });
  });

  it("mounts /api/system/restart", () => {
    const layer = (routes as any).stack.find((l: any) => l.route?.path === "/api/system/restart");
    expect(layer).toBeTruthy();
    expect(layer.route.methods).toMatchObject({ post: true });
  });
});
