import { render, screen } from "@testing-library/react";

import { DeviceHeatmapCard } from "@/components/charts/DeviceHeatmapCard";
import { createDeviceFixture } from "../../fixtures/pyasic-miner-info.fixture";

describe("DeviceHeatmapCard", () => {
  it("renders devices and covers temperature/number edge cases", () => {
    const devices = [
      createDeviceFixture({
        mac: "aa",
        tracing: true,
        info: {
          ...createDeviceFixture().info,
          hostname: "cold",
          hashrate: { unit: { value: 1000000000, suffix: "Gh/s" }, rate: 10 },
          shares_accepted: 0,
          shares_rejected: 0,
          wattage: 100,
          temperature_avg: 25,
          hashboards: [{ slot: 0, hashrate: { unit: { value: 1000000000, suffix: "Gh/s" }, rate: 0 }, temp: null, chip_temp: null, chips: 1, expected_chips: 1, serial_number: null, missing: false, tuned: null, active: true, voltage: null, inlet_temp: null, outlet_temp: null }],
          best_session_difficulty: "1",
          best_difficulty: "2",
          uptime: 60,
        },
      }),
      createDeviceFixture({
        mac: "bb",
        tracing: true,
        info: {
          ...createDeviceFixture().info,
          hostname: "hot",
          hashrate: { unit: { value: 1000000000, suffix: "Gh/s" }, rate: 123 },
          shares_accepted: 0,
          shares_rejected: 0,
          wattage: 100,
          temperature_avg: 90,
          hashboards: [{ slot: 0, hashrate: { unit: { value: 1000000000, suffix: "Gh/s" }, rate: 0 }, temp: 50, chip_temp: null, chips: 1, expected_chips: 1, serial_number: null, missing: false, tuned: null, active: true, voltage: null, inlet_temp: null, outlet_temp: null }],
          best_session_difficulty: "1",
          best_difficulty: "2",
          uptime: 60,
        },
      }),
      createDeviceFixture({
        mac: "cc",
        tracing: true,
        info: {
          ...createDeviceFixture().info,
          hostname: "vr-only",
          hashrate: { unit: { value: 1000000000, suffix: "Gh/s" }, rate: 0 },
          shares_accepted: 0,
          shares_rejected: 0,
          wattage: 200,
          temperature_avg: null,
          hashboards: [{ slot: 0, hashrate: { unit: { value: 1000000000, suffix: "Gh/s" }, rate: 0 }, temp: 70, chip_temp: null, chips: 1, expected_chips: 1, serial_number: null, missing: false, tuned: null, active: true, voltage: null, inlet_temp: null, outlet_temp: null }],
          best_session_difficulty: "1",
          best_difficulty: "2",
          uptime: 60,
        },
      }),
      createDeviceFixture({
        mac: "dd",
        tracing: false,
        info: {
          ...createDeviceFixture().info,
          hostname: "offline",
          hashrate: { unit: { value: 1000000000, suffix: "Gh/s" }, rate: 1 },
          shares_accepted: 0,
          shares_rejected: 0,
          wattage: 100,
          temperature_avg: null,
          hashboards: [],
          best_session_difficulty: "1",
          best_difficulty: "2",
          uptime: 60,
        },
      }),
      createDeviceFixture({
        mac: "ee",
        tracing: true,
        info: {
          ...createDeviceFixture().info,
          hostname: "unknown-temp",
          hashrate: { unit: { value: 1000000000, suffix: "Gh/s" }, rate: 1 },
          shares_accepted: 0,
          shares_rejected: 0,
          wattage: 100,
          temperature_avg: null,
          hashboards: [],
          best_session_difficulty: "1",
          best_difficulty: "2",
          uptime: 60,
        },
      }),
    ];

    const { container } = render(<DeviceHeatmapCard title="Heat" devices={devices} />);

    expect(screen.getByText("Heat")).toBeInTheDocument();
    expect(screen.getByText("cold")).toBeInTheDocument();
    expect(screen.getByText("hot")).toBeInTheDocument();
    expect(screen.getByText("vr-only")).toBeInTheDocument();
    expect(screen.getByText("offline")).toBeInTheDocument();
    expect(screen.getByText("unknown-temp")).toBeInTheDocument();

    // Hot device should get the destructive ring class.
    const hotLink = container.querySelector('a[href*="/monitoring/hot"]');
    expect(hotLink?.className).toContain("ring-2");
  });
});
