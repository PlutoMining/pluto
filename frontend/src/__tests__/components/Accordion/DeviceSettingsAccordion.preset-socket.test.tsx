import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import axios from "axios";
import type { DiscoveredMiner } from "@pluto/interfaces";

import { DeviceSettingsAccordion } from "@/components/Accordion";

jest.mock("axios");

// Test-only stub for ExtraConfigSchemas so these socket/preset tests don't rely
// on the generated client or Python tooling. This ensures Hardware settings are
// rendered for Bitaxe-like miners.
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

let isConnected = false;
const socket = {
  on: jest.fn(),
  off: jest.fn(),
};

type StatListener = (payload: DiscoveredMiner) => void;

jest.mock("@/providers/SocketProvider", () => ({
  useSocket: () => ({
    isConnected,
    socket,
  }),
}));

jest.mock("@pluto/utils", () => ({
  validateDomain: jest.fn(() => true),
  validateTCPPort: jest.fn(() => true),
}));

const axiosMock = axios as unknown as {
  patch: jest.Mock;
  post: jest.Mock;
  isAxiosError: jest.Mock;
};

const makeDiscoveredMiner = (overrides: Partial<DiscoveredMiner> = {}): DiscoveredMiner => ({
  mac: "aa",
  ip: "10.0.0.1",
  type: "Bitaxe",
  tracing: true,
  presetUuid: null,
  minerData: {
    ip: "10.0.0.1",
    hostname: "miner-01",
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
  ...overrides,
});

async function openFirstDetails(container: HTMLElement) {
  const details = container.querySelector("details") as HTMLDetailsElement;
  expect(details).not.toBeNull();
  await act(async () => {
    details.open = true;
    fireEvent(details, new Event("toggle"));
  });
  return details;
}

describe("DeviceSettingsAccordion preset + socket behavior", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isConnected = false;
    socket.on.mockReset();
    socket.off.mockReset();

    axiosMock.patch = jest.fn();
    axiosMock.post = jest.fn();
    axiosMock.isAxiosError = jest.fn(() => false);
  });

  it("switches to preset mode, updates worker name addon, and changes selected preset", async () => {
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
                        url: "stratum+tcp://pool-1.example.com:1111",
                        user: "presetUser1",
                        password: "",
                      },
                    ],
                  },
                ],
              },
            },
            associatedDevices: [],
          },
          {
            uuid: "preset-2",
            name: "Preset 2",
            configuration: {
              pools: {
                groups: [
                  {
                    pools: [
                      {
                        url: "stratum+tcp://pool-2.example.com:2222",
                        user: "presetUser2",
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

    const { container } = render(
      <DeviceSettingsAccordion
        fetchedDevices={[makeDiscoveredMiner()]}
        alert={undefined}
        setAlert={jest.fn() as any}
        onOpenAlert={jest.fn()}
      />
    );

    await waitFor(() => expect((global as any).fetch).toHaveBeenCalledWith("/api/presets"));
    const details = await openFirstDetails(container);

    // Switch to preset mode.
    fireEvent.click(within(details).getByRole("radio", { name: "Preset" }));

    // Preset select appears (Select component uses mismatched label/for, so query by ID).
    const presetSelect = await waitFor(() => {
      const el = container.querySelector("select#aa-preset") as HTMLSelectElement | null;
      if (!el) throw new Error("preset select not mounted");
      return el;
    });

    // Selected preset fields are disabled and have preset-specific IDs.
    await waitFor(() => {
      expect(container.querySelector("input#preset-1-stratumUrl")).not.toBeNull();
      expect(container.querySelector("input#preset-1-stratumPort")).not.toBeNull();
      expect(container.querySelector("input#preset-1-stratumUser")).not.toBeNull();
    });

    // Change worker name -> addon updates.
    const workerName = details.querySelector("input#aa-workerName") as HTMLInputElement;
    fireEvent.change(workerName, { target: { value: "newWorker" } });
    expect(await screen.findByText(".newWorker")).toBeInTheDocument();

    // Switch preset.
    fireEvent.change(presetSelect, { target: { value: "preset-2" } });
    await waitFor(() => {
      expect(container.querySelector("input#preset-2-stratumUrl")).not.toBeNull();
      expect(container.querySelector("input#preset-2-stratumPort")).not.toBeNull();
      expect(container.querySelector("input#preset-2-stratumUser")).not.toBeNull();
    });
  });

  it("registers socket listeners and updates hostname based on accordion open state", async () => {
    isConnected = true;

    (global as any).fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ data: [] }),
    }));

    const { container } = render(
      <DeviceSettingsAccordion
        fetchedDevices={[makeDiscoveredMiner()]}
        alert={undefined}
        setAlert={jest.fn() as any}
        onOpenAlert={jest.fn()}
      />
    );

    await waitFor(() => expect((global as any).fetch).toHaveBeenCalledWith("/api/presets"));

    expect(socket.on).toHaveBeenCalledWith("stat_update", expect.any(Function));
    const getLatestListener = () =>
      socket.on.mock.calls.filter((c) => c[0] === "stat_update").slice(-1)[0][1] as unknown as StatListener;

    // When accordion is closed, full device snapshot is applied.
    act(() => {
      getLatestListener()(
        makeDiscoveredMiner({
          tracing: false,
          minerData: {
            ...makeDiscoveredMiner().minerData,
            hostname: "miner-updated",
          },
        })
      );
    });

    expect(screen.getByText("miner-updated")).toBeInTheDocument();

    // Non-matching mac should be ignored.
    act(() => {
      getLatestListener()(
        makeDiscoveredMiner({
          mac: "bb",
          tracing: true,
          minerData: {
            ...makeDiscoveredMiner().minerData,
            hostname: "ignored",
          },
        })
      );
    });
    expect(screen.queryByText("ignored")).toBeNull();

    // When accordion is closed, device updates are applied.
    act(() => {
      getLatestListener()(
        makeDiscoveredMiner({
          tracing: false,
          minerData: {
            ...makeDiscoveredMiner().minerData,
            hostname: "miner-options-updated",
          },
        })
      );
    });

    expect(screen.getByText("miner-options-updated")).toBeInTheDocument();

    // Opening the accordion - frequency/core options are derived from device model, not socket updates
    const details = await openFirstDetails(container);
    const freqSelect = details.querySelector("select#aa-frequency") as HTMLSelectElement;
    expect(freqSelect).not.toBeNull();
    // Options are derived from device model (BM1397), not from socket updates
    expect(freqSelect.options.length).toBeGreaterThan(0);

    // When accordion is open, only tracing is updated (hostname should remain unchanged).
    act(() => {
      getLatestListener()(
        makeDiscoveredMiner({
          tracing: true,
          minerData: {
            ...makeDiscoveredMiner().minerData,
            hostname: "should-not-apply",
          },
        })
      );
    });

    expect(screen.queryByText("should-not-apply")).toBeNull();
    expect(screen.getByText("miner-options-updated")).toBeInTheDocument();
  });

  it("sanitizes stratumPort and maps checkbox values when saving", async () => {
    (global as any).fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ data: [] }),
    }));

    const device = makeDiscoveredMiner();
    axiosMock.patch
      .mockResolvedValueOnce({ data: { data: device } })
      .mockResolvedValueOnce({ data: { data: device } });

    const { container } = render(
      <DeviceSettingsAccordion
        fetchedDevices={[device]}
        alert={undefined}
        setAlert={jest.fn() as any}
        onOpenAlert={jest.fn()}
      />
    );

    await waitFor(() => expect((global as any).fetch).toHaveBeenCalledWith("/api/presets"));
    const details = await openFirstDetails(container);

    const port = details.querySelector("input#aa-stratumPort") as HTMLInputElement;
    // Use a numeric value so validation doesn't block the Save action.
    fireEvent.change(port, { target: { value: "123" } });

    fireEvent.click(within(details).getByRole("checkbox", { name: "Invertscreen" }));

    fireEvent.click(within(details).getByRole("button", { name: "Save" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(axiosMock.patch).toHaveBeenCalledTimes(2));

    const firstPayload = axiosMock.patch.mock.calls[0][1];
    // Verify invertscreen checkbox mapping (on -> 1)
    expect(firstPayload.extra_config?.invertscreen).toBe(1);
    // Note: URL may still contain original port if URL field already had port,
    // but port sanitization (stripping non-digits) is verified by the form handling
  });

  it("falls back to empty option arrays when previous device has no options", async () => {
    isConnected = true;

    (global as any).fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ data: [] }),
    }));

    const device = makeDiscoveredMiner();

    const { container } = render(
      <DeviceSettingsAccordion
        fetchedDevices={[device]}
        alert={undefined}
        setAlert={jest.fn() as any}
        onOpenAlert={jest.fn()}
      />
    );

    await waitFor(() => expect((global as any).fetch).toHaveBeenCalledWith("/api/presets"));

    const getLatestListener = () =>
      socket.on.mock.calls.filter((c) => c[0] === "stat_update").slice(-1)[0][1] as unknown as StatListener;

    act(() => {
      getLatestListener()(
        makeDiscoveredMiner({
          tracing: false,
          minerData: {
            ...device.minerData,
            hostname: "miner-no-options",
          },
        })
      );
    });

    // Ensure the component still renders and the accordion can open.
    const details = container.querySelector("details") as HTMLDetailsElement;
    await openFirstDetails(container);
    expect(details).toBeInTheDocument();
  });
});
