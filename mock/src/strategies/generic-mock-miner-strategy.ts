import type { MockMinerStrategy } from "./mock-miner-strategy.interface";
import type { GenericMinerInfo } from "../types/generic-miner.types";
import type { MinerDataGenerator } from "../generators/miner-data-generator.interface";
import { GenericMinerDataGenerator } from "../generators/generic-miner.generator";

/**
 * Strategy for generic (non-vendor-specific) mock miners.
 *
 * Produces data that pyasic-bridge would normalise for an ASIC miner
 * such as Antminer S19, Whatsminer M30, or Canaan Avalon. No
 * vendor-specific fields (frequency, coreVoltage, etc.) are included.
 */
export class GenericMockMinerStrategy
  implements MockMinerStrategy<GenericMinerInfo>
{
  constructor(
    private readonly generator: MinerDataGenerator<GenericMinerInfo> = new GenericMinerDataGenerator()
  ) {}

  generateSystemInfo(
    hostname: string,
    uptimeSeconds: number,
    systemInfo: Partial<GenericMinerInfo>
  ): Partial<GenericMinerInfo> {
    return this.generator.generate(hostname, uptimeSeconds, systemInfo);
  }

  getApiVersion(): string {
    return "generic";
  }

  getMinerType(): string {
    return "generic";
  }

  getRootHtml(): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Miner Web UI</title>
</head>
<body>
  <h1>Miner Web UI</h1>
  <p>Mock Generic Miner Device</p>
</body>
</html>
    `;
  }
}
