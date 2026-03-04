import { logger } from "@pluto/logger";
import type { IMinerDriver } from "./miner-driver.interface";

type DriverConstructor = new () => IMinerDriver;

/**
 * Registry that maps miner type patterns to driver implementations.
 * Falls back to a default (pyasic-bridge) driver when no native match is found.
 *
 * Also supports MAC-prefix overrides: if a device's MAC matches a registered
 * prefix, that driver wins regardless of the miner-type string.
 */
export class MinerDriverFactory {
  private registry = new Map<string, DriverConstructor>();
  private instances = new Map<string, IMinerDriver>();
  private macOverrides = new Map<string, DriverConstructor>();
  private macInstances = new Map<string, IMinerDriver>();
  private fallbackCtor: DriverConstructor | null = null;
  private fallbackInstance: IMinerDriver | null = null;

  register(pattern: string, ctor: DriverConstructor): void {
    this.registry.set(pattern.toLowerCase(), ctor);
  }

  registerMacOverride(macPrefix: string, ctor: DriverConstructor): void {
    this.macOverrides.set(macPrefix.toLowerCase(), ctor);
  }

  setFallback(ctor: DriverConstructor): void {
    this.fallbackCtor = ctor;
  }

  /**
   * Select a driver for a device.
   * Priority: MAC-prefix override > type-pattern match > fallback.
   */
  getDriverForDevice(minerType: string, mac?: string): IMinerDriver {
    if (mac) {
      const normalizedMac = mac.toLowerCase();
      for (const [prefix, Ctor] of this.macOverrides) {
        if (normalizedMac.startsWith(prefix)) {
          if (!this.macInstances.has(prefix)) {
            this.macInstances.set(prefix, new Ctor());
            logger.debug(`Instantiated MAC-override driver for prefix "${prefix}"`);
          }
          return this.macInstances.get(prefix)!;
        }
      }
    }
    return this.getDriver(minerType);
  }

  getDriver(minerType: string): IMinerDriver {
    const key = this.resolveKey(minerType);
    if (key) {
      if (!this.instances.has(key)) {
        const Ctor = this.registry.get(key)!;
        this.instances.set(key, new Ctor());
        logger.debug(`Instantiated native driver for pattern "${key}"`);
      }
      return this.instances.get(key)!;
    }

    if (!this.fallbackInstance) {
      if (!this.fallbackCtor) {
        throw new Error("No fallback driver registered");
      }
      this.fallbackInstance = new this.fallbackCtor();
      logger.debug("Instantiated fallback pyasic-bridge driver");
    }
    return this.fallbackInstance;
  }

  isNativelySupported(minerType: string): boolean {
    return this.resolveKey(minerType) !== null;
  }

  private resolveKey(minerType: string): string | null {
    const normalized = minerType.toLowerCase();
    for (const [pattern] of this.registry) {
      if (normalized.startsWith(pattern)) return pattern;
    }
    return null;
  }
}
