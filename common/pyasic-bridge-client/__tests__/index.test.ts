import {
  getMinerDataMinerIpDataGet,
  healthCheckHealthGet,
  rootGet,
  scanMinersScanPost,
  updateMinerConfigMinerIpConfigPatch,
  validateMinersMinersValidatePost,
  type HealthResponse,
  type RootResponse,
  type ScanRequest,
  type ValidateRequest,
} from "../src";

describe("pyasic-bridge client SDK surface", () => {
  it("exports healthCheckHealthGet and HealthResponse type", () => {
    // We don't actually call the endpoint here (no network in unit tests),
    // but this ensures the generated SDK exports compile and are usable.
    expect(typeof healthCheckHealthGet).toBe("function");

    // Simple type-level smoke check via a dummy function signature.
    // This will fail to compile if HealthResponse is not a valid type export.
    const acceptHealthResponse = (res: HealthResponse) => res;
    expect(typeof acceptHealthResponse).toBe("function");
  });

  it("can call healthCheckHealthGet with a mocked fetch", async () => {
    const mockResponseBody: HealthResponse = { status: "healthy" };

    const mockFetch = jest.fn(async () => {
      return new Response(JSON.stringify(mockResponseBody), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    const result = await healthCheckHealthGet({
      fetch: mockFetch,
      baseUrl: "http://example.test",
      responseStyle: "data",
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockResponseBody);
  });

  it("can call rootGet with a mocked fetch", async () => {
    const mockResponseBody: RootResponse = {
      service: "pyasic-bridge",
      version: "1.0.0",
      docs: "/docs",
      health: "/health",
    };

    const mockFetch = jest.fn(async () => {
      return new Response(JSON.stringify(mockResponseBody), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    const result = await rootGet({
      fetch: mockFetch,
      baseUrl: "http://example.test",
      responseStyle: "data",
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockResponseBody);
  });

  it("builds correct URL and body for scanMinersScanPost", async () => {
    const mockResponseBody: Array<unknown> = [];

    const mockFetch = jest.fn(async (request: Request) => {
      expect(request.url).toBe("http://example.test/scan");
      expect(request.method).toBe("POST");

      const bodyText = await request.text();
      const body: ScanRequest = JSON.parse(bodyText);
      expect(body).toEqual({ ip: "192.168.0.10" });

      return new Response(JSON.stringify(mockResponseBody), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    const result = await scanMinersScanPost({
      fetch: mockFetch,
      baseUrl: "http://example.test",
      body: { ip: "192.168.0.10" },
      responseStyle: "data",
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockResponseBody);
  });

  it("substitutes path params for getMinerDataMinerIpDataGet", async () => {
    const ip = "10.0.0.42";

    const mockFetch = jest.fn(async (request: Request) => {
      expect(request.url).toBe(`http://example.test/miner/${ip}/data`);
      expect(request.method).toBe("GET");

      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    await getMinerDataMinerIpDataGet({
      fetch: mockFetch,
      baseUrl: "http://example.test",
      path: { ip },
      responseStyle: "data",
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("returns undefined data when fetch rejects and responseStyle is 'data'", async () => {
    const mockFetch = jest.fn(async () => {
      throw new Error("network error");
    }) as typeof fetch;

    const result = await healthCheckHealthGet({
      fetch: mockFetch,
      baseUrl: "http://example.test",
      responseStyle: "data",
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result).toBeUndefined();
  });

  it("throws when server returns non-2xx and throwOnError is true", async () => {
    const mockFetch = jest.fn(async () =>
      new Response("Boom", {
        status: 500,
        headers: { "Content-Type": "text/plain" },
      }),
    ) as typeof fetch;

    await expect(
      rootGet({
        fetch: mockFetch,
        baseUrl: "http://example.test",
        throwOnError: true,
      }),
    ).rejects.toBeDefined();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("can call validateMinersMinersValidatePost with ips array", async () => {
    const mockResponseBody: Array<unknown> = [];

    const mockFetch = jest.fn(async (request: Request) => {
      expect(request.url).toBe("http://example.test/miners/validate");
      expect(request.method).toBe("POST");

      const bodyText = await request.text();
      const body: ValidateRequest = JSON.parse(bodyText);
      expect(body).toEqual({ ips: ["192.168.0.10", "192.168.0.11"] });

      return new Response(JSON.stringify(mockResponseBody), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    const result = await validateMinersMinersValidatePost({
      fetch: mockFetch,
      baseUrl: "http://example.test",
      body: { ips: ["192.168.0.10", "192.168.0.11"] },
      responseStyle: "data",
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockResponseBody);
  });

  it("returns full response structure when responseStyle is 'fields'", async () => {
    const mockResponseBody: HealthResponse = { status: "healthy" };

    const mockFetch = jest.fn(async () => {
      return new Response(JSON.stringify(mockResponseBody), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    const result = await healthCheckHealthGet({
      fetch: mockFetch,
      baseUrl: "http://example.test",
      responseStyle: "fields",
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("request");
    expect(result).toHaveProperty("response");
    expect(result.data).toEqual(mockResponseBody);
  });

  it("returns error structure when throwOnError is false and server returns error", async () => {
    const mockFetch = jest.fn(async () =>
      new Response(JSON.stringify({ detail: [] }), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      }),
    ) as typeof fetch;

    const result = await validateMinersMinersValidatePost({
      fetch: mockFetch,
      baseUrl: "http://example.test",
      body: { ips: [] },
      responseStyle: "fields",
      throwOnError: false,
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result).toHaveProperty("error");
    expect(result).toHaveProperty("request");
    expect(result).toHaveProperty("response");
    expect(result.error).toBeDefined();
    expect(result.error).toHaveProperty("detail");
  });

  it("can call updateMinerConfigMinerIpConfigPatch with PATCH method", async () => {
    const ip = "10.0.0.42";
    const mockResponseBody = { status: "success" };

    const mockFetch = jest.fn(async (request: Request) => {
      expect(request.url).toBe(`http://example.test/miner/${ip}/config`);
      expect(request.method).toBe("PATCH");

      return new Response(JSON.stringify(mockResponseBody), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    const result = await updateMinerConfigMinerIpConfigPatch({
      fetch: mockFetch,
      baseUrl: "http://example.test",
      path: { ip },
      body: {},
      responseStyle: "data",
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockResponseBody);
  });

  it("passes custom headers through to the request", async () => {
    const mockFetch = jest.fn(async (request: Request) => {
      expect(request.headers.get("X-Custom-Header")).toBe("custom-value");
      return new Response(JSON.stringify({ status: "healthy" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    await healthCheckHealthGet({
      fetch: mockFetch,
      baseUrl: "http://example.test",
      headers: { "X-Custom-Header": "custom-value" },
      responseStyle: "data",
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

