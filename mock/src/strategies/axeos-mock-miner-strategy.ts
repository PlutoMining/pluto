import type { MockMinerStrategy } from "./mock-miner-strategy.interface";
import { DeviceApiVersion } from "../types/axeos.types";
import type { BitaxeAxeOSInfo } from "../types/bitaxe-axeos.types";
import type { MinerDataGenerator } from "../generators/miner-data-generator.interface";
import { BitaxeAxeOSDataGenerator } from "../generators/bitaxe-axeos.generator";

/**
 * Strategy implementation for AxeOS-based mock miners.
 *
 * This wraps a Bitaxe-specific data generator so that behaviour remains
 * close to real AxeOS devices, while allowing the worker/controller to
 * depend only on the `MockMinerStrategy` abstraction.
 */
export class AxeosMockMinerStrategy implements MockMinerStrategy<BitaxeAxeOSInfo> {
  constructor(
    private readonly apiVersion: DeviceApiVersion,
    private readonly generator: MinerDataGenerator<BitaxeAxeOSInfo> = new BitaxeAxeOSDataGenerator()
  ) {}

  generateSystemInfo(
    hostname: string,
    uptimeSeconds: number,
    systemInfo: Partial<BitaxeAxeOSInfo>
  ): Partial<BitaxeAxeOSInfo> {
    // For now, legacy and "new" AxeOS share the same payload.
    // If firmware diverges we can branch on apiVersion here.
    return this.generator.generate(hostname, uptimeSeconds, systemInfo);
  }

  getApiVersion(): string {
    return this.apiVersion;
  }

  getMinerType(): string {
    return "axeos";
  }

  getRootHtml(): string {
    // pyasic library detects AxeOS miners by checking if "AxeOS" appears
    // in the HTML response from the root endpoint
    return `
<!DOCTYPE html>
<html>
<head>
  <title>AxeOS</title>
</head>
<body>
  <h1>AxeOS</h1>
  <p>Mock Miner Device</p>
</body>
</html>
    `;
  }
}

