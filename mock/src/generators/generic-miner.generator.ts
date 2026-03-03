import type { MinerDataGenerator } from "./miner-data-generator.interface";
import type { GenericMinerInfo } from "../types/generic-miner.types";

const MAKES = ["Bitmain", "MicroBT", "Canaan", "Innosilicon"];
const MODELS: Record<string, { model: string; algo: string; expectedHashrate: number; chips: number; boards: number; fans: number }[]> = {
  Bitmain: [
    { model: "Antminer S19 Pro", algo: "SHA256", expectedHashrate: 110_000, chips: 444, boards: 3, fans: 4 },
    { model: "Antminer S19j Pro", algo: "SHA256", expectedHashrate: 100_000, chips: 444, boards: 3, fans: 4 },
    { model: "Antminer S9", algo: "SHA256", expectedHashrate: 14_000, chips: 189, boards: 3, fans: 2 },
  ],
  MicroBT: [
    { model: "Whatsminer M30S++", algo: "SHA256", expectedHashrate: 112_000, chips: 348, boards: 3, fans: 2 },
    { model: "Whatsminer M50", algo: "SHA256", expectedHashrate: 114_000, chips: 360, boards: 3, fans: 2 },
  ],
  Canaan: [
    { model: "Avalon A1266", algo: "SHA256", expectedHashrate: 100_000, chips: 312, boards: 4, fans: 4 },
  ],
  Innosilicon: [
    { model: "T3+", algo: "SHA256", expectedHashrate: 67_000, chips: 360, boards: 3, fans: 2 },
  ],
};

const FIRMWARE_VERSIONS = [
  "20230901-v1.3.4",
  "20240115-v2.0.1",
  "20240601-v2.1.0",
  "braiins-os-25.01",
  "vnish-2.0.6",
];

const POOL_URLS = [
  "stratum+tcp://stratum.braiins.com:3333",
  "stratum+tcp://solo.ckpool.org:3333",
  "stratum+tcp://pool.ocean.xyz:3334",
  "stratum+tcp://public-pool.io:21496",
];

/**
 * Generates randomized data for a generic (non-vendor-specific) mock miner.
 * All fields align with what pyasic-bridge would return in `PbMinerData`.
 */
export class GenericMinerDataGenerator
  implements MinerDataGenerator<GenericMinerInfo>
{
  generate(
    hostname: string,
    uptimeSeconds: number,
    overrides: Partial<GenericMinerInfo> = {}
  ): Partial<GenericMinerInfo> {
    const randInt = (min: number, max: number) =>
      Math.floor(Math.random() * (max - min + 1)) + min;
    const randFloat = (min: number, max: number, dec: number) =>
      parseFloat((Math.random() * (max - min) + min).toFixed(dec));

    const generateMac = (h: string): string => {
      const match = h.match(/\d+$/);
      const n = match ? parseInt(match[0], 10) : 0;
      return `ff:ff:ff:ff:${((n >> 8) & 0xff).toString(16).padStart(2, "0")}:${(n & 0xff).toString(16).padStart(2, "0")}`;
    };

    const make = MAKES[randInt(0, MAKES.length - 1)];
    const variants = MODELS[make];
    const variant = variants[randInt(0, variants.length - 1)];
    const fw = FIRMWARE_VERSIONS[randInt(0, FIRMWARE_VERSIONS.length - 1)];
    const poolUrl = POOL_URLS[randInt(0, POOL_URLS.length - 1)];

    const chipsPerBoard = Math.floor(variant.chips / variant.boards);
    const hashPerBoard = variant.expectedHashrate / variant.boards;

    const base: GenericMinerInfo = {
      ip: "0.0.0.0",
      mac: generateMac(hostname),
      hostname: hostname || undefined,
      make,
      model: variant.model,
      firmware: fw,
      algo: variant.algo,
      serial_number: `SN${randInt(100000, 999999)}`,

      hashrate: randFloat(variant.expectedHashrate * 0.92, variant.expectedHashrate * 1.02, 1),
      expected_hashrate: variant.expectedHashrate,

      wattage: randFloat(2800, 3600, 1),
      wattage_limit: 3600,
      voltage: randFloat(11.8, 13.2, 2),

      temperature_avg: randFloat(55, 75, 1),
      env_temp: randFloat(20, 35, 1),

      shares_accepted: randInt(50000, 500000),
      shares_rejected: randInt(0, 200),

      best_difficulty: `${randFloat(50, 500, 1)}G`,
      best_session_difficulty: `${randFloat(10, 100, 1)}G`,
      network_difficulty: 141_668_107_417_558,

      fans: Array.from({ length: variant.fans }, () => ({
        speed: randInt(3500, 6500),
      })),

      hashboards: Array.from({ length: variant.boards }, (_, i) => ({
        slot: i,
        hashrate: randFloat(hashPerBoard * 0.93, hashPerBoard * 1.03, 1),
        temp: randFloat(55, 78, 1),
        chip_temp: randFloat(60, 85, 1),
        chips: chipsPerBoard,
        expected_chips: chipsPerBoard,
        active: true,
        voltage: randFloat(11.5, 13.5, 2),
      })),

      total_chips: variant.chips,
      expected_chips: variant.chips,
      expected_hashboards: variant.boards,
      expected_fans: variant.fans,

      is_mining: true,
      uptime: uptimeSeconds,
      nominal: true,

      efficiency: randFloat(28, 38, 1),

      pool_url: poolUrl,
      pool_user: `bc1qr0aklhexw6l7kzyg4qjmr3t98p2gjq726uzcvj.${hostname || "worker"}`,

      fw_ver: fw,
      api_ver: "1.0.0",

      datetime: new Date().toISOString(),
      timestamp: Math.floor(Date.now() / 1000),
    };

    return { ...base, ...overrides };
  }
}
