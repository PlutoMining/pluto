import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import type { DiscoveredMiner } from "@pluto/interfaces";

import { DeviceSettingsAccordion } from "@/components/Accordion";

jest.mock("axios");

jest.mock("@/providers/SocketProvider", () => ({
  useSocket: () => ({
    isConnected: false,
    socket: { on: jest.fn(), off: jest.fn() },
  }),
}));

jest.mock("@/components/Modal/SelectPresetModal", () => ({
  SelectPresetModal: ({ isOpen, onCloseSuccessfully }: any) => {
    if (!isOpen) return null;
    return (
      <div>
        <p>mock-select-preset-modal</p>
        <button type="button" onClick={() => onCloseSuccessfully("preset-1")}>
          mock-apply-preset
        </button>
      </div>
    );
  },
}));

const axiosMock = axios as unknown as {
  patch: jest.Mock;
  isAxiosError: jest.Mock;
};

const makeDiscoveredMiner = (mac: string): DiscoveredMiner => ({
  mac,
  ip: "10.0.0.1",
  type: "Bitaxe",
  tracing: true,
  presetUuid: null,
  minerData: {
    ip: "10.0.0.1",
    hostname: `miner-${mac}`,
    device_info: {
      model: "BM1397",
    },
    config: {
      pools: {
        groups: [
          {
            pools: [
              {
                url: "stratum+tcp://pool.example.com:3333",
                user: "orig.worker",
                password: "pass",
              },
            ],
          },
        ],
      },
      extra_config: {
        frequency: 100,
        core_voltage: 900,
        fanspeed: 50,
        autofanspeed: 1,
        flipscreen: 0,
        invertfanpolarity: 0,
      },
    },
  },
});

