import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { DeviceSettingsAccordion } from "@/components/Accordion";

jest.mock("@/providers/SocketProvider", () => ({
  useSocket: () => ({
    isConnected: false,
    socket: { on: jest.fn(), off: jest.fn() },
  }),
}));

describe("DeviceSettingsAccordion", () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        data: [
          {
            uuid: "preset-1",
            name: "Preset 1",
            configuration: {
              stratumURL: "pool.example.com",
              stratumPort: 3333,
              stratumUser: "user",
            },
            associatedDevices: [],
          },
        ],
      }),
    }));
  });

  it("enables bulk actions only when multiple devices are selected", async () => {
    const setAlert = jest.fn();
    const onOpenAlert = jest.fn();

    const devices = [
      {
        mac: "aa",
        ip: "10.0.0.1",
        tracing: true,
        presetUuid: null,
        info: {
          hostname: "miner-01",
          stratumUser: "user.worker",
          stratumURL: "pool.example.com",
          stratumPort: 3333,
          stratumPassword: "pass",
          flipscreen: 0,
          invertfanpolarity: 0,
          autofanspeed: 1,
          fanspeed: 50,
          frequency: 100,
          frequencyOptions: [{ label: "100", value: 100 }],
          coreVoltage: 900,
          coreVoltageOptions: [{ label: "900", value: 900 }],
        },
      },
      {
        mac: "bb",
        ip: "10.0.0.2",
        tracing: true,
        presetUuid: null,
        info: {
          hostname: "miner-02",
          stratumUser: "user.worker",
          stratumURL: "pool.example.com",
          stratumPort: 3333,
          stratumPassword: "pass",
          flipscreen: 0,
          invertfanpolarity: 0,
          autofanspeed: 1,
          fanspeed: 50,
          frequency: 100,
          frequencyOptions: [{ label: "100", value: 100 }],
          coreVoltage: 900,
          coreVoltageOptions: [{ label: "900", value: 900 }],
        },
      },
    ] as any;

    const { container } = render(
      <DeviceSettingsAccordion
        fetchedDevices={devices}
        alert={undefined}
        setAlert={setAlert as any}
        onOpenAlert={onOpenAlert}
      />
    );

    await waitFor(() => expect((global as any).fetch).toHaveBeenCalledWith("/api/presets"));

    const selectPresetButton = screen.getByRole("button", { name: "Select Pool Preset" });
    const restartSelectedButton = screen.getByRole("button", { name: "Restart selected devices" });
    expect(selectPresetButton).toBeDisabled();
    expect(restartSelectedButton).toBeDisabled();

    const details = Array.from(container.querySelectorAll("details"));
    expect(details).toHaveLength(2);

    const firstDeviceCheckbox = details[0].querySelector(
      'summary input[type="checkbox"]'
    ) as HTMLInputElement;
    const secondDeviceCheckbox = details[1].querySelector(
      'summary input[type="checkbox"]'
    ) as HTMLInputElement;

    expect(firstDeviceCheckbox).toBeInTheDocument();
    expect(secondDeviceCheckbox).toBeInTheDocument();

    // Select first device.
    fireEvent.click(firstDeviceCheckbox);
    expect(selectPresetButton).toBeDisabled();
    expect(restartSelectedButton).toBeDisabled();

    // Select second device.
    fireEvent.click(secondDeviceCheckbox);
    expect(selectPresetButton).not.toBeDisabled();
    expect(restartSelectedButton).not.toBeDisabled();
  });

  it("tracks details open state and closes when selecting all", async () => {
    const setAlert = jest.fn();
    const onOpenAlert = jest.fn();

    const devices = [
      {
        mac: "aa",
        ip: "10.0.0.1",
        tracing: true,
        presetUuid: null,
        info: {
          hostname: "miner-01",
          stratumUser: "user.worker",
          stratumURL: "pool.example.com",
          stratumPort: 3333,
          stratumPassword: "pass",
          flipscreen: 0,
          invertfanpolarity: 0,
          autofanspeed: 1,
          fanspeed: 50,
          frequency: 100,
          frequencyOptions: [{ label: "100", value: 100 }],
          coreVoltage: 900,
          coreVoltageOptions: [{ label: "900", value: 900 }],
        },
      },
    ] as any;

    const { container } = render(
      <DeviceSettingsAccordion
        fetchedDevices={devices}
        alert={undefined}
        setAlert={setAlert as any}
        onOpenAlert={onOpenAlert}
      />
    );

    await waitFor(() => expect((global as any).fetch).toHaveBeenCalledWith("/api/presets"));

    const details = container.querySelector("details") as HTMLDetailsElement;
    expect(details).toBeInTheDocument();
    expect(details.open).toBe(false);

    await act(async () => {
      details.open = true;
      fireEvent(details, new Event("toggle"));
    });
    expect(details.open).toBe(true);

    const selectAll = container.querySelector("#select-all-devices") as HTMLInputElement;
    expect(selectAll).toBeInTheDocument();

    fireEvent.click(selectAll);
    expect(details.open).toBe(false);
  });
});
