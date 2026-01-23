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
