import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { DeviceSettingsAccordion } from "@/components/Accordion";

jest.mock("@/providers/SocketProvider", () => ({
  useSocket: () => ({
    isConnected: false,
    socket: { on: jest.fn(), off: jest.fn() },
  }),
}));

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

  const makeDevice = () =>
    ({
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

  it("validates workerName and disables Save when invalid", async () => {
    const setAlert = jest.fn();
    const onOpenAlert = jest.fn();

    const { container } = render(
      <DeviceSettingsAccordion
        fetchedDevices={[makeDevice()]}
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

  it("ignores fanspeed validation errors when autofanspeed is enabled", async () => {
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

    const saveButton = within(details).getByRole("button", { name: "Save" });

    const auto = within(details).getByRole("checkbox", { name: "Automatic Fan Control" });
    expect(auto).toBeChecked();

    // Disable autofanspeed so fanspeed becomes editable.
    fireEvent.click(auto);
    expect(auto).not.toBeChecked();

    const fanspeed = details.querySelector("input#aa-fanspeed") as HTMLInputElement;
    expect(fanspeed).not.toBeNull();
    expect(fanspeed).not.toBeDisabled();

    fireEvent.change(fanspeed, { target: { value: "200" } });
    expect(await screen.findByText("fanspeed is not correct.")).toBeInTheDocument();
    expect(saveButton).toBeDisabled();

    // Also reject negative values.
    fireEvent.change(fanspeed, { target: { value: "-1" } });
    expect(await screen.findByText("fanspeed is not correct.")).toBeInTheDocument();

    // Restore a valid value.
    fireEvent.change(fanspeed, { target: { value: "50" } });
    await waitFor(() => expect(screen.queryByText("fanspeed is not correct.")).toBeNull());

    // Re-introduce an invalid value so hasErrorFields has something to ignore.
    fireEvent.change(fanspeed, { target: { value: "200" } });
    expect(await screen.findByText("fanspeed is not correct.")).toBeInTheDocument();

    // Re-enable autofanspeed; fanspeed errors should be ignored in hasErrorFields.
    fireEvent.click(auto);
    expect(auto).toBeChecked();
    expect(fanspeed).toBeDisabled();

    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
    });
  });

  it("validates stratumURL and stratumUser in custom mode", async () => {
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
        fetchedDevices={[makeDevice()]}
        alert={undefined}
        setAlert={jest.fn() as any}
        onOpenAlert={jest.fn()}
      />
    );

    await waitFor(() => expect((global as any).fetch).toHaveBeenCalledWith("/api/presets"));
    const details = await openFirstDetails(container);

    const port = details.querySelector("input#aa-stratumPort") as HTMLInputElement;
    fireEvent.change(port, { target: { value: "" } });

    // JSDOM can normalize invalid values on <input type="number">; switch to text to ensure
    // the validator sees a non-numeric string.
    port.type = "text";
    fireEvent.change(port, { target: { value: "12ab34" } });
  });

  it("disables Save when a required device field is empty", async () => {
    const device = makeDevice();
    device.info.hostname = "";

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
