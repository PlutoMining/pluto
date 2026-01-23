describe("arpScanWrapper", () => {
  const originalConsoleError = console.error;
  const originalEnv = process.env;

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
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    console.error = originalConsoleError;
    process.env = originalEnv;
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

      expect(execPromise).toHaveBeenCalledWith(
        "arp-scan --interface=eth0 --localnet --retry=3 --timeout=2000 --ignoredups"
      );
    });

    it("includes configured retry/timeout args", async () => {
      const { arpScan, execPromise } = await loadArpScanWrapper();

      process.env.ARP_SCAN_RETRY = "5";
      process.env.ARP_SCAN_TIMEOUT_MS = "1500";
      process.env.ARP_SCAN_IGNORE_DUPS = "false";

      execPromise.mockResolvedValue({ stdout: "", stderr: "" });

      await expect(arpScan("eth0")).resolves.toEqual([]);
      expect(execPromise).toHaveBeenCalledWith(
        "arp-scan --interface=eth0 --localnet --retry=5 --timeout=1500"
      );
    });

    it("rejects invalid interface name", async () => {
      const { arpScan } = await loadArpScanWrapper();

      await expect(arpScan("eth0;rm -rf /")).rejects.toThrow("Invalid network interface name");
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

    it("returns configured interface list when set", async () => {
      const { getActiveNetworkInterfaces, execPromise } = await loadArpScanWrapper();

      process.env.ARP_SCAN_INTERFACES = " eth0 , wlan0 ";

      await expect(getActiveNetworkInterfaces()).resolves.toEqual(["eth0", "wlan0"]);
      expect(execPromise).not.toHaveBeenCalled();
    });

    it("rejects invalid configured interface list", async () => {
      const { getActiveNetworkInterfaces } = await loadArpScanWrapper();

      process.env.ARP_SCAN_INTERFACES = "eth0,;rm -rf /";

      await expect(getActiveNetworkInterfaces()).rejects.toThrow("Invalid network interface name");
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
