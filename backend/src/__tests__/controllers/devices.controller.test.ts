import type { Request, Response } from 'express';
import type { Device } from '@pluto/interfaces';
import axios from 'axios';
import * as deviceController from '@/controllers/devices.controller';

jest.mock('axios');
jest.mock('@/services/device.service', () => ({
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
jest.mock('@/services/presets.service', () => ({
  getPreset: jest.fn(),
}));

const deviceService = jest.requireMock('@/services/device.service');
const presetsService = jest.requireMock('@/services/presets.service');
const mockedAxios = axios as jest.Mocked<typeof axios>;
const axiosIsAxiosError = mockedAxios.isAxiosError as unknown as jest.Mock;

const createMockResponse = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

describe('devices.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axiosIsAxiosError.mockReturnValue(false);
  });

  it('returns discovered devices', async () => {
    const req = { query: { ip: '1.1.1.1' } } as unknown as Request;
    const res = createMockResponse();
    deviceService.discoverDevices.mockResolvedValue([{ mac: 'xx' }]);

    await deviceController.discoverDevices(req, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([{ mac: 'xx' }]);
  });

  it('handles discoverDevices errors', async () => {
    const req = { query: {} } as unknown as Request;
    const res = createMockResponse();
    deviceService.discoverDevices.mockRejectedValue(new Error('fail'));

    await deviceController.discoverDevices(req, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Discovery service failed' });
  });

  it('parses getDiscoveredDevices query params', async () => {
    const req = {
      query: {
        macs: 'aa,bb',
        ips: '1.1.1.1',
        hostnames: 'rig',
        partialMacs: 'left',
        partialIps: 'right',
        partialHostnames: 'none',
      },
    } as unknown as Request;
    const res = createMockResponse();
    deviceService.lookupMultipleDiscoveredDevices.mockResolvedValue([]);

    await deviceController.getDiscoveredDevices(req, res as unknown as Response);

    expect(deviceService.lookupMultipleDiscoveredDevices).toHaveBeenCalledWith({
      macs: ['aa', 'bb'],
      ips: ['1.1.1.1'],
      hostnames: ['rig'],
      partialMatch: { macs: 'left', ips: 'right', hostnames: 'none' },
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('handles getDiscoveredDevices errors', async () => {
    const req = { query: {} } as unknown as Request;
    const res = createMockResponse();
    deviceService.lookupMultipleDiscoveredDevices.mockRejectedValue(new Error('boom'));

    await deviceController.getDiscoveredDevices(req, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Discovery service failed' });
  });

  it('imprintDevices returns 404 when empty', async () => {
    const req = { body: { macs: ['xx'] } } as unknown as Request;
    const res = createMockResponse();
    deviceService.imprintDevices.mockResolvedValue([]);

    await deviceController.imprintDevices(req, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('imprintDevices returns data when available', async () => {
    const req = { body: { macs: ['xx'] } } as unknown as Request;
    const res = createMockResponse();
    deviceService.imprintDevices.mockResolvedValue([{ mac: 'xx' }]);

    await deviceController.imprintDevices(req, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Devices imprint successful', data: [{ mac: 'xx' }] });
  });

  it('imprintDevice merges macs with existing', async () => {
    const req = { body: { mac: 'new' } } as unknown as Request;
    const res = createMockResponse();
    deviceService.getImprintedDevices.mockResolvedValue([{ mac: 'old' }]);
    deviceService.imprintDevices.mockResolvedValue([{ mac: 'old' }, { mac: 'new' }]);

    await deviceController.imprintDevice(req, res as unknown as Response);

    expect(deviceService.imprintDevices).toHaveBeenCalledWith(['old', 'new']);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('imprintDevice returns 404 when imprinting yields no devices', async () => {
    const req = { body: { mac: 'new' } } as unknown as Request;
    const res = createMockResponse();
    deviceService.getImprintedDevices.mockResolvedValue([{ mac: 'old' }]);
    deviceService.imprintDevices.mockResolvedValue([]);

    await deviceController.imprintDevice(req, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('getImprintedDevices enriches options', async () => {
    const req = { query: { q: '10.0' } } as unknown as Request;
    const res = createMockResponse();
    deviceService.getImprintedDevices.mockResolvedValue([
      { mac: 'x', info: { ASICModel: 'BM1397' } },
    ] as unknown as Device[]);

    await deviceController.getImprintedDevices(req, res as unknown as Response);

    const payload = res.json.mock.calls[0][0];
    expect(payload.data[0].info.frequencyOptions).toBeDefined();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('getImprintedDevices handles service errors', async () => {
    const req = { query: {} } as unknown as Request;
    const res = createMockResponse();
    deviceService.getImprintedDevices.mockRejectedValue(new Error('fail'));

    await deviceController.getImprintedDevices(req, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to process the request' });
  });

  it('getImprintedDevice proxies response', async () => {
    const req = { params: { id: 'mac' } } as unknown as Request;
    const res = createMockResponse();
    deviceService.getImprintedDevice.mockResolvedValue({ mac: 'mac' });

    await deviceController.getImprintedDevice(req, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Device retrieved successfully', data: { mac: 'mac' } });
  });

  it('getImprintedDevice handles errors', async () => {
    const req = { params: { id: 'mac' } } as unknown as Request;
    const res = createMockResponse();
    deviceService.getImprintedDevice.mockRejectedValue(new Error('fail'));

    await deviceController.getImprintedDevice(req, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('patchImprintedDevice handles not found', async () => {
    const req = { params: { id: 'mac' }, body: { device: {} } } as unknown as Request;
    const res = createMockResponse();
    deviceService.patchImprintedDevice.mockResolvedValue(null);

    await deviceController.patchImprintedDevice(req, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('patchImprintedDevice handles success', async () => {
    const req = { params: { id: 'mac' }, body: { device: {} } } as unknown as Request;
    const res = createMockResponse();
    deviceService.patchImprintedDevice.mockResolvedValue({ mac: 'mac' });

    await deviceController.patchImprintedDevice(req, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('patchImprintedDevice handles errors gracefully', async () => {
    const req = { params: { id: 'mac' }, body: { device: {} } } as unknown as Request;
    const res = createMockResponse();
    deviceService.patchImprintedDevice.mockRejectedValue(new Error('fail'));

    await deviceController.patchImprintedDevice(req, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('deleteImprintedDevice returns 404 when not found', async () => {
    const req = { params: { id: 'mac' } } as unknown as Request;
    const res = createMockResponse();
    deviceService.deleteImprintedDevice.mockResolvedValue(null);

    await deviceController.deleteImprintedDevice(req, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('deleteImprintedDevice handles errors', async () => {
    const req = { params: { id: 'mac' } } as unknown as Request;
    const res = createMockResponse();
    deviceService.deleteImprintedDevice.mockRejectedValue(new Error('fail'));

    await deviceController.deleteImprintedDevice(req, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('putListenDevices filters macs before listening', async () => {
    const req = { body: { macs: ['match'], traceLogs: true } } as unknown as Request;
    const res = createMockResponse();
    deviceService.getImprintedDevices.mockResolvedValue([
      { mac: 'match' },
      { mac: 'other' },
    ] as unknown as Device[]);
    deviceService.listenToDevices.mockResolvedValue([{ mac: 'match' }]);

    await deviceController.putListenDevices(req, res as unknown as Response);

    expect(deviceService.listenToDevices).toHaveBeenCalledWith([{ mac: 'match' }], true);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('putListenDevices handles service failures', async () => {
    const req = { body: { macs: ['match'] } } as unknown as Request;
    const res = createMockResponse();
    deviceService.getImprintedDevices.mockRejectedValue(new Error('fail'));

    await deviceController.putListenDevices(req, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('restartDevice restarts by ip', async () => {
    const req = { params: { id: 'mac' } } as unknown as Request;
    const res = createMockResponse();
    deviceService.getImprintedDevices.mockResolvedValue([{ mac: 'mac', ip: '10.0.0.2' }] as unknown as Device[]);
    mockedAxios.post.mockResolvedValue({ status: 202, data: { ok: true } });

    await deviceController.restartDevice(req, res as unknown as Response);

    expect(mockedAxios.post).toHaveBeenCalledWith('http://10.0.0.2/api/system/restart');
    expect(res.status).toHaveBeenCalledWith(202);
  });

  it('restartDevice handles missing device', async () => {
    const req = { params: { id: 'unknown' } } as unknown as Request;
    const res = createMockResponse();
    deviceService.getImprintedDevices.mockResolvedValue([]);

    await deviceController.restartDevice(req, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('restartDevice returns 400 when IP missing', async () => {
    const req = { params: { id: 'mac' } } as unknown as Request;
    const res = createMockResponse();
    deviceService.getImprintedDevices.mockResolvedValue([{ mac: 'mac', ip: undefined }] as unknown as Device[]);

    await deviceController.restartDevice(req, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Device IP not available' });
  });

  it('restartDevice forwards axios error responses', async () => {
    const req = { params: { id: 'mac' } } as unknown as Request;
    const res = createMockResponse();
    deviceService.getImprintedDevices.mockResolvedValue([{ mac: 'mac', ip: '10.0.0.2' }] as unknown as Device[]);
    const axiosError = new Error('network') as any;
    axiosError.response = { status: 503, data: { message: 'down' } };
    mockedAxios.post.mockRejectedValue(axiosError);
    axiosIsAxiosError.mockReturnValue(true);

    await deviceController.restartDevice(req, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Failed to restart the device',
      details: { message: 'down' },
    });
  });

  it('patchDeviceSystemInfo updates via preset data', async () => {
    const req = {
      params: { id: 'mac' },
      body: { presetUuid: 'preset', info: {}, mac: 'mac' },
    } as unknown as Request;
    const res = createMockResponse();
    deviceService.getImprintedDevices.mockResolvedValue([{ mac: 'mac', ip: '10.0.0.3' }] as unknown as Device[]);
    presetsService.getPreset.mockResolvedValue({
      configuration: { stratumPort: 4444, stratumURL: 'pool', stratumPassword: 'secret' },
    });
    mockedAxios.patch.mockResolvedValue({ status: 200 });

    await deviceController.patchDeviceSystemInfo(req, res as unknown as Response);

    expect(mockedAxios.patch).toHaveBeenCalledWith('http://10.0.0.3/api/system', expect.objectContaining({
      stratumPort: 4444,
      stratumURL: 'pool',
      stratumPassword: 'secret',
    }));
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('patchDeviceSystemInfo returns 404 when device missing', async () => {
    const req = { params: { id: 'mac' }, body: { info: {} } } as unknown as Request;
    const res = createMockResponse();
    deviceService.getImprintedDevices.mockResolvedValue([]);

    await deviceController.patchDeviceSystemInfo(req, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Device not found' });
  });

  it('patchDeviceSystemInfo returns 400 when ip missing', async () => {
    const req = { params: { id: 'mac' }, body: { info: {} } } as unknown as Request;
    const res = createMockResponse();
    deviceService.getImprintedDevices.mockResolvedValue([{ mac: 'mac', ip: undefined }] as unknown as Device[]);

    await deviceController.patchDeviceSystemInfo(req, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Device IP not available' });
  });

  it('patchDeviceSystemInfo handles axios errors', async () => {
    const req = { params: { id: 'mac' }, body: { info: {} } } as unknown as Request;
    const res = createMockResponse();
    deviceService.getImprintedDevices.mockResolvedValue([{ mac: 'mac', ip: '10.0.0.3' }] as unknown as Device[]);
    mockedAxios.patch.mockRejectedValue(Object.assign(new Error('network'), { response: { status: 502, data: 'bad' } }));
    axiosIsAxiosError.mockReturnValue(true);

    await deviceController.patchDeviceSystemInfo(req, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Failed to update device system info',
      details: 'bad',
    });
  });

  it('patchDeviceSystemInfo rejects when preset missing', async () => {
    const req = {
      params: { id: 'mac' },
      body: { presetUuid: 'missing', info: {}, mac: 'mac' },
    } as unknown as Request;
    const res = createMockResponse();
    deviceService.getImprintedDevices.mockResolvedValue([{ mac: 'mac', ip: '10.0.0.3' }] as unknown as Device[]);
    presetsService.getPreset.mockResolvedValue(null);

    await deviceController.patchDeviceSystemInfo(req, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Associated Preset id not available' });
  });
});

