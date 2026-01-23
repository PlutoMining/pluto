import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { DeviceAccordion } from "@/components/Accordion/DeviceAccordion";

jest.mock("@/utils/minerMap", () => ({
  getMinerName: jest.fn(),
}));

jest.mock("@/utils/formatTime", () => ({
  formatDetailedTime: jest.fn(),
}));

const minerMap = jest.requireMock("@/utils/minerMap") as { getMinerName: jest.Mock };
const formatTime = jest.requireMock("@/utils/formatTime") as { formatDetailedTime: jest.Mock };

describe("DeviceAccordion", () => {
  it("renders empty state when no devices", () => {
    const removeFunction = jest.fn();
    render(<DeviceAccordion devices={[]} removeFunction={removeFunction} />);

    expect(screen.getByText("No device found")).toBeInTheDocument();
  });

  it("renders devices and calls removeFunction", () => {
    minerMap.getMinerName
      .mockImplementationOnce(() => "Antminer")
      .mockImplementationOnce(() => undefined);
    formatTime.formatDetailedTime
      .mockImplementationOnce(() => "10 minutes")
      .mockImplementationOnce(() => "20 minutes");

    const removeFunction = jest.fn();
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

    const { container } = render(
      <DeviceAccordion devices={devices} removeFunction={removeFunction} />
    );

    expect(screen.getByText("miner-01")).toBeInTheDocument();
    expect(screen.getByText("miner-02")).toBeInTheDocument();

    // Miner row falls back when getMinerName returns undefined.
    expect(screen.getByText("Antminer")).toBeInTheDocument();
    expect(screen.getAllByText("FallbackModel").length).toBeGreaterThanOrEqual(1);

    expect(screen.getByText("10 minutes")).toBeInTheDocument();
    expect(screen.getByText("20 minutes")).toBeInTheDocument();

    const details = Array.from(container.querySelectorAll("details"));
    expect(details).toHaveLength(2);
    expect(details[0]).not.toHaveClass("border-t");
    expect(details[1]).toHaveClass("border-t");

    const removeButtons = screen.getAllByRole("button", { name: "Remove" });
    fireEvent.click(removeButtons[1]);
    expect(removeFunction).toHaveBeenCalledWith("bb");
  });
});
