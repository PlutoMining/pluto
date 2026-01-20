describe("arpScanWrapper", () => {
  const originalConsoleError = console.error;

  const loadArpScanWrapper = async () => {
    const execPromise = jest.fn();

    jest.doMock("child_process", () => ({
      exec: jest.fn(),
    }));

    jest.doMock("util", () => ({
      promisify: () => execPromise,
    }));

    const mod = await import("@/services/arpScanWrapper");
    return { ...mod, execPromise };
  };

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  describe("arpScan", () => {
    it("parses arp-scan output", async () => {
      const { arpScan, execPromise } = await loadArpScanWrapper();

      execPromise.mockResolvedValue({
        stdout: [
          "Interface: eth0, datalink type: EN10MB (Ethernet)",
          "Starting arp-scan",
          "192.168.0.2\t00:11:22:33:44:55\tSome Vendor",
          "not a match",
          "10.0.0.1\taa:bb:cc:dd:ee:ff\tminer",
          "",
        ].join("\n"),
        stderr: "",
      });

      await expect(arpScan("eth0")).resolves.toEqual([
        { ip: "192.168.0.2", mac: "00:11:22:33:44:55", type: "Some Vendor" },
        { ip: "10.0.0.1", mac: "aa:bb:cc:dd:ee:ff", type: "miner" },
      ]);
    });

    it("throws when stderr is returned", async () => {
      const { arpScan, execPromise } = await loadArpScanWrapper();
      execPromise.mockResolvedValue({ stdout: "", stderr: "no perms" });

      await expect(arpScan("eth0")).rejects.toThrow("no perms");
    });

    it("throws when exec fails", async () => {
      const { arpScan, execPromise } = await loadArpScanWrapper();
      execPromise.mockRejectedValue(new Error("boom"));

      await expect(arpScan("eth0")).rejects.toThrow("boom");
    });
  });

  describe("getActiveNetworkInterfaces", () => {
    it("parses interface output", async () => {
      const { getActiveNetworkInterfaces, execPromise } = await loadArpScanWrapper();
      execPromise.mockResolvedValue({ stdout: "eth0\nwlan0\n\n", stderr: "" });

      await expect(getActiveNetworkInterfaces()).resolves.toEqual(["eth0", "wlan0"]);
    });

    it("throws when stderr is returned", async () => {
      const { getActiveNetworkInterfaces, execPromise } = await loadArpScanWrapper();
      execPromise.mockResolvedValue({ stdout: "", stderr: "no perms" });

      await expect(getActiveNetworkInterfaces()).rejects.toThrow("no perms");
    });

    it("throws when exec fails", async () => {
      const { getActiveNetworkInterfaces, execPromise } = await loadArpScanWrapper();
      execPromise.mockRejectedValue(new Error("boom"));

      await expect(getActiveNetworkInterfaces()).rejects.toThrow("boom");
    });
  });
});