describe("DeviceSettingsAccordion bulk preset", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    axiosMock.patch = jest.fn();
    axiosMock.isAxiosError = jest.fn(() => false);

    (global as any).fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        data: [
          {
            uuid: "preset-1",
            name: "Preset 1",
            configuration: {
              pools: {
                groups: [
                  {
                    pools: [
                      {
                        url: "stratum+tcp://pool.example.com:3333",
                        user: "user",
                        password: "",
                      },
                    ],
                  },
                ],
              },
            },
            associatedDevices: [],
          },
        ],
      }),
    }));

    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("applies a preset to selected devices and updates alert", async () => {
    const setAlert = jest.fn();
    const onOpenAlert = jest.fn();

    const devices = [makeDiscoveredMiner("aa"), makeDiscoveredMiner("bb")];

    // For each device: /system then /imprint.
    const device1WithPreset = { ...devices[0], presetUuid: "preset-1" };
    const device2WithPreset = { ...devices[1], presetUuid: "preset-1" };
    axiosMock.patch
      .mockResolvedValueOnce({ data: { data: device1WithPreset } })
      .mockResolvedValueOnce({ data: { data: device1WithPreset } })
      .mockResolvedValueOnce({ data: { data: device2WithPreset } })
      .mockResolvedValueOnce({ data: { data: device2WithPreset } });

    render(
      <DeviceSettingsAccordion
        fetchedDevices={devices}
        alert={undefined}
        setAlert={setAlert as any}
        onOpenAlert={onOpenAlert}
      />
    );

    await waitFor(() => expect((global as any).fetch).toHaveBeenCalledWith("/api/presets"));

    // Select all -> enables bulk actions.
    fireEvent.click(screen.getByLabelText("Select all"));

    const selectPreset = screen.getByRole("button", { name: "Select Pool Preset" });
    expect(selectPreset).not.toBeDisabled();

    fireEvent.click(selectPreset);
    await screen.findByText("mock-select-preset-modal");

    fireEvent.click(screen.getByRole("button", { name: "mock-apply-preset" }));

    await waitFor(() => {
      expect(axiosMock.patch).toHaveBeenCalledTimes(4);
      // system patch sends MinerConfigModelInput (pools config) - presetUuid is not in system config
      expect(axiosMock.patch).toHaveBeenCalledWith(
        "/api/devices/aa/system",
        expect.objectContaining({
          pools: expect.objectContaining({
            groups: expect.arrayContaining([
              expect.objectContaining({
                pools: expect.arrayContaining([
                  expect.objectContaining({
                    url: expect.any(String),
                    user: expect.stringContaining("user"),
                  }),
                ]),
              }),
            ]),
          }),
        })
      );
      expect(axiosMock.patch).toHaveBeenCalledWith(
        "/api/devices/bb/system",
        expect.objectContaining({
          pools: expect.objectContaining({
            groups: expect.arrayContaining([
              expect.objectContaining({
                pools: expect.arrayContaining([
                  expect.objectContaining({
                    url: expect.any(String),
                    user: expect.stringContaining("user"),
                  }),
                ]),
              }),
            ]),
          }),
        })
      );
      // imprint patch includes presetUuid
      expect(axiosMock.patch).toHaveBeenCalledWith(
        "/api/devices/imprint/aa",
        expect.objectContaining({
          device: expect.objectContaining({
            presetUuid: "preset-1",
          }),
        })
      );
    });

    expect(onOpenAlert).toHaveBeenCalled();
    const lastAlert = setAlert.mock.calls[setAlert.mock.calls.length - 1][0];
    expect(lastAlert.title).toBe("Save Successful");
  });

  it("does not patch unchecked devices when applying a bulk preset", async () => {
    const setAlert = jest.fn();
    const onOpenAlert = jest.fn();

    const devices = [makeDiscoveredMiner("aa"), makeDiscoveredMiner("bb"), makeDiscoveredMiner("cc")];

    // For selected devices (aa, bb): /system then /imprint.
    const device1WithPreset = { ...devices[0], presetUuid: "preset-uuid" };
    const device2WithPreset = { ...devices[1], presetUuid: "preset-uuid" };
    axiosMock.patch
      .mockResolvedValueOnce({ data: { data: device1WithPreset } })
      .mockResolvedValueOnce({ data: { data: device1WithPreset } })
      .mockResolvedValueOnce({ data: { data: device2WithPreset } })
      .mockResolvedValueOnce({ data: { data: device2WithPreset } });

    const { container } = render(
      <DeviceSettingsAccordion
        fetchedDevices={devices}
        alert={undefined}
        setAlert={setAlert as any}
        onOpenAlert={onOpenAlert}
      />
    );

    await waitFor(() => expect((global as any).fetch).toHaveBeenCalledWith("/api/presets"));

    // Select two devices manually -> enables bulk actions.
    const details = Array.from(container.querySelectorAll("details"));
    fireEvent.click(details[0].querySelector('summary input[type="checkbox"]') as HTMLInputElement);
    fireEvent.click(details[1].querySelector('summary input[type="checkbox"]') as HTMLInputElement);

    const selectPreset = screen.getByRole("button", { name: "Select Pool Preset" });
    expect(selectPreset).not.toBeDisabled();

    fireEvent.click(selectPreset);
    await screen.findByText("mock-select-preset-modal");
    fireEvent.click(screen.getByRole("button", { name: "mock-apply-preset" }));

    await waitFor(() => {
      expect(axiosMock.patch).toHaveBeenCalledTimes(4);
    });

    expect(axiosMock.patch).not.toHaveBeenCalledWith(
      "/api/devices/cc/system",
      expect.anything()
    );

    expect(onOpenAlert).toHaveBeenCalled();
    const lastAlert = setAlert.mock.calls[setAlert.mock.calls.length - 1][0];
    expect(lastAlert.title).toBe("Save Successful");
  });

  it("keeps the original device when imprint returns no data", async () => {
    const setAlert = jest.fn();
    const onOpenAlert = jest.fn();

    const devices = [makeDiscoveredMiner("aa"), makeDiscoveredMiner("bb")];

    axiosMock.patch.mockImplementation((url: string) => {
      if (url.includes("/system")) {
        const mac = url.split("/api/devices/")[1]?.split("/system")[0];
        const base = devices.find((d) => d.mac === mac) ?? devices[0];
        return Promise.resolve({ data: { data: { ...base, presetUuid: "preset-1" } } });
      }

      if (url.includes("/imprint")) {
        return Promise.resolve({ data: { data: null } });
      }

      return Promise.reject(new Error(`Unexpected url: ${url}`));
    });

    const { container } = render(
      <DeviceSettingsAccordion
        fetchedDevices={devices}
        alert={undefined}
        setAlert={setAlert as any}
        onOpenAlert={onOpenAlert}
      />
    );

    await waitFor(() => expect((global as any).fetch).toHaveBeenCalledWith("/api/presets"));

    const details = Array.from(container.querySelectorAll("details"));
    fireEvent.click(details[0].querySelector('summary input[type="checkbox"]') as HTMLInputElement);
    fireEvent.click(details[1].querySelector('summary input[type="checkbox"]') as HTMLInputElement);

    fireEvent.click(screen.getByRole("button", { name: "Select Pool Preset" }));
    fireEvent.click(await screen.findByRole("button", { name: "mock-apply-preset" }));

    await waitFor(() => expect(axiosMock.patch).toHaveBeenCalledTimes(4));

    expect(onOpenAlert).toHaveBeenCalled();
    const lastAlert = setAlert.mock.calls[setAlert.mock.calls.length - 1][0];
    expect(lastAlert.title).toBe("Save Successful");
  });

  it("shows an error alert when applying preset fails", async () => {
    const setAlert = jest.fn();
    const onOpenAlert = jest.fn();

    const err: any = new Error("nope");
    err.response = { data: { message: "bulk preset denied" } };
    axiosMock.isAxiosError.mockReturnValue(true);
    axiosMock.patch.mockRejectedValueOnce(err);

    render(
      <DeviceSettingsAccordion
        fetchedDevices={[makeDiscoveredMiner("aa"), makeDiscoveredMiner("bb")]}
        alert={undefined}
        setAlert={setAlert as any}
        onOpenAlert={onOpenAlert}
      />
    );

    await waitFor(() => expect((global as any).fetch).toHaveBeenCalledWith("/api/presets"));
    fireEvent.click(screen.getByLabelText("Select all"));
    fireEvent.click(screen.getByRole("button", { name: "Select Pool Preset" }));
    fireEvent.click(await screen.findByRole("button", { name: "mock-apply-preset" }));

    await waitFor(() => expect(onOpenAlert).toHaveBeenCalled());
    const lastAlert = setAlert.mock.calls[setAlert.mock.calls.length - 1][0];
    expect(lastAlert.title).toBe("Save Failed");
    expect(lastAlert.message).toContain("bulk preset denied");
  });

  it("falls back to error.message when bulk preset axios error has no response message", async () => {
    const setAlert = jest.fn();
    const onOpenAlert = jest.fn();

    const err: any = new Error("preset failed");
    err.response = { data: {} };
    axiosMock.isAxiosError.mockReturnValue(true);
    axiosMock.patch.mockRejectedValueOnce(err);

    render(
      <DeviceSettingsAccordion
        fetchedDevices={[makeDiscoveredMiner("aa"), makeDiscoveredMiner("bb")]}
        alert={undefined}
        setAlert={setAlert as any}
        onOpenAlert={onOpenAlert}
      />
    );

    await waitFor(() => expect((global as any).fetch).toHaveBeenCalledWith("/api/presets"));
    fireEvent.click(screen.getByLabelText("Select all"));
    fireEvent.click(screen.getByRole("button", { name: "Select Pool Preset" }));
    fireEvent.click(await screen.findByRole("button", { name: "mock-apply-preset" }));

    await waitFor(() => expect(onOpenAlert).toHaveBeenCalled());
    const lastAlert = setAlert.mock.calls[setAlert.mock.calls.length - 1][0];
    expect(lastAlert.title).toBe("Save Failed");
    expect(lastAlert.message).toContain("preset failed");
  });
});
