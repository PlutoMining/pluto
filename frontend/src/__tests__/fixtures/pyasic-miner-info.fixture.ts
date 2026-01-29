/* eslint-disable jest/no-export */
/**
 * Test fixtures for pyasic-bridge miner info schema.
 * Based on the normalized pyasic-bridge response format.
 */

import type { Device, PyasicMinerInfo } from "@pluto/interfaces";

/**
 * Creates a minimal pyasic miner info fixture with sensible defaults.
 * Override specific fields as needed for tests.
 */
export function createPyasicMinerInfoFixture(
  overrides?: Partial<PyasicMinerInfo>
): PyasicMinerInfo {
  return {
    ip: "192.168.178.229",
    device_info: {
      make: "BitAxe",
      model: "Gamma",
      firmware: "Stock",
      algo: "SHA256",
    },
    serial_number: null,
    psu_serial_number: null,
    mac: "30:ED:A0:30:10:30",
    api_ver: "v2.12.2",
    fw_ver: "v2.12.2",
    hostname: "bitaxe",
    sticker_hashrate: null,
    expected_hashrate: {
      unit: {
        value: 1000000000000,
        suffix: "TH/s",
      },
      rate: 0.9996,
    },
    expected_hashboards: 1,
    expected_chips: 1,
    expected_fans: 1,
    env_temp: null,
    wattage: 18,
    voltage: null,
    network_difficulty: 141668107417558,
    best_difficulty: "506388397",
    best_session_difficulty: "205594554",
    shares_accepted: 132995,
    shares_rejected: 55,
    fans: [
      {
        speed: 5427,
      },
    ],
    fan_psu: null,
    hashboards: [
      {
        slot: 0,
        hashrate: {
          unit: {
            value: 1000000000000,
            suffix: "TH/s",
          },
          rate: 0.9887014771,
        },
        inlet_temp: null,
        outlet_temp: null,
        temp: 65.0,
        chip_temp: 59.75,
        chips: 1,
        expected_chips: 1,
        serial_number: null,
        missing: false,
        tuned: null,
        active: true,
        voltage: 5164.0625,
      },
    ],
    config: {
      pools: {
        groups: [
          {
            pools: [
              {
                url: "stratum+tcp://192.168.178.28:2018",
                user: "bc1qr0aklhexw6l7kzyg4qjmr3t98p2gjq726uzcvj.bitaxe",
                password: "",
              },
            ],
            quota: 1,
            name: null,
          },
        ],
      },
      fan_mode: {
        mode: "manual",
        speed: 60,
        minimum_fans: 1,
      },
      temperature: {
        target: null,
        hot: null,
        danger: null,
      },
      mining_mode: {
        mode: "normal",
      },
      extra_config: {
        rotation: 0,
        invertscreen: 0,
        display_timeout: 1,
        overheat_mode: 0,
        overclock_enabled: 0,
        stats_frequency: 0,
        min_fan_speed: 25,
      },
    },
    fault_light: null,
    errors: [],
    is_mining: true,
    uptime: 1227200,
    pools: [],
    hashrate: {
      unit: {
        value: 1000000000,
        suffix: "Gh/s",
      },
      rate: 988.7014771,
    },
    wattage_limit: null,
    total_chips: 1,
    nominal: true,
    percent_expected_chips: 100,
    percent_expected_hashrate: 99,
    percent_expected_wattage: null,
    temperature_avg: 65,
    efficiency: {
      unit: {
        suffix: "J/Th",
      },
      rate: 18.205697490001253,
    },
    efficiency_fract: 18.21,
    datetime: "2026-01-27T16:21:06.597199+00:00",
    timestamp: 1769530866,
    make: "BitAxe",
    model: "Gamma",
    firmware: "Stock",
    algo: "SHA256",
    ...overrides,
  };
}

/**
 * Creates a Device fixture with pyasic miner info.
 */
export function createDeviceFixture(overrides?: Partial<Device>): Device {
  return {
    ip: "10.0.0.1",
    mac: "aa:bb:cc:dd:ee:ff",
    type: "mock",
    presetUuid: null,
    tracing: false,
    info: createPyasicMinerInfoFixture({
      ip: "10.0.0.1",
      mac: "aa:bb:cc:dd:ee:ff",
      hostname: "miner-1",
    }),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as Device;
}

// Provide a trivial test so Jest does not fail this helper-only file.
describe("pyasic-miner-info.fixture helper", () => {
  it("creates a default PyasicMinerInfo object", () => {
    const info = createPyasicMinerInfoFixture();
    expect(info).toBeDefined();
    expect(info.ip).toBeTruthy();
  });
});
