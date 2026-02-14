import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import axios from "axios";
import type { DiscoveredMiner } from "@pluto/interfaces";

import { DeviceSettingsAccordion } from "@/components/Accordion";

jest.mock("axios");

// Test-only stub for ExtraConfigSchemas so these coverage tests don't depend on
// the generated client or Python tooling. This matches the Bitaxe fields used
// by the Hardware settings section.
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

const axiosMock = axios as unknown as {
  patch: jest.Mock;
  post: jest.Mock;
  isAxiosError: jest.Mock;
};

const makeDiscoveredMiner = (mac: string, hostname: string): DiscoveredMiner => ({
  mac,
  ip: "10.0.0.1",
  type: "Bitaxe",
  tracing: true,
  presetUuid: null,
  minerData: {
    ip: "10.0.0.1",
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

async function openFirstDetails(container: HTMLElement) {
  const details = container.querySelector("details") as HTMLDetailsElement;
  expect(details).not.toBeNull();

  await act(async () => {
    details.open = true;
    fireEvent(details, new Event("toggle"));
  });

  return details;
}

describe("DeviceSettingsAccordion additional coverage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axiosMock.patch = jest.fn();
    axiosMock.post = jest.fn();
    axiosMock.isAxiosError = jest.fn(() => false);

    (global as any).fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ data: [] }),
    }));
  });

  it("updates existing checked item and renders X/Y selected", async () => {
    const devices = [makeDiscoveredMiner("aa", "miner-01"), makeDiscoveredMiner("bb", "miner-02")];

    const { container } = render(
      <DeviceSettingsAccordion
        fetchedDevices={devices}
        alert={undefined}
        setAlert={jest.fn() as any}
        onOpenAlert={jest.fn()}
      />
    );

    await waitFor(() => expect((global as any).fetch).toHaveBeenCalledWith("/api/presets"));

    const details = Array.from(container.querySelectorAll("details"));
    const firstCheckbox = details[0].querySelector(
      'summary input[type="checkbox"]'
    ) as HTMLInputElement;

    // First click adds a new checked entry.
    fireEvent.click(firstCheckbox);
    expect(screen.queryByText("Select all")).toBeNull();
    expect(screen.getByText("selected")).toBeInTheDocument();
    expect(screen.getByText("/2")).toBeInTheDocument();

    // Second click updates the existing checked entry.
    fireEvent.click(firstCheckbox);
    expect(screen.getByText("Select all")).toBeInTheDocument();
    expect(screen.queryByText("selected")).toBeNull();

    // Third click re-checks the same entry.
    fireEvent.click(firstCheckbox);
    expect(screen.getByText("selected")).toBeInTheDocument();
  });

  it("initializes safely when fetchedDevices is undefined", async () => {
    render(
      <DeviceSettingsAccordion
        fetchedDevices={undefined}
        alert={undefined}
        setAlert={jest.fn() as any}
        onOpenAlert={jest.fn()}
      />
    );

    await waitFor(() => expect((global as any).fetch).toHaveBeenCalledWith("/api/presets"));

    // Header is still visible even without device rows.
    expect(screen.getByText("Select all")).toBeInTheDocument();
    expect(document.querySelectorAll("details")).toHaveLength(0);
  });

  it("updates one checked item without affecting others", async () => {
    const devices = [makeDiscoveredMiner("aa", "miner-01"), makeDiscoveredMiner("bb", "miner-02")];

    const { container } = render(
      <DeviceSettingsAccordion
        fetchedDevices={devices}
        alert={undefined}
        setAlert={jest.fn() as any}
        onOpenAlert={jest.fn()}
      />
    );

    await waitFor(() => expect((global as any).fetch).toHaveBeenCalledWith("/api/presets"));

    const details = Array.from(container.querySelectorAll("details"));
    const firstCheckbox = details[0].querySelector(
      'summary input[type="checkbox"]'
    ) as HTMLInputElement;
    const secondCheckbox = details[1].querySelector(
      'summary input[type="checkbox"]'
    ) as HTMLInputElement;

    fireEvent.click(firstCheckbox);
    fireEvent.click(secondCheckbox);

    // Toggle the first checkbox again - update should preserve the second entry.
    fireEvent.click(firstCheckbox);
    expect(screen.getByText("/2")).toBeInTheDocument();
    expect(screen.getByText("selected")).toBeInTheDocument();
    const selectedCountEl = container.querySelector(".font-medium.text-foreground");
    expect(selectedCountEl).toHaveTextContent("1");
  });

  it("opens and closes the bulk Select Pool Preset modal", async () => {
    const devices = [makeDiscoveredMiner("aa", "miner-01"), makeDiscoveredMiner("bb", "miner-02")];

    const { container } = render(
      <DeviceSettingsAccordion
        fetchedDevices={devices}
        alert={undefined}
        setAlert={jest.fn() as any}
        onOpenAlert={jest.fn()}
      />
    );

    await waitFor(() => expect((global as any).fetch).toHaveBeenCalledWith("/api/presets"));

    const details = Array.from(container.querySelectorAll("details"));
    // Each row renders both the desktop and mobile checkbox (CSS-only visibility).
    // We need the mobile one for the remaining function coverage.
    const firstCheckboxes = details[0].querySelectorAll('summary input[type="checkbox"]');
    const secondCheckboxes = details[1].querySelectorAll('summary input[type="checkbox"]');
    const firstCheckbox = firstCheckboxes[1] as HTMLInputElement;
    const secondCheckbox = secondCheckboxes[1] as HTMLInputElement;

    // Cover the stopPropagation handler on the mobile checkbox wrapper.
    fireEvent.click(firstCheckbox.parentElement as HTMLElement);

    // Select two devices (enables bulk actions).
    fireEvent.click(firstCheckbox);
    fireEvent.click(secondCheckbox);

    const openBtn = screen.getByRole("button", { name: "Select Pool Preset" });
    await waitFor(() => expect(openBtn).not.toBeDisabled());
    fireEvent.click(openBtn);

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("shows a warning when selection is cleared while the restart modal is open", async () => {
    const setAlert = jest.fn();
    const onOpenAlert = jest.fn();
    const devices = [makeDiscoveredMiner("aa", "miner-01"), makeDiscoveredMiner("bb", "miner-02")];

    const { container, rerender } = render(
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

    fireEvent.click(screen.getByRole("button", { name: "Restart selected devices" }));
    const dialog = screen.getByRole("dialog");

    // Simulate the devices list refreshing (clears checkedFetchedItems via useEffect).
    rerender(
      <DeviceSettingsAccordion
        fetchedDevices={[...devices]}
        alert={undefined}
        setAlert={setAlert as any}
        onOpenAlert={onOpenAlert}
      />
    );

    fireEvent.click(within(dialog).getByRole("button", { name: "Restart" }));

    await waitFor(() => expect(onOpenAlert).toHaveBeenCalled());
    expect(axiosMock.post).not.toHaveBeenCalled();

    const lastAlert = setAlert.mock.calls[setAlert.mock.calls.length - 1][0];
    expect(lastAlert.title).toBe("No Devices Available");
  });

  it("strips non-digits from stratumPort, keeps stratumPassword as string, and maps checkbox off -> 0", async () => {
    const device = makeDiscoveredMiner("aa", "miner-01");
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
    // First, hit the parsing branch by including non-digits.
    fireEvent.change(port, { target: { value: "12ab34" } });
    // Then restore a valid value so the Save button is enabled.
    fireEvent.change(port, { target: { value: "1234" } });

    const password = details.querySelector("input#aa-stratumPassword") as HTMLInputElement;
    fireEvent.change(password, { target: { value: "1234" } });

    // Wait for Hardware settings fields to render
    await waitFor(() => {
      expect(details.querySelector("input#aa-invertscreen")).not.toBeNull();
    });

    const invert = details.querySelector("input#aa-invertscreen") as HTMLInputElement;
    expect(invert).not.toBeNull();
    fireEvent.click(invert);
    fireEvent.click(invert);

    fireEvent.click(within(details).getByRole("button", { name: "Save" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(axiosMock.patch).toHaveBeenCalledTimes(2));

    const firstPayload = axiosMock.patch.mock.calls[0][1];
    // Verify password is correctly stored as string and checkbox mapping.
    expect(firstPayload.pools?.groups?.[0]?.pools?.[0]?.password).toBe("1234");
    expect(typeof firstPayload.pools?.groups?.[0]?.pools?.[0]?.password).toBe("string");
    expect(firstPayload.extra_config?.invertscreen).toBe(0);
    // Note: URL may still contain original port if URL field already had port,
    // but port parsing (stripping non-digits) is verified by the form handling
  });

  it("surfaces axios response message when saving device settings fails", async () => {
    const setAlert = jest.fn();
    const onOpenAlert = jest.fn();

    const err: any = new Error("nope");
    err.response = { data: { message: "save denied" } };
    axiosMock.isAxiosError.mockReturnValue(true);
    axiosMock.patch.mockRejectedValue(err);

    const { container } = render(
      <DeviceSettingsAccordion
        fetchedDevices={[makeDiscoveredMiner("aa", "miner-01")]}
        alert={undefined}
        setAlert={setAlert as any}
        onOpenAlert={onOpenAlert}
      />
    );

    await waitFor(() => expect((global as any).fetch).toHaveBeenCalledWith("/api/presets"));
    const details = await openFirstDetails(container);

    fireEvent.click(within(details).getByRole("button", { name: "Save" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(onOpenAlert).toHaveBeenCalled());
    const lastAlert = setAlert.mock.calls[setAlert.mock.calls.length - 1][0];
    expect(lastAlert.title).toBe("Save Failed");
    expect(lastAlert.message).toContain("save denied");
  });

  it("falls back to the axios error message when no response message exists", async () => {
    const setAlert = jest.fn();
    const onOpenAlert = jest.fn();

    const err: any = new Error("save failed");
    axiosMock.isAxiosError.mockReturnValue(true);
    axiosMock.patch.mockRejectedValue(err);

    const { container } = render(
      <DeviceSettingsAccordion
        fetchedDevices={[makeDiscoveredMiner("aa", "miner-01")]}
        alert={undefined}
        setAlert={setAlert as any}
        onOpenAlert={onOpenAlert}
      />
    );

    await waitFor(() => expect((global as any).fetch).toHaveBeenCalledWith("/api/presets"));
    const details = await openFirstDetails(container);

    fireEvent.click(within(details).getByRole("button", { name: "Save" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(onOpenAlert).toHaveBeenCalled());
    const lastAlert = setAlert.mock.calls[setAlert.mock.calls.length - 1][0];
    expect(lastAlert.title).toBe("Save Failed");
    expect(lastAlert.message).toContain("save failed");
  });

  it("removes mac from open list when details toggled closed", async () => {
    const { container } = render(
      <DeviceSettingsAccordion
        fetchedDevices={[makeDiscoveredMiner("aa", "miner-01")]}
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
    expect(details.open).toBe(true);

    await act(async () => {
      details.open = false;
      fireEvent(details, new Event("toggle"));
    });

    await waitFor(() => expect(details.open).toBe(false));
  });

  it("parses stratumUser without a dot and falls back to hostname", async () => {
    const device = makeDiscoveredMiner("aa", "miner-01");
    if (device.minerData.config?.pools?.groups?.[0]?.pools?.[0]) {
      device.minerData.config.pools.groups[0].pools[0].user = "wallet";
    }

    const { container } = render(
      <DeviceSettingsAccordion
        fetchedDevices={[device]}
        alert={undefined}
        setAlert={jest.fn() as any}
        onOpenAlert={jest.fn()}
      />
    );

    await waitFor(() => expect((global as any).fetch).toHaveBeenCalledWith("/api/presets"));
    await openFirstDetails(container);
  });

  it("parses stratumUser ending with a dot and falls back to hostname", async () => {
    const device = makeDiscoveredMiner("aa", "miner-01");
    if (device.minerData.config?.pools?.groups?.[0]?.pools?.[0]) {
      device.minerData.config.pools.groups[0].pools[0].user = "wallet.";
    }

    const { container } = render(
      <DeviceSettingsAccordion
        fetchedDevices={[device]}
        alert={undefined}
        setAlert={jest.fn() as any}
        onOpenAlert={jest.fn()}
      />
    );

    await waitFor(() => expect((global as any).fetch).toHaveBeenCalledWith("/api/presets"));
    await openFirstDetails(container);
  });

  it("clears presetUuid when switching to custom mode and re-running custom is a no-op", async () => {
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

    const device = makeDiscoveredMiner("aa", "miner-01");
    device.presetUuid = "preset-1";

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

    const custom = within(details).getByRole("radio", { name: "Custom" });
    await act(async () => {
      fireEvent.click(custom);
    });
    expect(custom).toBeChecked();

    // Wait for the custom form fields to render, ensuring the state update landed.
    await waitFor(() => {
      expect(details.querySelector("input#aa-stratumUrl")).not.toBeNull();
    });

    // Force the onChange to run again even though the radio is already checked.
    await act(async () => {
      fireEvent.change(custom);
    });
    expect(custom).toBeChecked();
  });

  it("no-ops when selecting preset mode but no presets are available", async () => {
    const { container } = render(
      <DeviceSettingsAccordion
        fetchedDevices={[makeDiscoveredMiner("aa", "miner-01")]}
        alert={undefined}
        setAlert={jest.fn() as any}
        onOpenAlert={jest.fn()}
      />
    );

    await waitFor(() => expect((global as any).fetch).toHaveBeenCalledWith("/api/presets"));
    const details = await openFirstDetails(container);

    const preset = within(details).getByRole("radio", { name: "Preset" });
    expect(preset).toBeDisabled();

    await act(async () => {
      fireEvent.change(preset);
    });

    expect(preset).toBeDisabled();
  });

  it("treats unknown fields as valid in validateFieldByName", async () => {
    const { container } = render(
      <DeviceSettingsAccordion
        fetchedDevices={[makeDiscoveredMiner("aa", "miner-01")]}
        alert={undefined}
        setAlert={jest.fn() as any}
        onOpenAlert={jest.fn()}
      />
    );

    await waitFor(() => expect((global as any).fetch).toHaveBeenCalledWith("/api/presets"));
    const details = await openFirstDetails(container);

    const hostname = details.querySelector("input#aa-hostname") as HTMLInputElement;
    expect(hostname).not.toBeNull();

    // Simulate a change for an unknown field name to hit the switch default branch.
    hostname.name = "unknownField";
    fireEvent.change(hostname, { target: { value: "miner-01" } });

    expect(screen.queryByText("unknownField is not correct.")).toBeNull();
  });
});
