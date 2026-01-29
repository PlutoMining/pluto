import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { DeviceTable } from "@/components/Table/DeviceTable";

jest.mock("@/utils/minerMap", () => ({
  getMinerName: jest.fn(),
}));

jest.mock("@/utils/formatTime", () => ({
  convertIsoTomMdDYy: jest.fn(() => "01/20/26"),
  formatTime: jest
    .fn()
    .mockImplementationOnce(() => "10m")
    .mockImplementationOnce(() => "20m"),
  formatDetailedTime: jest
    .fn()
    .mockImplementationOnce(() => "10 minutes")
    .mockImplementationOnce(() => "20 minutes"),
}));

const minerMap = jest.requireMock("@/utils/minerMap") as { getMinerName: jest.Mock };

describe("DeviceTable", () => {
  it("renders device rows and calls remove callback", () => {
    minerMap.getMinerName
      .mockImplementationOnce(() => "Antminer")
      .mockImplementationOnce(() => undefined);

    const removeDeviceFunction = jest.fn();
    const devices = [
      {
        ip: "10.0.0.1",
        mac: "aa",
        createdAt: "2026-01-20T00:00:00.000Z",
        tracing: true,
        info: {
          hostname: "miner-01",
          boardVersion: "x",
          deviceModel: "FallbackModel",
          ASICModel: "S19",
          uptimeSeconds: 600,
          version: "v1",
        },
      },
      {
        ip: "10.0.0.2",
        mac: "bb",
        createdAt: "2026-01-20T00:00:00.000Z",
        tracing: false,
        info: {
          hostname: "miner-02",
          boardVersion: "y",
          deviceModel: "FallbackModel",
          ASICModel: "S21",
          uptimeSeconds: 1200,
          version: "v2",
        },
      },
    ] as any;

    render(<DeviceTable devices={devices} removeDeviceFunction={removeDeviceFunction} />);

    expect(screen.getByText("Hostname")).toBeInTheDocument();
    expect(screen.getByText("miner-01")).toBeInTheDocument();
    expect(screen.getByText("miner-02")).toBeInTheDocument();

    // date formatter mocked
    expect(screen.getAllByText("01/20/26")).toHaveLength(2);

    // miner cell falls back when getMinerName returns undefined
    expect(screen.getByText("Antminer")).toBeInTheDocument();
    expect(screen.getAllByText("FallbackModel").length).toBeGreaterThanOrEqual(1);

    const uptimeCell = screen.getByText("10m").closest("td") as HTMLTableCellElement;
    expect(uptimeCell).toHaveAttribute("title", "10 minutes");

    fireEvent.click(screen.getByRole("button", { name: "Remove miner-02" }));
    expect(removeDeviceFunction).toHaveBeenCalledWith("bb");
  });
});
