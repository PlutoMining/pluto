import { MinerDriverFactory } from "@/drivers/miner-driver.factory";
import type { IMinerDriver } from "@/drivers/miner-driver.interface";

jest.mock("@pluto/logger", () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

class MockDriverA implements IMinerDriver {
  readonly driverName = "mock-a";
  readonly supportLevel = "native" as const;
  detect = jest.fn();
  fetchData = jest.fn();
  getConfig = jest.fn();
  updateConfig = jest.fn();
  validateConfig = jest.fn();
  restart = jest.fn();
  getConfigSchema = jest.fn();
  getEditableValues = jest.fn();
}

class MockDriverB implements IMinerDriver {
  readonly driverName = "mock-b";
  readonly supportLevel = "native" as const;
  detect = jest.fn();
  fetchData = jest.fn();
  getConfig = jest.fn();
  updateConfig = jest.fn();
  validateConfig = jest.fn();
  restart = jest.fn();
  getConfigSchema = jest.fn();
  getEditableValues = jest.fn();
}

class MockFallbackDriver implements IMinerDriver {
  readonly driverName = "fallback";
  readonly supportLevel = "generic" as const;
  detect = jest.fn();
  fetchData = jest.fn();
  getConfig = jest.fn();
  updateConfig = jest.fn();
  validateConfig = jest.fn();
  restart = jest.fn();
  getConfigSchema = jest.fn();
  getEditableValues = jest.fn();
}

describe("MinerDriverFactory", () => {
  let factory: MinerDriverFactory;

  beforeEach(() => {
    factory = new MinerDriverFactory();
  });

  describe("register + getDriver", () => {
    it("returns correct driver for registered pattern", () => {
      factory.register("bitaxe", MockDriverA);
      const driver = factory.getDriver("bitaxe");
      expect(driver).toBeInstanceOf(MockDriverA);
      expect(driver.driverName).toBe("mock-a");
    });
  });

  describe("resolveKey uses startsWith (not includes)", () => {
    it("matches when type starts with pattern", () => {
      factory.register("bitaxe", MockDriverA);
      factory.setFallback(MockFallbackDriver);
      const driver = factory.getDriver("bitaxe max");
      expect(driver).toBeInstanceOf(MockDriverA);
    });

    it("does not match when type includes but does not start with pattern", () => {
      factory.register("bitaxe", MockDriverA);
      factory.setFallback(MockFallbackDriver);
      const driver = factory.getDriver("my-bitaxe-miner");
      expect(driver).toBeInstanceOf(MockFallbackDriver);
    });

    it("pattern matching is case-insensitive", () => {
      factory.register("bitaxe", MockDriverA);
      const driver = factory.getDriver("Bitaxe Max");
      expect(driver).toBeInstanceOf(MockDriverA);
    });
  });

  describe("getDriverForDevice", () => {
    it("with MAC override returns override driver", () => {
      factory.register("bitaxe", MockDriverA);
      factory.registerMacOverride("aa:bb:cc", MockDriverB);
      factory.setFallback(MockFallbackDriver);
      const driver = factory.getDriverForDevice("unknown-type", "aa:bb:cc:dd:ee:ff");
      expect(driver).toBeInstanceOf(MockDriverB);
    });

    it("without MAC match falls back to type pattern", () => {
      factory.register("bitaxe", MockDriverA);
      factory.registerMacOverride("aa:bb:cc", MockDriverB);
      factory.setFallback(MockFallbackDriver);
      const driver = factory.getDriverForDevice("bitaxe", "ff:ee:dd:cc:bb:aa");
      expect(driver).toBeInstanceOf(MockDriverA);
    });

    it("without MAC falls back to type pattern", () => {
      factory.register("bitaxe", MockDriverA);
      factory.setFallback(MockFallbackDriver);
      const driver = factory.getDriverForDevice("bitaxe");
      expect(driver).toBeInstanceOf(MockDriverA);
    });
  });

  describe("getDriver fallback", () => {
    it("falls back to fallback driver when no type match", () => {
      factory.register("bitaxe", MockDriverA);
      factory.setFallback(MockFallbackDriver);
      const driver = factory.getDriver("unknown-miner-type");
      expect(driver).toBeInstanceOf(MockFallbackDriver);
    });

    it("throws when no fallback registered", () => {
      factory.register("bitaxe", MockDriverA);
      expect(() => factory.getDriver("unknown-type")).toThrow(
        "No fallback driver registered"
      );
    });
  });

  describe("isNativelySupported", () => {
    it("returns true when type matches registered pattern", () => {
      factory.register("bitaxe", MockDriverA);
      expect(factory.isNativelySupported("bitaxe")).toBe(true);
      expect(factory.isNativelySupported("bitaxe max")).toBe(true);
    });

    it("returns false when no match", () => {
      factory.register("bitaxe", MockDriverA);
      expect(factory.isNativelySupported("unknown")).toBe(false);
      expect(factory.isNativelySupported("my-bitaxe")).toBe(false);
    });
  });

  describe("singleton", () => {
    it("same driver instance returned for same type", () => {
      factory.register("bitaxe", MockDriverA);
      const d1 = factory.getDriver("bitaxe");
      const d2 = factory.getDriver("bitaxe");
      expect(d1).toBe(d2);
    });
  });

  describe("MAC override singleton", () => {
    it("same driver instance returned for same MAC prefix", () => {
      factory.registerMacOverride("aa:bb", MockDriverB);
      const d1 = factory.getDriverForDevice("x", "aa:bb:cc:dd:ee:ff");
      const d2 = factory.getDriverForDevice("y", "aa:bb:11:22:33:44");
      expect(d1).toBe(d2);
    });
  });
});
