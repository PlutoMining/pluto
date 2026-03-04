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
          sharesAccepted: 0,
          sharesRejected: 0,
          wattage: 100,
          temperatureAvg: 25,
          bestSessionDifficulty: 1,
          bestDifficulty: 2,
          uptime: 60,
        },
      },
      {
        mac: "bb",
        tracing: true,
        minerData: {
          hostname: "hot",
          hashrate: { rate: 123 },
          sharesAccepted: 0,
          sharesRejected: 0,
          wattage: 0,
          temperatureAvg: 90,
          bestSessionDifficulty: 1,
          bestDifficulty: 2,
          uptime: 60,
        },
      },
      {
        mac: "cc",
        tracing: true,
        minerData: {
          hostname: "vr-only",
          hashrate: { rate: 0 },
          sharesAccepted: 0,
          sharesRejected: 0,
          wattage: 200,
          temperatureAvg: undefined,
          bestSessionDifficulty: 1,
          bestDifficulty: 2,
          uptime: 60,
        },
      },
      {
        mac: "dd",
        tracing: false,
        minerData: {
          hostname: "offline",
          hashrate: { rate: 1 },
          sharesAccepted: 0,
          sharesRejected: 0,
          wattage: 100,
          temperatureAvg: undefined,
          bestSessionDifficulty: 1,
          bestDifficulty: 2,
          uptime: 60,
        },
      },
      {
        mac: "ee",
        tracing: true,
        minerData: {
          hostname: "unknown-temp",
          hashrate: { rate: 1 },
          sharesAccepted: 0,
          sharesRejected: 0,
          wattage: 100,
          temperatureAvg: undefined,
          bestSessionDifficulty: 1,
          bestDifficulty: 2,
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

    // Hot device (mac "bb") should get the destructive ring class.
    const hotLink = container.querySelector('a[href*="/monitoring/bb"]');
    expect(hotLink?.className).toContain("ring-2");
  });
});
