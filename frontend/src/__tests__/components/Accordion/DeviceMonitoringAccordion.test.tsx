import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";

import { DeviceMonitoringAccordion } from "@/components/Accordion/DeviceMonitoringAccordion";
import { createDeviceFixture } from "../../fixtures/pyasic-miner-info.fixture";

let isConnected = false;
const socket = {
  on: jest.fn(),
  off: jest.fn(),
};

jest.mock("@/providers/SocketProvider", () => ({
  useSocket: () => ({
    isConnected,
    socket,
  }),
}));

jest.mock("@/utils/formatTime", () => ({
  formatDetailedTime: jest.fn(() => "10m"),
}));

jest.mock("@/utils/formatDifficulty", () => ({
  formatDifficulty: jest.fn((v: number) => `diff:${v}`),
}));

describe("DeviceMonitoringAccordion", () => {
  beforeEach(() => {
    isConnected = false;
    socket.on.mockReset();
    socket.off.mockReset();
  });

  it("renders empty state when no devices", () => {
    render(<DeviceMonitoringAccordion devices={undefined} />);
    expect(screen.getByText("No device found")).toBeInTheDocument();
  });

  it("renders rows, formats temperatures, and links to device page", () => {
    const devices = [
      createDeviceFixture({
        mac: "aa",
        tracing: true,
        info: {
          ...createDeviceFixture().info,
          hostname: "miner-01",
          hashrate: { unit: { value: 1000000000, suffix: "Gh/s" }, rate: 100.1234 },
          shares_accepted: 10,
          shares_rejected: 2,
          wattage: 1200,
          temperature_avg: null,
          hashboards: [{ slot: 0, hashrate: { unit: { value: 1000000000, suffix: "Gh/s" }, rate: 0 }, temp: 42.5, chip_temp: 42.5, chips: 1, expected_chips: 1, serial_number: null, missing: false, tuned: null, active: true, voltage: null, inlet_temp: null, outlet_temp: null }],
          best_session_difficulty: "111",
          best_difficulty: "999",
          uptime: 600,
        },
      }),
      createDeviceFixture({
        mac: "bb",
        tracing: false,
        info: {
          ...createDeviceFixture().info,
          hostname: "miner-02",
          hashrate: { unit: { value: 1000000000, suffix: "Gh/s" }, rate: 50 },
          shares_accepted: 1,
          shares_rejected: 5,
          wattage: 500,
          temperature_avg: NaN,
          hashboards: [{ slot: 0, hashrate: { unit: { value: 1000000000, suffix: "Gh/s" }, rate: 0 }, temp: 42, chip_temp: 42, chips: 1, expected_chips: 1, serial_number: null, missing: false, tuned: null, active: true, voltage: null, inlet_temp: null, outlet_temp: null }],
          best_session_difficulty: "222",
          best_difficulty: "333",
          uptime: 1200,
        },
      }),
    ];

    const { container } = render(<DeviceMonitoringAccordion devices={devices} />);

    expect(screen.getByText("miner-01")).toBeInTheDocument();
    expect(screen.getByText("miner-02")).toBeInTheDocument();

    // Temperatures cover null and NaN branches.
    expect(screen.getAllByText("N/A °C").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("42.5 °C")).toBeInTheDocument();
    expect(screen.getByText("42 °C")).toBeInTheDocument();

    // Shares row uses highlightRight formatting.
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();

    // currentDiff uses nullish coalescing fallback on best_session_difficulty.
    expect(screen.getByText("diff:111")).toBeInTheDocument();
    expect(screen.getByText("diff:222")).toBeInTheDocument();

    const links = Array.from(container.querySelectorAll("a[href]"));
    expect(links.some((a) => a.getAttribute("href") === "/monitoring/miner-01")).toBe(true);
    expect(links.some((a) => a.getAttribute("href") === "/monitoring/miner-02")).toBe(true);

    // Covers the NextLink onClick stopPropagation handler.
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    fireEvent.click(screen.getByLabelText("Open miner-01"));
    consoleErrorSpy.mockRestore();
  });

  it("subscribes to socket events when connected and updates matching devices", () => {
    isConnected = true;

    const devices = [
      createDeviceFixture({
        mac: "aa",
        tracing: true,
        info: {
          ...createDeviceFixture().info,
          hostname: "miner-01",
          hashrate: { unit: { value: 1000000000, suffix: "Gh/s" }, rate: 1 },
          shares_accepted: 1,
          shares_rejected: 0,
          wattage: 100,
          temperature_avg: 40,
          hashboards: [{ slot: 0, hashrate: { unit: { value: 1000000000, suffix: "Gh/s" }, rate: 0 }, temp: 41, chip_temp: 41, chips: 1, expected_chips: 1, serial_number: null, missing: false, tuned: null, active: true, voltage: null, inlet_temp: null, outlet_temp: null }],
          best_session_difficulty: "111",
          best_difficulty: "222",
          uptime: 600,
        },
      }),
    ];

    type StatListener = (payload: any) => void;

    const { unmount } = render(<DeviceMonitoringAccordion devices={devices} />);

    expect(socket.on).toHaveBeenCalledWith("stat_update", expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith("error", expect.any(Function));

    const listener = socket.on.mock.calls.find((c) => c[0] === "stat_update")?.[1] as unknown as StatListener;
    expect(typeof listener).toBe("function");

    // Unknown device should be ignored.
    act(() => {
      listener({ mac: "zz", tracing: false, info: { hostname: "zzz" } });
    });
    expect(screen.queryByText("zzz")).toBeNull();

    // Matching device updates in place.
    act(() => {
      listener({
        mac: "aa",
        tracing: false,
        info: {
          ...devices[0].info,
          wattage: 999,
        },
      });
    });

    expect(screen.getByText("offline")).toBeInTheDocument();
    expect(screen.getByText("999.00 W")).toBeInTheDocument();

    unmount();
    expect(socket.off).toHaveBeenCalledWith("stat_update", expect.any(Function));
    expect(socket.off).toHaveBeenCalledWith("error", expect.any(Function));
  });
});
