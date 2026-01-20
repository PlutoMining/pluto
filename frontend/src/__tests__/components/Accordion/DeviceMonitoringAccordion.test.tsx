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
        info: {
          hostname: "miner-01",
          hashRate_10m: 100.1234,
          sharesAccepted: 10,
          sharesRejected: 2,
          power: 1200,
          temp: null,
          vrTemp: 42.5,
          bestSessionDiff: 111,
          bestDiff: 999,
          uptimeSeconds: 600,
          currentDiff: 123,
        },
      },
      {
        mac: "bb",
        tracing: false,
        info: {
          hostname: "miner-02",
          hashRate: 50,
          sharesAccepted: 1,
          sharesRejected: 5,
          power: 500,
          temp: Number.NaN,
          vrTemp: 42,
          bestSessionDiff: 222,
          bestDiff: 333,
          uptimeSeconds: 1200,
        },
      },
    ] as any;

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

    // currentDiff uses nullish coalescing fallback.
    expect(screen.getByText("diff:123")).toBeInTheDocument();
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
      {
        mac: "aa",
        tracing: true,
        info: {
          hostname: "miner-01",
          hashRate: 1,
          sharesAccepted: 1,
          sharesRejected: 0,
          power: 100,
          temp: 40,
          vrTemp: 41,
          bestSessionDiff: 111,
          bestDiff: 222,
          uptimeSeconds: 600,
        },
      },
    ] as any;

    const { unmount } = render(<DeviceMonitoringAccordion devices={devices} />);

    expect(socket.on).toHaveBeenCalledWith("stat_update", expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith("error", expect.any(Function));

    const listener = socket.on.mock.calls.find((c) => c[0] === "stat_update")?.[1] as Function;
    expect(listener).toBeInstanceOf(Function);

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
          power: 999,
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
