import type { Request, Response } from "express";
import type { Device } from "@pluto/interfaces";
import axios from "axios";
import * as deviceController from "@/controllers/devices.controller";
import { pyasicBridgeClient } from "@/services/pyasic-bridge.service";

jest.mock("axios");
jest.mock("@/services/device.service", () => ({
  discoverDevices: jest.fn(),
  lookupMultipleDiscoveredDevices: jest.fn(),
  imprintDevices: jest.fn(),
  getImprintedDevices: jest.fn(),
  getImprintedDevice: jest.fn(),
  getDevicesByPresetId: jest.fn(),
  patchImprintedDevice: jest.fn(),
  deleteImprintedDevice: jest.fn(),
  listenToDevices: jest.fn(),
}));
jest.mock("@/services/presets.service", () => ({
  getPreset: jest.fn(),
}));
jest.mock("@/services/pyasic-bridge.service", () => ({
  pyasicBridgeClient: {
    restartMiner: jest.fn(),
    updateMinerConfig: jest.fn(),
  },
}));
jest.mock("@pluto/logger", () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

const deviceService = jest.requireMock("@/services/device.service");
const presetsService = jest.requireMock("@/services/presets.service");
const mockedAxios = axios as jest.Mocked<typeof axios>;
const axiosIsAxiosError = mockedAxios.isAxiosError as unknown as jest.Mock;
const mockedPyasicBridgeClient = pyasicBridgeClient as jest.Mocked<typeof pyasicBridgeClient>;

const createMockResponse = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

describe("devices.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axiosIsAxiosError.mockReturnValue(false);
  });

  describe("discoverDevices", () => {
    it("returns discovered devices", async () => {
      const req = { query: { ip: "1.1.1.1" } } as unknown as Request;
      const res = createMockResponse();
      deviceService.discoverDevices.mockResolvedValue([{ mac: 'xx' }]);

      await deviceController.discoverDevices(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([{ mac: 'xx' }]);
    });

    it("handles discoverDevices errors", async () => {
      const req = { query: {} } as unknown as Request;
      const res = createMockResponse();
      deviceService.discoverDevices.mockRejectedValue(new Error('fail'));

      await deviceController.discoverDevices(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Discovery service failed' });
    });
  });

  describe("getDiscoveredDevices", () => {
    it("parses getDiscoveredDevices query params", async () => {
      const req = {
        query: {
          macs: "aa,bb",
          ips: "1.1.1.1",
          hostnames: "rig",
          partialMacs: "left",
          partialIps: "right",
          partialHostnames: "none",
        },
      } as unknown as Request;
      const res = createMockResponse();
      deviceService.lookupMultipleDiscoveredDevices.mockResolvedValue([]);

      await deviceController.getDiscoveredDevices(req, res as unknown as Response);

      expect(deviceService.lookupMultipleDiscoveredDevices).toHaveBeenCalledWith({
        macs: ["aa", "bb"],
        ips: ["1.1.1.1"],
        hostnames: ["rig"],
        partialMatch: { macs: "left", ips: "right", hostnames: "none" },
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("handles getDiscoveredDevices errors", async () => {
      const req = { query: {} } as unknown as Request;
      const res = createMockResponse();
      deviceService.lookupMultipleDiscoveredDevices.mockRejectedValue(new Error('boom'));

      await deviceController.getDiscoveredDevices(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Discovery service failed' });
    });
  });

  describe("imprintDevices", () => {
    it("returns data when available", async () => {
      const req = { body: { macs: ["xx"] } } as unknown as Request;
      const res = createMockResponse();
      deviceService.imprintDevices.mockResolvedValue([{ mac: "xx" }]);

      await deviceController.imprintDevices(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Devices imprint successful",
        data: [{ mac: "xx" }],
      });
    });

    it("returns 404 when empty", async () => {
      const req = { body: { macs: ["xx"] } } as unknown as Request;
      const res = createMockResponse();
      deviceService.imprintDevices.mockResolvedValue([]);

      await deviceController.imprintDevices(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("handles service errors", async () => {
      const req = { body: { macs: ["xx"] } } as unknown as Request;
      const res = createMockResponse();
      deviceService.imprintDevices.mockRejectedValue(new Error('service error'));

      await deviceController.imprintDevices(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Failed to process the request" });
    });
  });

  describe("imprintDevice", () => {
    it("merges macs with existing", async () => {
      const req = { body: { mac: "new" } } as unknown as Request;
      const res = createMockResponse();
      deviceService.getImprintedDevices.mockResolvedValue([{ mac: "old" }]);
      deviceService.imprintDevices.mockResolvedValue([{ mac: "old" }, { mac: "new" }]);

      await deviceController.imprintDevice(req, res as unknown as Response);

      expect(deviceService.imprintDevices).toHaveBeenCalledWith(["old", "new"]);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns 404 when imprinting yields no devices", async () => {
      const req = { body: { mac: "new" } } as unknown as Request;
      const res = createMockResponse();
      deviceService.getImprintedDevices.mockResolvedValue([{ mac: 'old' }]);
      deviceService.imprintDevices.mockResolvedValue([]);

      await deviceController.imprintDevice(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("handles service errors", async () => {
      const req = { body: { mac: "new" } } as unknown as Request;
      const res = createMockResponse();
      deviceService.getImprintedDevices.mockRejectedValue(new Error('service error'));

      await deviceController.imprintDevice(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Failed to process the request" });
    });
  });

  describe("getImprintedDevices", () => {
    it("enriches options from miner-type factory", async () => {
      const req = { query: { q: "10.0" } } as unknown as Request;
      const res = createMockResponse();
      deviceService.getImprintedDevices.mockResolvedValue([
        { mac: "x", info: { make: "Other", model: "Unknown" } },
      ] as unknown as Device[]);

      await deviceController.getImprintedDevices(req, res as unknown as Response);

      const payload = res.json.mock.calls[0][0];
      expect(payload.data[0].info.frequencyOptions).toBeDefined();
      expect(payload.data[0].info.frequencyOptions).toEqual([]);
      expect(payload.data[0].info.coreVoltageOptions).toEqual([]);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("enriches BitAxe with preset options when make/model contains bitaxe", async () => {
      const req = { query: {} } as unknown as Request;
      const res = createMockResponse();
      deviceService.getImprintedDevices.mockResolvedValue([
        { mac: "x", info: { make: "Bitaxe", model: "BM1397" } },
      ] as unknown as Device[]);

      await deviceController.getImprintedDevices(req, res as unknown as Response);

      const payload = res.json.mock.calls[0][0];
      expect(payload.data[0].info.frequencyOptions).toBeDefined();
      expect(payload.data[0].info.frequencyOptions.length).toBeGreaterThan(0);
      expect(payload.data[0].info.coreVoltageOptions).toBeDefined();
      expect(payload.data[0].info.coreVoltageOptions.length).toBeGreaterThan(0);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("handles unknown miner type with empty options", async () => {
      const req = { query: {} } as unknown as Request;
      const res = createMockResponse();
      deviceService.getImprintedDevices.mockResolvedValue([
        { mac: "x", info: { make: "Acme", model: "UNKNOWN_MODEL" } },
      ] as unknown as Device[]);

      await deviceController.getImprintedDevices(req, res as unknown as Response);

      const payload = res.json.mock.calls[0][0];
      expect(payload.data[0].info.frequencyOptions).toEqual([]);
      expect(payload.data[0].info.coreVoltageOptions).toEqual([]);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("uses factory only (no device-provided options fallback)", async () => {
      const req = { query: {} } as unknown as Request;
      const res = createMockResponse();
      deviceService.getImprintedDevices.mockResolvedValue([
        {
          mac: "x",
          info: {
            make: "Other",
            model: "X1",
            frequencyOptions: [{ label: "500", value: 500 }],
            coreVoltageOptions: [{ label: "1100", value: 1100 }],
          },
        },
      ] as unknown as Device[]);

      await deviceController.getImprintedDevices(req, res as unknown as Response);

      const payload = res.json.mock.calls[0][0];
      expect(payload.data[0].info.frequencyOptions).toEqual([]);
      expect(payload.data[0].info.coreVoltageOptions).toEqual([]);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("handles service errors", async () => {
      const req = { query: {} } as unknown as Request;
      const res = createMockResponse();
      deviceService.getImprintedDevices.mockRejectedValue(new Error('fail'));

      await deviceController.getImprintedDevices(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Failed to process the request" });
    });
  });

  describe("getImprintedDevice", () => {
    it("proxies response", async () => {
      const req = { params: { id: "mac" } } as unknown as Request;
      const res = createMockResponse();
      deviceService.getImprintedDevice.mockResolvedValue({ mac: "mac" });

      await deviceController.getImprintedDevice(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Device retrieved successfully",
        data: { mac: "mac" },
      });
    });

    it("handles errors", async () => {
      const req = { params: { id: "mac" } } as unknown as Request;
      const res = createMockResponse();
      deviceService.getImprintedDevice.mockRejectedValue(new Error('fail'));

      await deviceController.getImprintedDevice(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("patchImprintedDevice", () => {
    it("handles success", async () => {
      const req = { params: { id: "mac" }, body: { device: {} } } as unknown as Request;
      const res = createMockResponse();
      deviceService.patchImprintedDevice.mockResolvedValue({ mac: "mac" });

      await deviceController.patchImprintedDevice(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("handles not found", async () => {
      const req = { params: { id: "mac" }, body: { device: {} } } as unknown as Request;
      const res = createMockResponse();
      deviceService.patchImprintedDevice.mockResolvedValue(null);

      await deviceController.patchImprintedDevice(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("handles errors gracefully", async () => {
      const req = { params: { id: "mac" }, body: { device: {} } } as unknown as Request;
      const res = createMockResponse();
      deviceService.patchImprintedDevice.mockRejectedValue(new Error('fail'));

      await deviceController.patchImprintedDevice(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("deleteImprintedDevice", () => {
    it("returns 404 when not found", async () => {
      const req = { params: { id: "mac" } } as unknown as Request;
      const res = createMockResponse();
      deviceService.deleteImprintedDevice.mockResolvedValue(null);

      await deviceController.deleteImprintedDevice(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("handles errors", async () => {
      const req = { params: { id: "mac" } } as unknown as Request;
      const res = createMockResponse();
      deviceService.deleteImprintedDevice.mockRejectedValue(new Error('fail'));

      await deviceController.deleteImprintedDevice(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it("returns 200 when device deleted", async () => {
      const req = { params: { id: "mac" } } as unknown as Request;
      const res = createMockResponse();
      deviceService.deleteImprintedDevice.mockResolvedValue({ mac: "mac" });

      await deviceController.deleteImprintedDevice(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Device deleted successfully",
        data: { mac: "mac" },
      });
    });
  });

  describe("putListenDevices", () => {
    it("filters macs before listening", async () => {
      const req = { body: { macs: ["match"], traceLogs: true } } as unknown as Request;
      const res = createMockResponse();
      deviceService.getImprintedDevices.mockResolvedValue([
        { mac: "match" },
        { mac: "other" },
      ] as unknown as Device[]);
      deviceService.listenToDevices.mockResolvedValue([{ mac: "match" }]);

      await deviceController.putListenDevices(req, res as unknown as Response);

      expect(deviceService.listenToDevices).toHaveBeenCalledWith([{ mac: "match" }], true);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("handles service failures", async () => {
      const req = { body: { macs: ["match"] } } as unknown as Request;
      const res = createMockResponse();
      deviceService.getImprintedDevices.mockRejectedValue(new Error('fail'));

      await deviceController.putListenDevices(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("restartDevice", () => {
    it("restarts real miner via pyasic-bridge by ip", async () => {
      const req = { params: { id: "mac" } } as unknown as Request;
      const res = createMockResponse();
      deviceService.getImprintedDevices.mockResolvedValue([
        { mac: "mac", ip: "10.0.0.2" },
      ] as unknown as Device[]);

      await deviceController.restartDevice(req, res as unknown as Response);

      expect(mockedPyasicBridgeClient.restartMiner).toHaveBeenCalledWith("10.0.0.2");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Device restarted successfully",
        data: { mac: "mac", ip: "10.0.0.2" },
      });
    });

    it("restarts mock miner via pyasic-bridge by ip", async () => {
      const req = { params: { id: "ff:ff:ff:ff:00:01" } } as unknown as Request;
      const res = createMockResponse();
      deviceService.getImprintedDevices.mockResolvedValue([
        { mac: "ff:ff:ff:ff:00:01", ip: "10.0.0.2", source: "mock" },
      ] as unknown as Device[]);

      await deviceController.restartDevice(req, res as unknown as Response);

      // Mock devices use the same unified endpoint as real devices
      expect(mockedPyasicBridgeClient.restartMiner).toHaveBeenCalledWith("10.0.0.2");
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("handles missing device", async () => {
      const req = { params: { id: "unknown" } } as unknown as Request;
      const res = createMockResponse();
      deviceService.getImprintedDevices.mockResolvedValue([]);

      await deviceController.restartDevice(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 400 when IP missing", async () => {
      const req = { params: { id: "mac" } } as unknown as Request;
      const res = createMockResponse();
      deviceService.getImprintedDevices.mockResolvedValue([
        { mac: "mac", ip: undefined },
      ] as unknown as Device[]);

      await deviceController.restartDevice(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Device IP not available" });
    });

    it("maps axios errors from pyasic-bridge", async () => {
      const req = { params: { id: "mac" } } as unknown as Request;
      const res = createMockResponse();
      deviceService.getImprintedDevices.mockResolvedValue([
        { mac: "mac", ip: "10.0.0.2" },
      ] as unknown as Device[]);
      const axiosError = new Error("network") as any;
      axiosError.response = { status: 503, data: { message: "down" } };
      mockedPyasicBridgeClient.restartMiner.mockRejectedValue(axiosError);
      axiosIsAxiosError.mockReturnValue(true);

      await deviceController.restartDevice(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        error: "Failed to restart the device via pyasic-bridge",
        details: { message: "down" },
      });
    });

    it("handles non-axios errors", async () => {
      const req = { params: { id: "mac" } } as unknown as Request;
      const res = createMockResponse();
      deviceService.getImprintedDevices.mockResolvedValue([
        { mac: "mac", ip: "10.0.0.2" },
      ] as unknown as Device[]);
      mockedPyasicBridgeClient.restartMiner.mockRejectedValue(new Error("generic error"));
      axiosIsAxiosError.mockReturnValue(false);

      await deviceController.restartDevice(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Failed to process the request" });
    });

    it("handles axios errors without response status", async () => {
      const req = { params: { id: "mac" } } as unknown as Request;
      const res = createMockResponse();
      deviceService.getImprintedDevices.mockResolvedValue([
        { mac: "mac", ip: "10.0.0.2" },
      ] as unknown as Device[]);
      const axiosError = new Error("network") as any;
      mockedPyasicBridgeClient.restartMiner.mockRejectedValue(axiosError);
      axiosIsAxiosError.mockReturnValue(true);

      await deviceController.restartDevice(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Failed to restart the device via pyasic-bridge",
        details: "network",
      });
    });
  });

  describe("patchDeviceSystemInfo", () => {
    beforeEach(() => {
      deviceService.patchImprintedDevice.mockResolvedValue({});
    });

    it("updates real miner via preset data with number port", async () => {
      const req = {
        params: { id: "mac" },
        body: { presetUuid: "preset", info: {}, mac: "mac" },
      } as unknown as Request;
      const res = createMockResponse();
      deviceService.getImprintedDevices.mockResolvedValue([
        { mac: "mac", ip: "10.0.0.3" },
      ] as unknown as Device[]);
      presetsService.getPreset.mockResolvedValue({
        name: "Test Preset",
        configuration: { stratumPort: 4444, stratumURL: "pool", stratumPassword: "secret" },
      });
      mockedPyasicBridgeClient.updateMinerConfig.mockResolvedValue();

      await deviceController.patchDeviceSystemInfo(req, res as unknown as Response);

      expect(mockedPyasicBridgeClient.updateMinerConfig).toHaveBeenCalledWith(
        "10.0.0.3",
        expect.objectContaining({
          stratumPort: 4444,
          stratumURL: "pool",
          stratumPassword: "secret",
        }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("converts string port to number from preset", async () => {
      const req = {
        params: { id: "mac" },
        body: { presetUuid: "preset", info: {}, mac: "mac" },
      } as unknown as Request;
      const res = createMockResponse();
      deviceService.getImprintedDevices.mockResolvedValue([
        { mac: "mac", ip: "10.0.0.3" },
      ] as unknown as Device[]);
      presetsService.getPreset.mockResolvedValue({
        name: "Test Preset",
        configuration: {
          stratumPort: "3333",
          stratumURL: "pool.example.com",
          stratumPassword: "pass",
        },
      });
      mockedPyasicBridgeClient.updateMinerConfig.mockResolvedValue();

      await deviceController.patchDeviceSystemInfo(req, res as unknown as Response);

      expect(mockedPyasicBridgeClient.updateMinerConfig).toHaveBeenCalledWith(
        "10.0.0.3",
        expect.objectContaining({
          stratumPort: 3333,
          stratumURL: "pool.example.com",
          stratumPassword: "pass",
        }),
      );
    });

    it("creates info object when applying preset and info is missing", async () => {
      const req = {
        params: { id: "mac" },
        body: { presetUuid: "preset", mac: "mac" },
      } as unknown as Request;
      const res = createMockResponse();
      deviceService.getImprintedDevices.mockResolvedValue([
        { mac: "mac", ip: "10.0.0.3" },
      ] as unknown as Device[]);
      presetsService.getPreset.mockResolvedValue({
        name: "Test Preset",
        configuration: {
          stratumPort: "3333",
          stratumURL: "pool.example.com",
          stratumPassword: "pass",
        },
      });
      mockedPyasicBridgeClient.updateMinerConfig.mockResolvedValue();

      await deviceController.patchDeviceSystemInfo(req, res as unknown as Response);

      expect(mockedPyasicBridgeClient.updateMinerConfig).toHaveBeenCalledWith(
        "10.0.0.3",
        expect.objectContaining({
          stratumPort: 3333,
          stratumURL: "pool.example.com",
          stratumPassword: "pass",
        }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("defaults to 0 when preset port is invalid", async () => {
      const req = {
        params: { id: "mac" },
        body: { presetUuid: "preset", info: {}, mac: "mac" },
      } as unknown as Request;
      const res = createMockResponse();
      deviceService.getImprintedDevices.mockResolvedValue([
        { mac: "mac", ip: "10.0.0.3" },
      ] as unknown as Device[]);
      presetsService.getPreset.mockResolvedValue({
        name: "Test Preset",
        configuration: { stratumPort: "", stratumURL: "pool", stratumPassword: "secret" },
      });
      mockedPyasicBridgeClient.updateMinerConfig.mockResolvedValue();

      await deviceController.patchDeviceSystemInfo(req, res as unknown as Response);

      expect(mockedPyasicBridgeClient.updateMinerConfig).toHaveBeenCalledWith(
        "10.0.0.3",
        expect.objectContaining({
          stratumPort: 0,
        }),
      );
    });

    it("updates without preset", async () => {
      const req = {
        params: { id: "mac" },
        body: { info: { stratumPort: 5555, stratumURL: "custom.pool.com" }, mac: "mac" },
      } as unknown as Request;
      const res = createMockResponse();
      deviceService.getImprintedDevices.mockResolvedValue([
        { mac: "mac", ip: "10.0.0.3" },
      ] as unknown as Device[]);
      mockedPyasicBridgeClient.updateMinerConfig.mockResolvedValue();

      await deviceController.patchDeviceSystemInfo(req, res as unknown as Response);

      expect(mockedPyasicBridgeClient.updateMinerConfig).toHaveBeenCalledWith(
        "10.0.0.3",
        expect.objectContaining({
          stratumPort: 5555,
          stratumURL: "custom.pool.com",
        }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("forwards frequency and voltage via config.extra_config (pyasic model)", async () => {
      const req = {
        params: { id: "mac" },
        body: {
          mac: "mac",
          info: {
            config: {
              extra_config: { frequency: 525, core_voltage: 1150 },
              pools: { groups: [{ pools: [{ url: "stratum+tcp://pool:3333", user: "u", password: "" }], quota: 1, name: null }] },
            },
          },
        },
      } as unknown as Request;
      const res = createMockResponse();
      deviceService.getImprintedDevices.mockResolvedValue([
        { mac: "mac", ip: "10.0.0.3" },
      ] as unknown as Device[]);
      mockedPyasicBridgeClient.updateMinerConfig.mockResolvedValue();

      await deviceController.patchDeviceSystemInfo(req, res as unknown as Response);

      const patchBody = mockedPyasicBridgeClient.updateMinerConfig.mock.calls[0]?.[1] as Record<string, unknown>;
      expect(patchBody).toBeDefined();
      expect(patchBody.extra_config).toEqual(expect.objectContaining({ frequency: 525, core_voltage: 1150 }));
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("drops non-numeric values from numeric system fields", async () => {
      const req = {
        params: { id: "mac" },
        body: {
          info: {
            frequency: true,
            coreVoltage: "not-a-number",
            stratumURL: "pool",
            stratumPort: "3333",
          },
          mac: "mac",
        },
      } as unknown as Request;
      const res = createMockResponse();
      deviceService.getImprintedDevices.mockResolvedValue([
        { mac: "mac", ip: "10.0.0.3" },
      ] as unknown as Device[]);
      mockedPyasicBridgeClient.updateMinerConfig.mockResolvedValue();

      await deviceController.patchDeviceSystemInfo(req, res as unknown as Response);

      const patchBody = mockedPyasicBridgeClient.updateMinerConfig.mock.calls[0]?.[1] as Record<
        string,
        unknown
      >;
      expect(patchBody).toBeDefined();
      expect(patchBody.stratumURL).toBe("pool");
      expect(patchBody.stratumPort).toBe(3333);
      expect(patchBody.frequency).toBeUndefined();
      expect(patchBody.coreVoltage).toBeUndefined();
    });


    it("drops non-string values from string system fields", async () => {
      const req = {
        params: { id: "mac" },
        body: {
          info: {
            stratumURL: 192,
            stratumPort: "3333",
            hostname: 123,
            stratumUser: true,
          },
          mac: "mac",
        },
      } as unknown as Request;
      const res = createMockResponse();
      deviceService.getImprintedDevices.mockResolvedValue([
        { mac: "mac", ip: "10.0.0.3" },
      ] as unknown as Device[]);
      mockedPyasicBridgeClient.updateMinerConfig.mockResolvedValue();

      await deviceController.patchDeviceSystemInfo(req, res as unknown as Response);

      const patchBody = mockedPyasicBridgeClient.updateMinerConfig.mock.calls[0]?.[1] as Record<
        string,
        unknown
      >;
      expect(patchBody).toBeDefined();
      expect(patchBody.stratumPort).toBe(3333);
      expect(patchBody.stratumURL).toBeUndefined();
      expect(patchBody.hostname).toBeUndefined();
      expect(patchBody.stratumUser).toBeUndefined();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("handles missing request body", async () => {
      const req = { params: { id: "mac" } } as unknown as Request;
      const res = createMockResponse();
      deviceService.getImprintedDevices.mockResolvedValue([
        { mac: "mac", ip: "10.0.0.3" },
      ] as unknown as Device[]);
      axiosIsAxiosError.mockReturnValue(false);

      await deviceController.patchDeviceSystemInfo(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Failed to process the request" });
    });

    it("handles missing info by sending an empty patch", async () => {
      const req = {
        params: { id: "mac" },
        body: { mac: "mac" },
      } as unknown as Request;
      const res = createMockResponse();
      deviceService.getImprintedDevices.mockResolvedValue([
        { mac: "mac", ip: "10.0.0.3" },
      ] as unknown as Device[]);
      mockedPyasicBridgeClient.updateMinerConfig.mockResolvedValue();

      await deviceController.patchDeviceSystemInfo(req, res as unknown as Response);

      expect(mockedPyasicBridgeClient.updateMinerConfig).toHaveBeenCalledWith(
        "10.0.0.3",
        {},
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });


    it("returns 404 when device missing", async () => {
      const req = { params: { id: "mac" }, body: { info: {} } } as unknown as Request;
      const res = createMockResponse();
      deviceService.getImprintedDevices.mockResolvedValue([]);

      await deviceController.patchDeviceSystemInfo(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Device not found" });
    });

    it("returns 400 when ip missing", async () => {
      const req = { params: { id: "mac" }, body: { info: {} } } as unknown as Request;
      const res = createMockResponse();
      deviceService.getImprintedDevices.mockResolvedValue([
        { mac: "mac", ip: undefined },
      ] as unknown as Device[]);

      await deviceController.patchDeviceSystemInfo(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Device IP not available" });
    });

    it("handles axios errors", async () => {
      const req = { params: { id: "mac" }, body: { info: {} } } as unknown as Request;
      const res = createMockResponse();
      deviceService.getImprintedDevices.mockResolvedValue([
        { mac: "mac", ip: "10.0.0.3" },
      ] as unknown as Device[]);
      const axiosError = new Error('network') as any;
      axiosError.response = { status: 502, data: "bad" };
      mockedPyasicBridgeClient.updateMinerConfig.mockRejectedValue(axiosError);
      axiosIsAxiosError.mockReturnValue(true);

      await deviceController.patchDeviceSystemInfo(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(502);
      expect(res.json).toHaveBeenCalledWith({
        error: "Failed to update device system info via pyasic-bridge",
        details: "bad",
      });
    });

    it("handles axios errors without response", async () => {
      const req = { params: { id: "mac" }, body: { info: {} } } as unknown as Request;
      const res = createMockResponse();
      deviceService.getImprintedDevices.mockResolvedValue([
        { mac: "mac", ip: "10.0.0.3" },
      ] as unknown as Device[]);
      const axiosError = new Error("network error") as any;
      mockedPyasicBridgeClient.updateMinerConfig.mockRejectedValue(axiosError);
      axiosIsAxiosError.mockReturnValue(true);

      await deviceController.patchDeviceSystemInfo(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Failed to update device system info via pyasic-bridge",
        details: "network error",
      });
    });

    it("handles non-axios errors", async () => {
      const req = { params: { id: "mac" }, body: { info: {} } } as unknown as Request;
      const res = createMockResponse();
      deviceService.getImprintedDevices.mockResolvedValue([
        { mac: "mac", ip: "10.0.0.3" },
      ] as unknown as Device[]);
      mockedPyasicBridgeClient.updateMinerConfig.mockRejectedValue(new Error("generic error"));
      axiosIsAxiosError.mockReturnValue(false);

      await deviceController.patchDeviceSystemInfo(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Failed to process the request" });
    });

    it("rejects when preset missing", async () => {
      const req = {
        params: { id: "mac" },
        body: { presetUuid: "missing", info: {}, mac: "mac" },
      } as unknown as Request;
      const res = createMockResponse();
      deviceService.getImprintedDevices.mockResolvedValue([
        { mac: "mac", ip: "10.0.0.3" },
      ] as unknown as Device[]);
      presetsService.getPreset.mockResolvedValue(null);

      await deviceController.patchDeviceSystemInfo(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Associated Preset id not available" });
    });
  });

  describe("getDevicesByPresetId", () => {
    it("returns devices by preset id", async () => {
      const req = { params: { presetId: "preset-123" } } as unknown as Request;
      const res = createMockResponse();
      deviceService.getDevicesByPresetId.mockResolvedValue([
        { mac: "aa:bb:cc", presetUuid: "preset-123" },
      ] as unknown as Device[]);

      await deviceController.getDevicesByPresetId(req, res as unknown as Response);

      expect(deviceService.getDevicesByPresetId).toHaveBeenCalledWith("preset-123");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Devices by preset retrieved successfully",
        data: [{ mac: "aa:bb:cc", presetUuid: "preset-123" }],
      });
    });

    it("handles errors", async () => {
      const req = { params: { presetId: "preset-123" } } as unknown as Request;
      const res = createMockResponse();
      deviceService.getDevicesByPresetId.mockRejectedValue(new Error('fail'));

      await deviceController.getDevicesByPresetId(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Failed to process the request" });
    });
  });

});
