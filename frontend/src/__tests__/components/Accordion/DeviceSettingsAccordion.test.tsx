import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { DiscoveredMiner } from "@pluto/interfaces";

import { DeviceSettingsAccordion } from "@/components/Accordion";


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
  supportLevel: "native",
  tracing: true,
  presetUuid: null,
  minerData: {
    ip: mac === "aa" ? "10.0.0.1" : "10.0.0.2",
    hostname,
    fans: [],
    hashboards: [],
    deviceInfo: {
      model: "BM1397",
    },
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
    bitaxe: {
      frequency: 100,
      coreVoltage: 900,
      fanspeed: 50,
      autofanspeed: 1,
      invertscreen: 0,
    },
  } as any,
});

const defaultConfigForm = {
  schema: {
    sections: [
      {
        key: "hardware",
        label: "Hardware Settings",
        columns: 4,
        fields: [
          {
            name: "frequency",
            label: "Frequency",
            type: "select",
            options: [{ label: "490 MHz", value: 490 }],
          },
          {
            name: "coreVoltage",
            label: "Core Voltage",
            type: "number",
          },
          {
            name: "invertscreen",
            label: "Invert Screen",
            type: "checkbox",
          },
        ],
      },
    ],
  },
  values: { frequency: 490, coreVoltage: 900, invertscreen: 0 },
};

function createFetchMock(options?: {
  presets?: { data: unknown[] };
  configForm?: { schema: { sections: unknown[] }; values: Record<string, unknown> };
}) {
  return jest.fn(async (url: string) => {
    if (url === "/api/presets") {
      return {
        ok: true,
        json: async () =>
          options?.presets ?? {
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
          },
      };
    }
    if (url.match(/^\/api\/devices\/[^/]+\/config\/form$/)) {
      const cf = options?.configForm ?? defaultConfigForm;
      return { ok: true, json: async () => cf };
    }
    return { ok: false };
  });
}

describe("DeviceSettingsAccordion", () => {
  beforeEach(() => {
    (global as any).fetch = createFetchMock();
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

    // Wait for Hardware settings fields to render after opening accordion
    await waitFor(() => {
      expect(container.querySelector("#aa-frequency")).not.toBeNull();
    });

    const frequencyField = container.querySelector("#aa-frequency");
    const coreVoltageField = container.querySelector("#aa-coreVoltage");

    expect(frequencyField).not.toBeNull();
    expect(coreVoltageField).not.toBeNull();
  });

  it("does not render Hardware settings section when config form returns empty schema", async () => {
    (global as any).fetch = createFetchMock({
      configForm: { schema: { sections: [] }, values: {} },
    });

    const antminer: DiscoveredMiner = {
      ...makeDiscoveredMiner("aa", "miner-01"),
      type: "Antminer S19",
      minerData: {
        ...makeDiscoveredMiner("aa", "miner-01").minerData,
        deviceInfo: { model: "S19" },
      },
    } as any;
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

    await waitFor(() => {
      expect((global as any).fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/devices\/aa\/config\/form$/)
      );
    });
    await waitFor(() => {
      expect(container.querySelector("#aa-frequency")).toBeNull();
      expect(container.querySelector("#aa-coreVoltage")).toBeNull();
    });
  });
});
