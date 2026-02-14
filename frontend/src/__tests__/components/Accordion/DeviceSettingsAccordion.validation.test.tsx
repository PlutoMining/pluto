import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { DiscoveredMiner } from "@pluto/interfaces";

import { DeviceSettingsAccordion } from "@/components/Accordion";

jest.mock("@/providers/SocketProvider", () => ({
  useSocket: () => ({
    isConnected: false,
    socket: { on: jest.fn(), off: jest.fn() },
  }),
}));

const makeDiscoveredMiner = (): DiscoveredMiner => ({
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

describe("DeviceSettingsAccordion validation", () => {
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

  async function openFirstDetails(container: HTMLElement) {
    const details = container.querySelector("details") as HTMLDetailsElement;
    expect(details).not.toBeNull();

    await act(async () => {
      details.open = true;
      fireEvent(details, new Event("toggle"));
    });
    return details;
  }

  it("validates workerName and disables Save when invalid", async () => {
    const setAlert = jest.fn();
    const onOpenAlert = jest.fn();

    const { container } = render(
      <DeviceSettingsAccordion
        fetchedDevices={[makeDiscoveredMiner()]}
        alert={undefined}
        setAlert={setAlert as any}
        onOpenAlert={onOpenAlert}
      />
    );

    await waitFor(() => expect((global as any).fetch).toHaveBeenCalledWith("/api/presets"));

    const details = await openFirstDetails(container);
    const saveButton = within(details).getByRole("button", { name: "Save" });
    expect(saveButton).not.toBeDisabled();

    const workerName = details.querySelector("input#aa-workerName") as HTMLInputElement;
    expect(workerName).not.toBeNull();

    fireEvent.change(workerName, { target: { value: "bad name" } });
    expect(await screen.findByText("workerName is not correct.")).toBeInTheDocument();
    expect(saveButton).toBeDisabled();

    fireEvent.change(workerName, { target: { value: "worker1" } });
    await waitFor(() => {
      expect(screen.queryByText("workerName is not correct.")).toBeNull();
      expect(saveButton).not.toBeDisabled();
    });
  });

  // Note: legacy fanspeed/autofanspeed validation has been replaced by schema-driven
  // fan_mode controls (mode + speed + minimum_fans). The old behaviour of ignoring
  // fanspeed errors when autofanspeed is enabled no longer applies to the new UI,
  // so the corresponding test has been removed.

  it("validates stratumURL and stratumUser in custom mode", async () => {
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

    const saveButton = within(details).getByRole("button", { name: "Save" });
    expect(saveButton).not.toBeDisabled();

    const stratumURL = details.querySelector("input#aa-stratumUrl") as HTMLInputElement;
    fireEvent.change(stratumURL, { target: { value: "not a domain" } });
    expect(await screen.findByText("stratumURL is not correct.")).toBeInTheDocument();
    expect(saveButton).toBeDisabled();

    fireEvent.change(stratumURL, { target: { value: "pool.example.com" } });
    await waitFor(() => expect(screen.queryByText("stratumURL is not correct.")).toBeNull());

    const stratumUser = details.querySelector("input#aa-stratumUser") as HTMLInputElement;
    fireEvent.change(stratumUser, { target: { value: "wallet.withDot" } });
    expect(await screen.findByText("stratumUser is not correct.")).toBeInTheDocument();
    expect(saveButton).toBeDisabled();
  });

  it("flags required/invalid stratumPort values", async () => {
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

    const saveButton = within(details).getByRole("button", { name: "Save" });
    expect(saveButton).not.toBeDisabled();

    const port = details.querySelector("input#aa-stratumPort") as HTMLInputElement;
    fireEvent.change(port, { target: { value: "" } });
    expect(await screen.findByText("stratumPort is required.")).toBeInTheDocument();

    // JSDOM can normalize invalid values on <input type="number">; switch to text to ensure
    // the validator sees a non-numeric string.
    port.type = "text";
    fireEvent.change(port, { target: { value: "12ab34" } });
    expect(await screen.findByText("stratumPort is not correct.")).toBeInTheDocument();
  });

  it("disables Save when a required device field is empty", async () => {
    const device = makeDiscoveredMiner();
    // Clear stratumURL which is a required field
    if (device.minerData.config?.pools?.groups?.[0]?.pools?.[0]) {
      device.minerData.config.pools.groups[0].pools[0].url = "";
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
    const details = await openFirstDetails(container);

    const saveButton = within(details).getByRole("button", { name: "Save" });
    expect(saveButton).toBeDisabled();
  });
});
