import { render, screen } from "@testing-library/react";

import { DeviceHeatmapCard } from "@/components/charts/DeviceHeatmapCard";

describe("DeviceHeatmapCard", () => {
  it("renders devices and covers temperature/number edge cases", () => {
    const devices = [
      {
        mac: "aa",
        tracing: true,
        info: {
          hostname: "cold",
          hashRate_10m: 10,
          sharesAccepted: 0,
          sharesRejected: 0,
          power: 100,
          temp: 25,
          vrTemp: null,
          bestSessionDiff: 1,
          bestDiff: 2,
          uptimeSeconds: 60,
        },
      },
      {
        mac: "bb",
        tracing: true,
        info: {
          hostname: "hot",
          // hashRate_10m undefined -> fallback to hashRate
          hashRate: "123",
          sharesAccepted: 0,
          sharesRejected: 0,
          power: "bad",
          temp: 90,
          vrTemp: 50,
          bestSessionDiff: 1,
          bestDiff: 2,
          uptimeSeconds: 60,
        },
      },
      {
        mac: "cc",
        tracing: true,
        info: {
          hostname: "vr-only",
          // hashRate_10m + hashRate undefined -> fallback to 0
          sharesAccepted: 0,
          sharesRejected: 0,
          power: 200,
          temp: undefined,
          vrTemp: 70,
          bestSessionDiff: 1,
          bestDiff: 2,
          uptimeSeconds: 60,
        },
      },
      {
        mac: "dd",
        tracing: false,
        info: {
          hostname: "offline",
          hashRate: 1,
          sharesAccepted: 0,
          sharesRejected: 0,
          power: 100,
          temp: undefined,
          vrTemp: undefined,
          bestSessionDiff: 1,
          bestDiff: 2,
          uptimeSeconds: 60,
        },
      },
      {
        mac: "ee",
        tracing: true,
        info: {
          hostname: "unknown-temp",
          hashRate: 1,
          sharesAccepted: 0,
          sharesRejected: 0,
          power: 100,
          temp: undefined,
          vrTemp: undefined,
          bestSessionDiff: 1,
          bestDiff: 2,
          uptimeSeconds: 60,
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
