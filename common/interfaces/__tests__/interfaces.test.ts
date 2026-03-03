// Side-effect import forces module execution for coverage
import "../index";
import type { MinerData, DiscoveredMiner, MinerConfig, BitaxeData } from "../index";

describe("@pluto/interfaces", () => {
  it("MinerData type is structurally valid", () => {
    const data: MinerData = {
      ip: "192.168.1.1",
      fans: [],
      hashboards: [],
    };
    expect(data.ip).toBe("192.168.1.1");
  });

  it("DiscoveredMiner requires supportLevel", () => {
    const miner: DiscoveredMiner = {
      ip: "192.168.1.1",
      mac: "AA:BB:CC:DD:EE:FF",
      type: "Bitaxe 601",
      supportLevel: "native",
      minerData: { ip: "192.168.1.1", fans: [], hashboards: [] },
    };
    expect(miner.supportLevel).toBe("native");
  });

  it("MinerConfig supports vendorConfig", () => {
    const config: MinerConfig = {
      vendorConfig: { frequency: 490, coreVoltage: 1100 },
    };
    expect(config.vendorConfig?.frequency).toBe(490);
  });

  it("BitaxeData captures all key fields", () => {
    const data: Partial<BitaxeData> = {
      hashRate: 1000,
      asicModel: "BM1370",
      vrTemp: 65,
    };
    expect(data.asicModel).toBe("BM1370");
  });
});
