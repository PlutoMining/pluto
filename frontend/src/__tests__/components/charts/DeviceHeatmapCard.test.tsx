import { render, screen } from "@testing-library/react";

import { DeviceHeatmapCard } from "@/components/charts/DeviceHeatmapCard";

describe("DeviceHeatmapCard", () => {
  it("renders devices and covers temperature/number edge cases", () => {
    const devices = [
      {
        mac: "aa",
        tracing: true,
        minerData: {
          hostname: "cold",
          hashrate: { rate: 10 },
          shares_accepted: 0,
          shares_rejected: 0,
          wattage: 100,
          temperature_avg: 25,
          best_session_difficulty: 1,
          best_difficulty: 2,
          uptime: 60,
        },
      },
      {
        mac: "bb",
        tracing: true,
        minerData: {
          hostname: "hot",
          hashrate: { rate: 123 },
          shares_accepted: 0,
          shares_rejected: 0,
          wattage: 0,
          temperature_avg: 90,
          best_session_difficulty: 1,
          best_difficulty: 2,
          uptime: 60,
        },
      },
      {
        mac: "cc",
        tracing: true,
        minerData: {
          hostname: "vr-only",
          hashrate: { rate: 0 },
          shares_accepted: 0,
          shares_rejected: 0,
          wattage: 200,
          temperature_avg: undefined,
          best_session_difficulty: 1,
          best_difficulty: 2,
          uptime: 60,
        },
      },
      {
        mac: "dd",
        tracing: false,
        minerData: {
          hostname: "offline",
          hashrate: { rate: 1 },
          shares_accepted: 0,
          shares_rejected: 0,
          wattage: 100,
          temperature_avg: undefined,
          best_session_difficulty: 1,
          best_difficulty: 2,
          uptime: 60,
        },
      },
      {
        mac: "ee",
        tracing: true,
        minerData: {
          hostname: "unknown-temp",
          hashrate: { rate: 1 },
          shares_accepted: 0,
          shares_rejected: 0,
          wattage: 100,
          temperature_avg: undefined,
          best_session_difficulty: 1,
          best_difficulty: 2,
          uptime: 60,
        },
      },
    ] as any;

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
