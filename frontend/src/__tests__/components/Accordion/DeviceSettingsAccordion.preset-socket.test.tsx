import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import axios from "axios";

import { DeviceSettingsAccordion } from "@/components/Accordion";

jest.mock("axios");

let isConnected = false;
const socket = {
  on: jest.fn(),
  off: jest.fn(),
};

type StatListener = (payload: any) => void;

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

const makeDevice = (overrides: Partial<any> = {}) =>
  ({
    mac: "aa",
    ip: "10.0.0.1",
    tracing: true,
    presetUuid: null,
    info: {
      hostname: "miner-01",
      stratumUser: "orig.worker",
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
    ...overrides,
  }) as any;

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
              stratumURL: "pool-1.example.com",
              stratumPort: 1111,
              stratumUser: "presetUser1",
            },
            associatedDevices: [],
          },
          {
            uuid: "preset-2",
            name: "Preset 2",
            configuration: {
              stratumURL: "pool-2.example.com",
              stratumPort: 2222,
              stratumUser: "presetUser2",
            },
            associatedDevices: [],
          },
        ],
      }),
    }));

    const { container } = render(
      <DeviceSettingsAccordion
        fetchedDevices={[makeDevice()]}
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
        fetchedDevices={[makeDevice()]}
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
      getLatestListener()({
        mac: "aa",
        ip: "10.0.0.1",
        tracing: false,
        presetUuid: null,
        info: {
          ...makeDevice().info,
          hostname: "miner-updated",
          frequencyOptions: [],
          coreVoltageOptions: [],
        },
      });
    });

    expect(screen.getByText("miner-updated")).toBeInTheDocument();

    // Non-matching mac should be ignored.
    act(() => {
      getLatestListener()({
        mac: "bb",
        tracing: true,
        info: { ...makeDevice().info, hostname: "ignored" },
      });
    });
    expect(screen.queryByText("ignored")).toBeNull();

    // When accordion is closed, non-empty option arrays should replace previous ones.
    act(() => {
      getLatestListener()({
        mac: "aa",
        ip: "10.0.0.1",
        tracing: false,
        presetUuid: null,
        info: {
          ...makeDevice().info,
          hostname: "miner-options-updated",
          frequencyOptions: [{ label: "200", value: 200 }],
          coreVoltageOptions: [{ label: "800", value: 800 }],
        },
      });
    });

    expect(screen.getByText("miner-options-updated")).toBeInTheDocument();

    // Opening the accordion should keep frequency/core options even when event sends empty arrays.
    const details = await openFirstDetails(container);
    const freqSelect = details.querySelector("select#aa-frequency") as HTMLSelectElement;
    expect(freqSelect).not.toBeNull();
    expect(Array.from(freqSelect.options).some((o) => o.textContent === "200")).toBe(true);

    // When accordion is open, only tracing is updated (hostname should remain unchanged).
    act(() => {
      getLatestListener()({
        mac: "aa",
        tracing: true,
        info: { ...makeDevice().info, hostname: "should-not-apply" },
      });
    });

    expect(screen.queryByText("should-not-apply")).toBeNull();
    expect(screen.getByText("miner-options-updated")).toBeInTheDocument();
  });

  it("sanitizes stratumPort and maps checkbox values when saving", async () => {
    (global as any).fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ data: [] }),
    }));

    axiosMock.patch
      .mockResolvedValueOnce({ data: { data: { mac: "aa" } } })
      .mockResolvedValueOnce({ data: { data: { mac: "aa", info: { hostname: "miner-01" } } } });

    const { container } = render(
      <DeviceSettingsAccordion
        fetchedDevices={[makeDevice()]}
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

    fireEvent.click(within(details).getByRole("checkbox", { name: "Flip Screen" }));

    fireEvent.click(within(details).getByRole("button", { name: "Save" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(axiosMock.patch).toHaveBeenCalledTimes(2));

    const firstPayload = axiosMock.patch.mock.calls[0][1];
    expect(firstPayload.info.stratumPort).toBe(123);
    expect(firstPayload.info.flipscreen).toBe(1);
  });

  it("falls back to empty option arrays when previous device has no options", async () => {
    isConnected = true;

    (global as any).fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ data: [] }),
    }));

    const base = makeDevice();
    const device = makeDevice({
      info: {
        ...base.info,
        frequencyOptions: undefined,
        coreVoltageOptions: undefined,
      },
    });

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
      getLatestListener()({
        mac: "aa",
        ip: "10.0.0.1",
        tracing: false,
        presetUuid: null,
        info: {
          ...device.info,
          hostname: "miner-no-options",
          frequencyOptions: [],
          coreVoltageOptions: [],
        },
      });
    });

    // Ensure the component still renders and the accordion can open.
    const details = container.querySelector("details") as HTMLDetailsElement;
    await openFirstDetails(container);
    expect(details).toBeInTheDocument();
  });
});
