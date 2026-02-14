import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { DeviceTable } from "@/components/Table/DeviceTable";

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

describe("DeviceTable", () => {
  it("renders device rows and calls remove callback", () => {
    const removeDeviceFunction = jest.fn();
    const devices = [
      {
        ip: "10.0.0.1",
        mac: "aa",
        createdAt: "2026-01-20T00:00:00.000Z",
        tracing: true,
        minerData: {
          hostname: "miner-01",
          model: "Model-A",
          fw_ver: "v1",
          uptime: 600,
        },
      },
      {
        ip: "10.0.0.2",
        mac: "bb",
        createdAt: "2026-01-20T00:00:00.000Z",
        tracing: false,
        minerData: {
          hostname: "miner-02",
          model: "Model-B",
          fw_ver: "v2",
          uptime: 1200,
        },
      },
    ] as any;

    render(<DeviceTable devices={devices} removeDeviceFunction={removeDeviceFunction} />);

    expect(screen.getByText("Hostname")).toBeInTheDocument();
    expect(screen.getByText("miner-01")).toBeInTheDocument();
    expect(screen.getByText("miner-02")).toBeInTheDocument();

    // date formatter mocked
    expect(screen.getAllByText("01/20/26")).toHaveLength(2);

    // model column uses MinerData model mapping
    expect(screen.getByText("Model-A")).toBeInTheDocument();
    expect(screen.getByText("Model-B")).toBeInTheDocument();

    const uptimeCell = screen.getByText("10m").closest("td") as HTMLTableCellElement;
    expect(uptimeCell).toHaveAttribute("title", "10 minutes");

    fireEvent.click(screen.getByRole("button", { name: "Remove miner-02" }));
    expect(removeDeviceFunction).toHaveBeenCalledWith("bb");
  });
});
