describe("mockWorker.js", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("registers ts-node and loads mockWorker.ts", async () => {
    const register = jest.fn();
    jest.doMock("ts-node", () => ({
      register,
    }));

    const resolve = jest.fn((_dir: string, _file: string) => "/virtual/mockWorker.ts");
    jest.doMock("path", () => ({
      resolve,
    }));

    jest.doMock("/virtual/mockWorker.ts", () => ({}), { virtual: true });

    await import("../mockWorker.js");

    expect(register).toHaveBeenCalledTimes(1);
    expect(resolve).toHaveBeenCalledWith(expect.any(String), "./mockWorker.ts");
  });
});
