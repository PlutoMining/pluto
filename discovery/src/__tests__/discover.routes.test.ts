// Set required environment variables before importing modules that depend on config
process.env.MOCK_DISCOVERY_HOST = "http://mock-discovery";
process.env.PYASIC_BRIDGE_HOST = "http://pyasic-bridge:8000";

import routes from "@/routes/discover.routes";

describe("discover.routes", () => {
  it("mounts GET /discover", () => {
    const layer = (routes as any).stack.find((l: any) => l.route?.path === "/discover");
    expect(layer).toBeTruthy();
    expect(layer.route.methods).toMatchObject({ get: true });
  });

  it("mounts GET /discovered", () => {
    const layer = (routes as any).stack.find((l: any) => l.route?.path === "/discovered");
    expect(layer).toBeTruthy();
    expect(layer.route.methods).toMatchObject({ get: true });
  });
});
