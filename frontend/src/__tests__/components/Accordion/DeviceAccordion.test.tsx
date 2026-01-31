import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { DeviceAccordion } from "@/components/Accordion/DeviceAccordion";
import { createDeviceFixture } from "../../fixtures/pyasic-miner-info.fixture";

jest.mock("@/utils/formatTime", () => ({
  formatDetailedTime: jest.fn(),
}));

const formatTime = jest.requireMock("@/utils/formatTime") as { formatDetailedTime: jest.Mock };

describe("DeviceAccordion", () => {
  it("renders empty state when no devices", () => {
    const removeFunction = jest.fn();
    render(<DeviceAccordion devices={[]} removeFunction={removeFunction} />);

    expect(screen.getByText("No device found")).toBeInTheDocument();
  });

  it("renders pyasic-based device info and calls removeFunction", () => {
    formatTime.formatDetailedTime
      .mockImplementationOnce(() => "10 minutes")
      .mockImplementationOnce(() => "20 minutes");

    const removeFunction = jest.fn();
    const devices = [
      createDeviceFixture({
        ip: "10.0.0.1",
        mac: "aa",
        createdAt: "2026-01-20T00:00:00.000Z",
        tracing: true,
        info: {
          ...createDeviceFixture().info,
          hostname: "miner-01",
          device_info: {
            make: "Bitaxe",
            model: "Gamma",
            firmware: "v1",
            algo: "SHA256",
          },
          model: "Gamma",
          fw_ver: "v1",
          api_ver: "v1",
          uptime: 600,
        },
      }),
      createDeviceFixture({
        ip: "10.0.0.2",
        mac: "bb",
        createdAt: "2026-01-20T00:00:00.000Z",
        tracing: false,
        info: {
          ...createDeviceFixture().info,
          hostname: "miner-02",
          device_info: {
            make: "Unknown",
            model: "FallbackModel",
            firmware: "v2",
            algo: "SHA256",
          },
          model: "FallbackModel",
          fw_ver: "v2",
          api_ver: "v2",
          uptime: 1200,
        },
      }),
    ];

    const { container } = render(
      <DeviceAccordion devices={devices} removeFunction={removeFunction} />
    );

    expect(screen.getByText("miner-01")).toBeInTheDocument();
    expect(screen.getByText("miner-02")).toBeInTheDocument();

    // Miner / ASIC rows derive from pyasic device_info/model fields.
    expect(screen.getAllByText("Gamma").length).toBeGreaterThanOrEqual(1);
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
