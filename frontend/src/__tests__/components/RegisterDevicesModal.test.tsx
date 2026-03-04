import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

jest.mock("axios", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

jest.mock("../../components/Table", () => {
  return {
    RegisterDeviceTable: ({ devices, onChange, handleAllCheckbox }: any) => {
      return (
        <div>
          <p>{`mock-table devices:${devices.length}`}</p>
          <button type="button" onClick={() => onChange(0)}>
            mock-toggle-first
          </button>
          <button type="button" onClick={() => handleAllCheckbox?.(true)}>
            mock-select-all
          </button>
        </div>
      );
    },
  };
});

jest.mock("../../components/ProgressBar/CircularProgressWithDots", () => {
  return {
    CircularProgressWithDots: () => <div>mock-loading</div>,
  };
});

import axios from "axios";

import {
  hasEmptyFields,
  hasErrorFields,
  RegisterDevicesModal,
} from "@/components/Modal/RegisterDevicesModal";

const mockedAxios = axios as unknown as {
  get: jest.Mock;
  patch: jest.Mock;
};

describe("RegisterDevicesModal", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockedAxios.get.mockReset();
    mockedAxios.patch.mockReset();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("validates nested error/empty field helpers", () => {
    expect(hasEmptyFields({ ipAddress: "", macAddress: "" })).toBe(true);
    expect(hasEmptyFields({ nested: { ipAddress: "", macAddress: "aa:bb:cc:dd:ee:ff" } })).toBe(
      true
    );
    expect(hasEmptyFields({ nested: { ipAddress: "192.168.0.10", macAddress: "aa:bb" } })).toBe(
      false
    );
    expect(hasEmptyFields({ nested: null, ipAddress: "" })).toBe(true);

    expect(hasErrorFields({ ipAddress: "", macAddress: "" })).toBe(false);
    expect(hasErrorFields({ nested: { ipAddress: "", macAddress: "" } })).toBe(false);
    expect(hasErrorFields({ nested: { ipAddress: "error", macAddress: "" } })).toBe(true);
    expect(hasErrorFields({ nested: null, ipAddress: "error" })).toBe(true);
  });

  it("manually searches and registers a single device", async () => {
    const onClose = jest.fn();
    const onDevicesChanged = jest.fn().mockResolvedValue(undefined);

    mockedAxios.get
      .mockResolvedValueOnce({
        data: [{ ip: "192.168.0.10", mac: "00:00:00:00:00:00" }],
      })
      .mockResolvedValueOnce({
        data: { data: [] },
      });
    mockedAxios.patch.mockResolvedValueOnce({});

    render(
      <RegisterDevicesModal isOpen={true} onClose={onClose} onDevicesChanged={onDevicesChanged} />
    );

    await screen.findByRole("dialog");

    const search = screen.getByRole("button", { name: "Search" });
    expect(search).toBeDisabled();

    fireEvent.change(screen.getByLabelText("IP Address"), { target: { value: "999" } });
    expect(screen.getByText("ipAddress is not valid")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("IP Address"), { target: { value: "192.168.0.10" } });
    fireEvent.change(screen.getByLabelText("MAC Address"), {
      target: { value: "aa:bb:cc:dd:ee:ff" },
    });

    expect(screen.queryByText("ipAddress is not valid")).toBeNull();
    expect(screen.getByRole("button", { name: "Search" })).not.toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await screen.findByText("Result for aa:bb:cc:dd:ee:ff");

    fireEvent.click(screen.getByRole("button", { name: "Add device" }));

    await waitFor(() => {
      expect(mockedAxios.patch).toHaveBeenCalledWith("/api/devices/imprint", {
        mac: "aa:bb:cc:dd:ee:ff",
      });
      expect(onDevicesChanged).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it("allows manual search by IP only and uses backend MAC", async () => {
    const onClose = jest.fn();
    const onDevicesChanged = jest.fn().mockResolvedValue(undefined);

    mockedAxios.get
      .mockResolvedValueOnce({
        data: [{ ip: "192.168.0.10", mac: "11:22:33:44:55:66" }],
      })
      .mockResolvedValueOnce({
        data: { data: [] },
      });
    mockedAxios.patch.mockResolvedValueOnce({});

    render(
      <RegisterDevicesModal isOpen={true} onClose={onClose} onDevicesChanged={onDevicesChanged} />
    );

    await screen.findByRole("dialog");

    const search = screen.getByRole("button", { name: "Search" });
    expect(search).toBeDisabled();

    fireEvent.change(screen.getByLabelText("IP Address"), { target: { value: "192.168.0.10" } });
    expect(search).not.toBeDisabled();

    fireEvent.click(search);

    await screen.findByText("Result for 192.168.0.10");

    fireEvent.click(screen.getByRole("button", { name: "Add device" }));

    await waitFor(() => {
      expect(mockedAxios.patch).toHaveBeenCalledWith("/api/devices/imprint", {
        mac: "11:22:33:44:55:66",
      });
      expect(onDevicesChanged).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it("auto-discovers devices and registers selected devices", async () => {
    const onClose = jest.fn();
    const onDevicesChanged = jest.fn().mockResolvedValue(undefined);

    mockedAxios.get
      .mockResolvedValueOnce({ data: { data: [] } })
      .mockResolvedValueOnce({
        status: 200,
        data: [
          {
            ip: "192.168.0.11",
            mac: "aa:aa:aa:aa:aa:aa",
            info: { hostname: "old" },
          },
          {
            ip: "192.168.0.12",
            mac: "bb:bb:bb:bb:bb:bb",
            info: { hostname: "new" },
          },
        ],
      });

    mockedAxios.patch.mockResolvedValue({});

    render(
      <RegisterDevicesModal isOpen={true} onClose={onClose} onDevicesChanged={onDevicesChanged} />
    );

    await screen.findByRole("dialog");

    fireEvent.click(screen.getByRole("button", { name: "Auto discovery" }));

    await screen.findByText(/new devices found/i);
    expect(screen.getByText("mock-table devices:2")).toBeInTheDocument();

    const add = screen.getByRole("button", { name: /Add/i });
    expect(add).toBeDisabled();

    // Toggle individual checkbox (covers handleCheckbox)
    fireEvent.click(screen.getByRole("button", { name: "mock-toggle-first" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Add 1 device" })).not.toBeDisabled();
    });

    // Also cover the header "Select all" checkbox handler
    fireEvent.click(screen.getByRole("checkbox", { name: /select all/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Add 2 device" })).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Add 2 device" }));
    await waitFor(() => {
      expect(mockedAxios.patch).toHaveBeenNthCalledWith(1, "/api/devices/imprint", {
        mac: "aa:aa:aa:aa:aa:aa",
      });
      expect(mockedAxios.patch).toHaveBeenNthCalledWith(2, "/api/devices/imprint", {
        mac: "bb:bb:bb:bb:bb:bb",
      });
      expect(onDevicesChanged).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it("logs when auto-discovery request throws", async () => {
    const onClose = jest.fn();
    const onDevicesChanged = jest.fn().mockResolvedValue(undefined);

    mockedAxios.get.mockRejectedValueOnce(new Error("nope"));

    render(
      <RegisterDevicesModal isOpen={true} onClose={onClose} onDevicesChanged={onDevicesChanged} />
    );

    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "Auto discovery" }));

    await screen.findByText("No device found.");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error discovering devices:",
      expect.any(Error)
    );
  });

  it("shows 'No device found' when manual search returns empty results", async () => {
    const onClose = jest.fn();
    const onDevicesChanged = jest.fn().mockResolvedValue(undefined);

    mockedAxios.get
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: { data: [] } });

    render(
      <RegisterDevicesModal isOpen={true} onClose={onClose} onDevicesChanged={onDevicesChanged} />
    );

    await screen.findByRole("dialog");

    fireEvent.change(screen.getByLabelText("IP Address"), { target: { value: "192.168.0.10" } });
    fireEvent.change(screen.getByLabelText("MAC Address"), {
      target: { value: "aa:bb:cc:dd:ee:ff" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByText("No device found")).toBeInTheDocument();
  });

  it("keeps search disabled when validation errors exist", async () => {
    const onClose = jest.fn();
    const onDevicesChanged = jest.fn().mockResolvedValue(undefined);

    render(
      <RegisterDevicesModal isOpen={true} onClose={onClose} onDevicesChanged={onDevicesChanged} />
    );

    await screen.findByRole("dialog");

    const search = screen.getByRole("button", { name: "Search" });
    expect(search).toBeDisabled();

    // Invalid IP only => still disabled
    fireEvent.change(screen.getByLabelText("IP Address"), { target: { value: "999" } });
    expect(screen.getByText("ipAddress is not valid")).toBeInTheDocument();
    expect(search).toBeDisabled();

    // Clear IP -> both fields empty => disabled, no validation error
    fireEvent.change(screen.getByLabelText("IP Address"), { target: { value: "" } });
    expect(screen.queryByText("ipAddress is not valid")).toBeNull();
    expect(search).toBeDisabled();

    // Valid IP only => enabled
    fireEvent.change(screen.getByLabelText("IP Address"), { target: { value: "192.168.0.10" } });
    expect(search).not.toBeDisabled();

    // Invalid MAC alongside valid IP => disabled
    fireEvent.change(screen.getByLabelText("MAC Address"), { target: { value: "not-a-mac" } });
    expect(screen.getByText("macAddress is not valid")).toBeInTheDocument();
    expect(search).toBeDisabled();

    // Clear MAC again -> back to only valid IP => enabled
    fireEvent.change(screen.getByLabelText("MAC Address"), { target: { value: "" } });
    expect(screen.queryByText("macAddress is not valid")).toBeNull();
    expect(search).not.toBeDisabled();
  });

  it("logs when auto-discovery returns a non-200 response", async () => {
    const onClose = jest.fn();
    const onDevicesChanged = jest.fn().mockResolvedValue(undefined);

    mockedAxios.get
      .mockResolvedValueOnce({ data: { data: [] } })
      .mockResolvedValueOnce({ status: 500, data: [] });

    render(
      <RegisterDevicesModal isOpen={true} onClose={onClose} onDevicesChanged={onDevicesChanged} />
    );

    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "Auto discovery" }));

    await screen.findByText("No device found.");
    expect(consoleErrorSpy).toHaveBeenCalledWith("Error discovering devices:", 500);
  });

  it("logs when manual discovery request fails", async () => {
    const onClose = jest.fn();
    const onDevicesChanged = jest.fn().mockResolvedValue(undefined);

    mockedAxios.get.mockRejectedValueOnce(new Error("nope"));

    render(
      <RegisterDevicesModal isOpen={true} onClose={onClose} onDevicesChanged={onDevicesChanged} />
    );

    await screen.findByRole("dialog");

    fireEvent.change(screen.getByLabelText("IP Address"), { target: { value: "192.168.0.10" } });
    fireEvent.change(screen.getByLabelText("MAC Address"), {
      target: { value: "aa:bb:cc:dd:ee:ff" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error discovering devices:",
        expect.any(Error)
      );
    });
  });

  it("logs when registering a device fails", async () => {
    const onClose = jest.fn();
    const onDevicesChanged = jest.fn().mockResolvedValue(undefined);

    mockedAxios.get
      .mockResolvedValueOnce({
        data: [{ ip: "192.168.0.10", mac: "00:00:00:00:00:00" }],
      })
      .mockResolvedValueOnce({
        data: { data: [] },
      });
    mockedAxios.patch.mockRejectedValueOnce(new Error("nope"));

    render(
      <RegisterDevicesModal isOpen={true} onClose={onClose} onDevicesChanged={onDevicesChanged} />
    );

    await screen.findByRole("dialog");

    fireEvent.change(screen.getByLabelText("IP Address"), { target: { value: "192.168.0.10" } });
    fireEvent.change(screen.getByLabelText("MAC Address"), {
      target: { value: "aa:bb:cc:dd:ee:ff" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await screen.findByText("Result for aa:bb:cc:dd:ee:ff");

    fireEvent.click(screen.getByRole("button", { name: "Add device" }));

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error registering device:",
        expect.any(Error)
      );
    });

    expect(onDevicesChanged).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("logs when registering devices fails", async () => {
    const onClose = jest.fn();
    const onDevicesChanged = jest.fn().mockResolvedValue(undefined);

    mockedAxios.get
      .mockResolvedValueOnce({ data: { data: [] } })
      .mockResolvedValueOnce({
        status: 200,
        data: [
          {
            ip: "192.168.0.12",
            mac: "bb:bb:bb:bb:bb:bb",
            info: { hostname: "new" },
          },
        ],
      });

    mockedAxios.patch.mockRejectedValueOnce(new Error("nope"));

    render(
      <RegisterDevicesModal isOpen={true} onClose={onClose} onDevicesChanged={onDevicesChanged} />
    );

    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "Auto discovery" }));

    await screen.findByText(/new devices found/i);

    fireEvent.click(screen.getByRole("button", { name: "mock-select-all" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Add 1 device" })).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Add 1 device" }));
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error registering devices:",
        expect.any(Error)
      );
    });

    expect(onDevicesChanged).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes via the modal header close button", async () => {
    const onClose = jest.fn();
    const onDevicesChanged = jest.fn().mockResolvedValue(undefined);

    render(
      <RegisterDevicesModal isOpen={true} onClose={onClose} onDevicesChanged={onDevicesChanged} />
    );

    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("switches back to the manual tab", async () => {
    const onClose = jest.fn();
    const onDevicesChanged = jest.fn().mockResolvedValue(undefined);

    mockedAxios.get
      .mockResolvedValueOnce({ data: { data: [] } })
      .mockResolvedValueOnce({ status: 200, data: [] });

    render(
      <RegisterDevicesModal isOpen={true} onClose={onClose} onDevicesChanged={onDevicesChanged} />
    );

    await screen.findByRole("dialog");

    fireEvent.click(screen.getByRole("button", { name: "Auto discovery" }));
    await screen.findByText("No device found.");

    fireEvent.click(screen.getByRole("button", { name: "Manually" }));
    expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
  });
});
