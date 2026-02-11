import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { DiscoveredMiner } from "@pluto/interfaces";

import { DeviceSettingsAccordion } from "@/components/Accordion";

// Use a test-only stub for ExtraConfigSchemas so tests don't depend on the
// generated client or Python tooling. This mirrors the Bitaxe schema fields
// we care about for Hardware settings.
jest.mock("@pluto/pyasic-bridge-client", () => ({
  ExtraConfigSchemas: {
    bitaxe: {
      properties: {
        frequency: {
          anyOf: [
            { type: "integer", enum: [400, 490, 525, 550, 600, 625] },
            { type: "null" },
          ],
        },
        core_voltage: {
          anyOf: [
            { type: "integer", enum: [1000, 1060, 1100, 1150, 1200, 1250] },
            { type: "null" },
          ],
        },
        rotation: {
          anyOf: [
            { type: "integer", enum: [0, 90, 180, 270] },
            { type: "null" },
          ],
        },
        invertscreen: {
          anyOf: [
            { type: "integer", enum: [0, 1] },
            { type: "null" },
          ],
        },
        display_timeout: {
          anyOf: [
            { type: "integer", enum: [-1, 1, 2, 5, 15, 30, 60, 120, 240, 480] },
            { type: "null" },
          ],
        },
        overheat_mode: {
          anyOf: [
            { type: "integer", enum: [0, 1] },
            { type: "null" },
          ],
        },
        overclock_enabled: {
          anyOf: [
            { type: "integer", enum: [0, 1] },
            { type: "null" },
          ],
        },
        stats_frequency: {
          anyOf: [{ type: "integer" }, { type: "null" }],
        },
        min_fan_speed: {
          anyOf: [{ type: "integer" }, { type: "null" }],
        },
      },
    },
    espminer: {
      properties: {
        frequency: {
          anyOf: [
            { type: "integer", enum: [400, 490, 525, 550, 600, 625] },
            { type: "null" },
          ],
        },
      },
    },
  },
}));

jest.mock("@/providers/SocketProvider", () => ({
  useSocket: () => ({
    isConnected: false,
    socket: { on: jest.fn(), off: jest.fn() },
  }),
}));

const makeDiscoveredMiner = (mac: string, hostname: string): DiscoveredMiner => ({
  mac,
  ip: mac === "aa" ? "10.0.0.1" : "10.0.0.2",
  type: "Bitaxe",
  tracing: true,
  presetUuid: null,
  minerData: {
    ip: mac === "aa" ? "10.0.0.1" : "10.0.0.2",
    hostname,
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
                user: "user.worker",
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
  });

  it("enables bulk actions only when multiple devices are selected", async () => {
    const setAlert = jest.fn();
    const onOpenAlert = jest.fn();

    const devices = [
      makeDiscoveredMiner("aa", "miner-01"),
      makeDiscoveredMiner("bb", "miner-02"),
    ];

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

    const devices = [makeDiscoveredMiner("aa", "miner-01")];

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

  it("renders Hardware settings section for Bitaxe with schema-driven fields", async () => {
    const devices = [makeDiscoveredMiner("aa", "miner-01")];
    const { container } = render(
      <DeviceSettingsAccordion
        fetchedDevices={devices}
        alert={undefined}
        setAlert={jest.fn() as any}
        onOpenAlert={jest.fn()}
      />
    );
    await waitFor(() => expect((global as any).fetch).toHaveBeenCalledWith("/api/presets"));

    const details = container.querySelector("details") as HTMLDetailsElement;
    await act(async () => {
      details.open = true;
      fireEvent(details, new Event("toggle"));
    });

    expect(screen.getByText("Hardware settings")).toBeInTheDocument();
    expect(screen.getByText("Frequency")).toBeInTheDocument();
    expect(screen.getByText("Core Voltage")).toBeInTheDocument();
  });

  it("does not render Hardware settings section for default miner type", async () => {
    const antminer: DiscoveredMiner = {
      ...makeDiscoveredMiner("aa", "miner-01"),
      type: "Antminer S19",
      minerData: {
        ...makeDiscoveredMiner("aa", "miner-01").minerData,
        device_info: { model: "S19" },
      },
    };
    const { container } = render(
      <DeviceSettingsAccordion
        fetchedDevices={[antminer]}
        alert={undefined}
        setAlert={jest.fn() as any}
        onOpenAlert={jest.fn()}
      />
    );
    await waitFor(() => expect((global as any).fetch).toHaveBeenCalledWith("/api/presets"));

    const details = container.querySelector("details") as HTMLDetailsElement;
    await act(async () => {
      details.open = true;
      fireEvent(details, new Event("toggle"));
    });

    expect(screen.queryByText("Hardware settings")).not.toBeInTheDocument();
  });
});
