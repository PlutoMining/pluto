import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";

import { DeviceMonitoringAccordion } from "@/components/Accordion/DeviceMonitoringAccordion";

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
      {
        mac: "aa",
        tracing: true,
        minerData: {
          hostname: "miner-01",
          hashrate: { rate: 100.1234 },
          sharesAccepted: 10,
          sharesRejected: 2,
          wattage: 1200,
          temperatureAvg: null, // -> "N/A °C"
          bestSessionDifficulty: 111,
          bestDifficulty: 999,
          uptime: 600,
        },
      },
      {
        mac: "bb",
        tracing: false,
        minerData: {
          hostname: "miner-02",
          hashrate: { rate: 50 },
          sharesAccepted: 1,
          sharesRejected: 5,
          wattage: 500,
          temperatureAvg: 42.5,
          bestSessionDifficulty: 222,
          bestDifficulty: 333,
          uptime: 1200,
        },
      },
      {
        mac: "cc",
        tracing: true,
        minerData: {
          hostname: "miner-03",
          hashrate: { rate: 1 },
          sharesAccepted: 0,
          sharesRejected: 0,
          wattage: 123,
          temperatureAvg: 42,
          bestSessionDifficulty: 0,
          bestDifficulty: 0,
          uptime: 60,
        },
      },
    ] as any;

    const { container } = render(<DeviceMonitoringAccordion devices={devices} />);

    expect(screen.getByText("miner-01")).toBeInTheDocument();
    expect(screen.getByText("miner-02")).toBeInTheDocument();

    // Temperatures cover null and finite branches.
    expect(screen.getAllByText("N/A °C").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("42.5 °C")).toBeInTheDocument();
    expect(screen.getByText("42 °C")).toBeInTheDocument();

    // Shares row uses highlightRight formatting.
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();

    // Current and best difficulty use MinerData bestSessionDifficulty / bestDifficulty.
    expect(screen.getByText("diff:111")).toBeInTheDocument();
    expect(screen.getByText("diff:222")).toBeInTheDocument();

    const links = Array.from(container.querySelectorAll("a[href]"));
    expect(links.some((a) => a.getAttribute("href") === "/monitoring/aa")).toBe(true);
    expect(links.some((a) => a.getAttribute("href") === "/monitoring/bb")).toBe(true);

    // Covers the NextLink onClick stopPropagation handler.
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    fireEvent.click(screen.getByLabelText("Open miner-01"));
    consoleErrorSpy.mockRestore();
  });

  it("subscribes to socket events when connected and updates matching devices", () => {
    isConnected = true;

    const devices = [
      {
        mac: "aa",
        tracing: true,
        minerData: {
          hostname: "miner-01",
          hashrate: { rate: 1 },
          sharesAccepted: 1,
          sharesRejected: 0,
          wattage: 100,
          temperatureAvg: 40,
          bestSessionDifficulty: 111,
          bestDifficulty: 222,
          uptime: 600,
        },
      },
    ] as any;

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
        minerData: {
          ...devices[0].minerData,
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
