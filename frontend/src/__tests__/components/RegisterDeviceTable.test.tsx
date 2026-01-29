import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { RegisterDeviceTable } from "@/components/Table/RegisterDeviceTable";

jest.mock("@/utils/minerMap", () => ({
  getMinerName: jest.fn(() => undefined),
}));

describe("RegisterDeviceTable", () => {
  it("renders an empty state when no devices are present", () => {
    render(
      <RegisterDeviceTable
        devices={[] as any}
        allChecked={false}
        onChange={jest.fn()}
        checkedItems={[]}
        handleAllCheckbox={jest.fn()}
        selectedTab={0}
      />
    );

    expect(screen.getByText("No device found")).toBeInTheDocument();
  });

  it("wires up header and per-row checkbox handlers (desktop + mobile)", () => {
    const onChange = jest.fn();
    const handleAllCheckbox = jest.fn();

    const devices = [
      {
        ip: "10.0.0.1",
        mac: "aa",
        info: {
          hostname: "miner-01",
          boardVersion: "x",
          deviceModel: "FallbackModel",
          ASICModel: "S19",
          version: "v1",
        },
      },
    ] as any;

    const { container } = render(
      <RegisterDeviceTable
        devices={devices}
        allChecked={false}
        onChange={onChange}
        checkedItems={[false]}
        handleAllCheckbox={handleAllCheckbox}
        selectedTab={2}
      />
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Hostname" }));
    expect(handleAllCheckbox).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByRole("checkbox", { name: "miner-01" }));
    expect(onChange).toHaveBeenCalledWith(0);

    const mobileCheckbox = container.querySelector(
      "summary input[type='checkbox']"
    ) as HTMLInputElement;
    expect(mobileCheckbox).not.toBeNull();

    fireEvent.click(mobileCheckbox);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("shows a gradient overlay when content is scrollable", async () => {
    const OriginalResizeObserver = (global as any).ResizeObserver;
    const observeSpy = jest.fn();
    const unobserveSpy = jest.fn();
    const observedHeights: Array<{ scrollHeight: number; clientHeight: number }> = [];

    (global as any).ResizeObserver = class ResizeObserver {
      private cb: () => void;

      constructor(cb: () => void) {
        this.cb = cb;
      }

      observe(target: Element) {
        observeSpy();
        Object.defineProperty(target, "scrollHeight", { value: 200, configurable: true });
        Object.defineProperty(target, "clientHeight", { value: 100, configurable: true });
        observedHeights.push({
          scrollHeight: (target as any).scrollHeight,
          clientHeight: (target as any).clientHeight,
        });
        this.cb();
      }

      unobserve(target: Element) {
        unobserveSpy(target);
      }
      disconnect() {}
    };

    const devices = [
      {
        ip: "10.0.0.1",
        mac: "aa",
        info: {
          hostname: "miner-01",
          boardVersion: "x",
          deviceModel: "FallbackModel",
          ASICModel: "S19",
          version: "v1",
        },
      },
    ] as any;

    try {
      const { container, unmount } = render(
        <RegisterDeviceTable
          devices={devices}
          allChecked={false}
          onChange={jest.fn()}
          checkedItems={[false]}
          handleAllCheckbox={jest.fn()}
          selectedTab={0}
        />
      );

      const overlay = container.querySelector(
        "div.pointer-events-none.absolute.bottom-0.left-0"
      ) as HTMLDivElement;
      expect(overlay).not.toBeNull();
      expect(observeSpy).toHaveBeenCalledTimes(1);
      expect(observedHeights[0]).toEqual({ scrollHeight: 200, clientHeight: 100 });

      await waitFor(() => {
        expect(overlay.getAttribute("data-has-scroll")).toBe("true");
      });

      unmount();
      expect(unobserveSpy).toHaveBeenCalled();
    } finally {
      (global as any).ResizeObserver = OriginalResizeObserver;
    }
  });
});
