import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import axios from "axios";

import { DeviceSettingsAccordion } from "@/components/Accordion";

jest.mock("axios");

jest.mock("@/providers/SocketProvider", () => ({
  useSocket: () => ({
    isConnected: false,
    socket: { on: jest.fn(), off: jest.fn() },
  }),
}));

const axiosMock = axios as unknown as {
  post: jest.Mock;
  patch: jest.Mock;
  isAxiosError: jest.Mock;
};

const makeDevice = (mac: string, hostname: string) =>
  ({
    mac,
    ip: "10.0.0.1",
    tracing: true,
    presetUuid: null,
    info: {
      hostname,
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

describe("DeviceSettingsAccordion actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    axiosMock.post = jest.fn();
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

  it("keeps stratumURL as a string when saving an IP address", async () => {
    // Ensure we are in custom mode without presets so the save payload uses the edited device.info.
    (global as any).fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ data: [] }),
    }));

    axiosMock.patch
      .mockResolvedValueOnce({ data: { data: { mac: "aa" } } })
      .mockResolvedValueOnce({ data: { data: { mac: "aa", info: { hostname: "miner-01" } } } });

    const { container } = render(
      <DeviceSettingsAccordion
        fetchedDevices={[makeDevice("aa", "miner-01")]}
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

    const stratumUrl = details.querySelector("input#aa-stratumUrl") as HTMLInputElement;
    fireEvent.change(stratumUrl, { target: { value: "192.168.0.252" } });

    fireEvent.click(within(details).getByRole("button", { name: "Save" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(axiosMock.patch).toHaveBeenCalledTimes(2));

    const firstPayload = axiosMock.patch.mock.calls[0][1];
    expect(firstPayload.info.stratumURL).toBe("192.168.0.252");
  });

  it("restarts selected devices (success)", async () => {
    axiosMock.post.mockResolvedValue({ data: {} });

    const setAlert = jest.fn();
    const onOpenAlert = jest.fn();

    const devices = [makeDevice("aa", "miner-01"), makeDevice("bb", "miner-02")];

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
    const firstDeviceCheckbox = details[0].querySelector(
      'summary input[type="checkbox"]'
    ) as HTMLInputElement;
    const secondDeviceCheckbox = details[1].querySelector(
      'summary input[type="checkbox"]'
    ) as HTMLInputElement;

    fireEvent.click(firstDeviceCheckbox);
    fireEvent.click(secondDeviceCheckbox);

    const restartSelectedButton = screen.getByRole("button", { name: "Restart selected devices" });
    expect(restartSelectedButton).not.toBeDisabled();

    fireEvent.click(restartSelectedButton);
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Restart" }));

    await waitFor(() => {
      expect(axiosMock.post).toHaveBeenCalledTimes(2);
    });

    expect(onOpenAlert).toHaveBeenCalled();
    const lastAlert = setAlert.mock.calls[setAlert.mock.calls.length - 1][0];
    expect(lastAlert.title).toBe("Restart Successful");
  });

  it("restarts selected devices (axios error)", async () => {
    const err: any = new Error("boom");
    err.response = { data: { message: "nope" } };
    axiosMock.isAxiosError.mockReturnValue(true);
    axiosMock.post.mockRejectedValue(err);

    const setAlert = jest.fn();
    const onOpenAlert = jest.fn();

    const devices = [makeDevice("aa", "miner-01"), makeDevice("bb", "miner-02")];

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

    fireEvent.click(screen.getByRole("button", { name: "Restart selected devices" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Restart" }));

    await waitFor(() => {
      expect(onOpenAlert).toHaveBeenCalled();
    });

    const lastAlert = setAlert.mock.calls[setAlert.mock.calls.length - 1][0];
    expect(lastAlert.title).toBe("Restart Failed");
    expect(lastAlert.message).toContain("nope");
  });

  it("uses error.message when a restart-selected axios error has no response message", async () => {
    const err: any = new Error("timeout");
    err.response = { data: {} };
    axiosMock.isAxiosError.mockReturnValue(true);
    axiosMock.post.mockRejectedValue(err);

    const setAlert = jest.fn();
    const onOpenAlert = jest.fn();

    const devices = [makeDevice("aa", "miner-01"), makeDevice("bb", "miner-02")];

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

    fireEvent.click(screen.getByRole("button", { name: "Restart selected devices" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Restart" }));

    await waitFor(() => expect(onOpenAlert).toHaveBeenCalled());
    const lastAlert = setAlert.mock.calls[setAlert.mock.calls.length - 1][0];
    expect(lastAlert.title).toBe("Restart Failed");
    expect(lastAlert.message).toContain("timeout");
  });

  it("handles preset fetch failures", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    (global as any).fetch = jest.fn(async () => ({ ok: false }));

    render(
      <DeviceSettingsAccordion
        fetchedDevices={[makeDevice("aa", "miner-01")]}
        alert={undefined}
        setAlert={jest.fn() as any}
        onOpenAlert={jest.fn()}
      />
    );

    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith("Failed to fetch presets"));
    errorSpy.mockRestore();
  });

  it("handles preset fetch throw errors", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const err = new Error("network down");
    (global as any).fetch = jest.fn(() => Promise.reject(err));

    render(
      <DeviceSettingsAccordion
        fetchedDevices={[makeDevice("aa", "miner-01")]}
        alert={undefined}
        setAlert={jest.fn() as any}
        onOpenAlert={jest.fn()}
      />
    );

    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith("Error fetching presets", err));
    errorSpy.mockRestore();
  });

  it("saves settings via SaveAndRestartModal and can restart after saving", async () => {
    axiosMock.patch
      .mockResolvedValueOnce({ data: { data: { mac: "aa" } } })
      .mockResolvedValueOnce({ data: { data: { mac: "aa", info: { hostname: "miner-01" } } } });
    axiosMock.post.mockResolvedValue({ data: {} });

    const setAlert = jest.fn();
    const onOpenAlert = jest.fn();

    const { container } = render(
      <DeviceSettingsAccordion
        fetchedDevices={[makeDevice("aa", "miner-01")]}
        alert={undefined}
        setAlert={setAlert as any}
        onOpenAlert={onOpenAlert}
      />
    );

    await waitFor(() => expect((global as any).fetch).toHaveBeenCalledWith("/api/presets"));

    const details = container.querySelector("details") as HTMLDetailsElement;
    await act(async () => {
      details.open = true;
      fireEvent(details, new Event("toggle"));
    });

    // Trigger Save -> modal open
    fireEvent.click(within(details).getByRole("button", { name: "Save" }));
    fireEvent.click(screen.getByRole("radio", { name: "Save&Restart" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(axiosMock.patch).toHaveBeenCalledTimes(2);
      expect(axiosMock.post).toHaveBeenCalledWith("/api/devices/aa/system/restart");
    });

    const lastAlert = setAlert.mock.calls[setAlert.mock.calls.length - 1][0];
    expect(lastAlert.title).toContain("Restart went successfully");
  });

  it("uses the selected preset values when saving device settings", async () => {
    axiosMock.patch
      .mockResolvedValueOnce({ data: { data: { mac: "aa" } } })
      .mockResolvedValueOnce({ data: { data: { mac: "aa", info: { hostname: "miner-01" } } } });

    const device = makeDevice("aa", "miner-01");
    device.info.stratumUser = "other.worker";

    const { container } = render(
      <DeviceSettingsAccordion
        fetchedDevices={[device]}
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
      expect(within(details).getByRole("radio", { name: "Preset" })).not.toBeDisabled();
    });

    fireEvent.click(within(details).getByRole("radio", { name: "Preset" }));
    await waitFor(() => {
      expect(details.querySelector("select#aa-preset")).not.toBeNull();
    });

    fireEvent.click(within(details).getByRole("button", { name: "Save" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(axiosMock.patch).toHaveBeenCalledTimes(2));

    const firstPayload = axiosMock.patch.mock.calls[0][1];
    expect(firstPayload.presetUuid).toBe("preset-1");
    expect(firstPayload.info.stratumUser).toBe("user.worker");
  });

  it("restarts an individual device via RestartModal", async () => {
    axiosMock.post.mockResolvedValue({ data: {} });

    const setAlert = jest.fn();
    const onOpenAlert = jest.fn();

    const { container } = render(
      <DeviceSettingsAccordion
        fetchedDevices={[makeDevice("aa", "miner-01")]}
        alert={undefined}
        setAlert={setAlert as any}
        onOpenAlert={onOpenAlert}
      />
    );

    await waitFor(() => expect((global as any).fetch).toHaveBeenCalledWith("/api/presets"));

    const details = container.querySelector("details") as HTMLDetailsElement;
    // click the summary-level Restart button (desktop)
    const summary = details.querySelector("summary") as HTMLElement;
    fireEvent.click(within(summary).getByRole("button", { name: "Restart" }));

    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Restart" }));

    await waitFor(() => expect(axiosMock.post).toHaveBeenCalledWith("/api/devices/aa/system/restart"));

    const lastAlert = setAlert.mock.calls[setAlert.mock.calls.length - 1][0];
    expect(lastAlert.title).toBe("Restart went successfully");
  });

  it("shows an error alert when an individual restart fails", async () => {
    const err: any = new Error("boom");
    err.response = { data: { message: "restart denied" } };
    axiosMock.isAxiosError.mockReturnValue(true);
    axiosMock.post.mockRejectedValue(err);

    const setAlert = jest.fn();
    const onOpenAlert = jest.fn();

    const { container } = render(
      <DeviceSettingsAccordion
        fetchedDevices={[makeDevice("aa", "miner-01")]}
        alert={undefined}
        setAlert={setAlert as any}
        onOpenAlert={onOpenAlert}
      />
    );

    await waitFor(() => expect((global as any).fetch).toHaveBeenCalledWith("/api/presets"));

    const details = container.querySelector("details") as HTMLDetailsElement;
    const summary = details.querySelector("summary") as HTMLElement;
    fireEvent.click(within(summary).getByRole("button", { name: "Restart" }));

    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Restart" }));

    await waitFor(() => expect(onOpenAlert).toHaveBeenCalled());
    const lastAlert = setAlert.mock.calls[setAlert.mock.calls.length - 1][0];
    expect(lastAlert.title).toBe("Restart Failed");
    expect(lastAlert.message).toContain("restart denied");
  });

  it("uses error.message when an individual restart axios error has no response message", async () => {
    const err: any = new Error("unreachable");
    err.response = { data: {} };
    axiosMock.isAxiosError.mockReturnValue(true);
    axiosMock.post.mockRejectedValue(err);

    const setAlert = jest.fn();
    const onOpenAlert = jest.fn();

    const { container } = render(
      <DeviceSettingsAccordion
        fetchedDevices={[makeDevice("aa", "miner-01")]}
        alert={undefined}
        setAlert={setAlert as any}
        onOpenAlert={onOpenAlert}
      />
    );

    await waitFor(() => expect((global as any).fetch).toHaveBeenCalledWith("/api/presets"));

    const details = container.querySelector("details") as HTMLDetailsElement;
    const summary = details.querySelector("summary") as HTMLElement;
    fireEvent.click(within(summary).getByRole("button", { name: "Restart" }));

    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Restart" }));

    await waitFor(() => expect(onOpenAlert).toHaveBeenCalled());
    const lastAlert = setAlert.mock.calls[setAlert.mock.calls.length - 1][0];
    expect(lastAlert.title).toBe("Restart Failed");
    expect(lastAlert.message).toContain("unreachable");
  });

  it("opens the RestartModal from the mobile footer Restart button", async () => {
    const { container } = render(
      <DeviceSettingsAccordion
        fetchedDevices={[makeDevice("aa", "miner-01")]}
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

    const footerIp = within(details).getByText("IP");
    const footerContainer = footerIp.closest("div")?.parentElement;
    expect(footerContainer).not.toBeNull();
    fireEvent.click(within(footerContainer as HTMLElement).getByRole("button", { name: "Restart" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
