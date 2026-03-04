import type { MinerDataGenerator } from "./miner-data-generator.interface";
import type { BitaxeAxeOSInfo } from "../types/bitaxe-axeos.types";

function stableIndex(key: string | undefined, length: number, salt = ""): number {
  const input = (key && key.length > 0 ? key : "bitaxe") + salt;
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % length;
}

/**
 * BitAxe / AxeOS-specific system info generator.
 *
 * Produces a payload that closely matches the real Bitaxe
 * `/api/system/info` JSON so that pyasic can normalise it.
 *
 * Identity/config fields (ASIC model, board version, firmware) are
 * derived deterministically from the hostname so a given mock device
 * keeps a stable identity across polls.
 */
export class BitaxeAxeOSDataGenerator
  implements MinerDataGenerator<BitaxeAxeOSInfo>
{
  generate(
    hostname: string,
    uptimeSeconds: number,
    overrides: Partial<BitaxeAxeOSInfo> = {}
  ): Partial<BitaxeAxeOSInfo> {
    const getRandomInt = (min: number, max: number) =>
      Math.floor(Math.random() * (max - min + 1)) + min;
    const getRandomFloat = (min: number, max: number, decimals: number) =>
      parseFloat((Math.random() * (max - min) + min).toFixed(decimals));

    const bitaxeModels = [
      { asicModel: "BM1370", model: "Gamma", boardVersion: "601" },
      { asicModel: "BM1368", model: "Supra", boardVersion: "401" },
      { asicModel: "BM1366", model: "Ultra", boardVersion: "201" },
      { asicModel: "BM1397", model: "Max", boardVersion: "101" },
    ];
    const modelIdx = stableIndex(hostname, bitaxeModels.length, ":model");
    const selectedModel = bitaxeModels[modelIdx];

    const firmwareVersions = [
      "v2.12.2",
      "v2.12.1",
      "v2.12.0",
      "v2.11.5",
      "v2.11.4",
      "v2.11.3",
      "v2.11.2",
      "v2.11.1",
      "v2.11.0",
      "v2.10.5",
      "v2.10.4",
    ];
    const fwIdx = stableIndex(hostname, firmwareVersions.length, ":fw");
    const firmwareVersion = firmwareVersions[fwIdx];

    const generateMacAddress = (h: string): string => {
      const match = h.match(/\d+$/);
      const numericPart = match ? parseInt(match[0], 10) : 0;
      const byte1 = (numericPart & 0xff00) >> 8;
      const byte2 = numericPart & 0xff;
      return `ff:ff:ff:ff:${byte1.toString(16).padStart(2, "0")}:${byte2
        .toString(16)
        .padStart(2, "0")}`;
    };

    const base: BitaxeAxeOSInfo = {
      power: getRandomFloat(15, 25, 7),
      voltage: getRandomFloat(5000, 5500, 4),
      current: getRandomFloat(10_000, 12_000, 3),
      temp: getRandomFloat(55, 65, 3),
      temp2: -1,
      vrTemp: getRandomInt(55, 75),
      maxPower: 40,
      nominalVoltage: 5,
      hashRate: getRandomFloat(950, 1050, 4),
      hashRate_1m: getRandomFloat(950, 1050, 4),
      hashRate_10m: getRandomFloat(950, 1050, 4),
      hashRate_1h: getRandomFloat(950, 1050, 4),
      expectedHashrate: 999.6,
      errorPercentage: getRandomFloat(0, 1, 6),
      bestDiff: getRandomInt(100_000_000, 600_000_000),
      bestSessionDiff: getRandomInt(100_000_000, 300_000_000),
      poolDifficulty: 2048,
      isUsingFallbackStratum: 0,
      poolAddrFamily: 2,
      isPSRAMAvailable: 1,
      freeHeap: getRandomInt(8_000_000, 8_500_000),
      freeHeapInternal: getRandomInt(80_000, 150_000),
      freeHeapSpiram: getRandomInt(8_000_000, 8_500_000),
      coreVoltage: 1100,
      coreVoltageActual: getRandomInt(1080, 1110),
      frequency: getRandomInt(490, 550),
      ssid: "FRITZ!Box 5530 AG",
      macAddr: generateMacAddress(hostname),
      hostname,
      ipv4: "192.168.178.229",
      ipv6: "FE80::32ED:A0FF:FE30:1030",
      wifiStatus: "Connected!",
      wifiRSSI: -44,
      apEnabled: 0,
      sharesAccepted: getRandomInt(140_000, 160_000),
      sharesRejected: getRandomInt(40, 100),
      sharesRejectedReasons: [
        { message: "Job not found", count: getRandomInt(10, 60) },
        { message: "Difficulty too low", count: getRandomInt(0, 5) },
      ],
      uptimeSeconds,
      smallCoreCount: 2040,
      ASICModel: selectedModel.asicModel,
      stratumURL: "stratum+tcp://192.168.178.28:2018",
      stratumPort: 2018,
      stratumUser: "bc1qr0aklhexw6l7kzyg4qjmr3t98p2gjq726uzcvj.bitaxe",
      stratumSuggestedDifficulty: 1000,
      stratumExtranonceSubscribe: 0,
      fallbackStratumURL: "eusolo.ckpool.org",
      fallbackStratumPort: 3333,
      fallbackStratumUser: "bc1qr0aklhexw6l7kzyg4qjmr3t98p2gjq726uzcvj.bitaxe",
      fallbackStratumSuggestedDifficulty: 1000,
      fallbackStratumExtranonceSubscribe: 0,
      responseTime: getRandomFloat(10, 50, 3),
      version: firmwareVersion,
      axeOSVersion: firmwareVersion,
      idfVersion: "v5.5.1",
      boardVersion: selectedModel.boardVersion,
      resetReason: "Software reset via esp_restart",
      runningPartition: "ota_0",
      overheat_mode: 0,
      overclockEnabled: 0,
      display: "SSD1306 (128x32)",
      rotation: 0,
      invertscreen: 0,
      displayTimeout: 1,
      autofanspeed: 0,
      fanspeed: 60,
      manualFanSpeed: 60,
      minFanSpeed: 25,
      temptarget: 65,
      fanrpm: getRandomInt(5200, 5600),
      fan2rpm: 0,
      statsFrequency: 0,
      blockFound: 0,
      blockHeight: 934200,
      scriptsig: "\"Public Pool on Umbrel\"",
      networkDifficulty: 141_668_107_417_558,
      hashrateMonitor: {
        asics: [
          {
            total: getRandomFloat(950, 1050, 4),
            domains: [
              getRandomFloat(230, 260, 3),
              getRandomFloat(230, 260, 3),
              getRandomFloat(230, 260, 3),
              getRandomFloat(230, 260, 3),
            ],
            errorCount: getRandomInt(300_000, 400_000),
          },
        ],
      },
    };

    return {
      ...base,
      ...overrides,
    };
  }
}

