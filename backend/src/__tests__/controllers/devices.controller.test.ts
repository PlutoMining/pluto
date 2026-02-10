import type { Request, Response } from 'express';
import type { DiscoveredMiner } from '@pluto/interfaces';
import type { MinerData } from '@pluto/pyasic-bridge-client';
import * as deviceController from '@/controllers/devices.controller';

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
jest.mock('@/services/pyasic-bridge.service', () => ({
  pyasicBridgeService: {
    restartMiner: jest.fn(),
    updateMinerConfig: jest.fn(),
    validateMinerConfig: jest.fn(),
  },
}));
jest.mock('@pluto/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

const deviceService = jest.requireMock('@/services/device.service');
const pyasicBridgeService = jest.requireMock('@/services/pyasic-bridge.service');

const createMockResponse = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

const makeDiscoveredMiner = (overrides?: Partial<DiscoveredMiner & { presetUuid?: string }>): DiscoveredMiner & { presetUuid?: string } => ({
  ip: '10.0.0.1',
  mac: 'aa:bb:cc:dd:ee:ff',
  type: 'mock',
  minerData: {
    ip: '10.0.0.1',
    hostname: 'miner-1',
    model: 'BM1368',
  } as MinerData,
  ...overrides,
} as DiscoveredMiner & { presetUuid?: string });

describe('devices.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('discoverDevices', () => {
    it('returns discovered devices', async () => {
      const req = { query: { ip: '1.1.1.1' } } as unknown as Request;
      const res = createMockResponse();
      deviceService.discoverDevices.mockResolvedValue([makeDiscoveredMiner({ mac: 'xx' })]);

      await deviceController.discoverDevices(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([expect.objectContaining({ mac: 'xx' })]);
    });

    it('handles discoverDevices errors', async () => {
      const req = { query: {} } as unknown as Request;
      const res = createMockResponse();
      deviceService.discoverDevices.mockRejectedValue(new Error('fail'));

      await deviceController.discoverDevices(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Discovery service failed' });
    });
  });

  describe('getDiscoveredDevices', () => {
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
  });

  describe('imprintDevices', () => {
    it('returns data when available', async () => {
      const req = { body: { macs: ['xx'] } } as unknown as Request;
      const res = createMockResponse();
      deviceService.imprintDevices.mockResolvedValue([makeDiscoveredMiner({ mac: 'xx' })]);

      await deviceController.imprintDevices(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Devices imprint successful',
        data: [expect.objectContaining({ mac: 'xx' })],
      });
    });

    it('returns 404 when empty', async () => {
      const req = { body: { macs: ['xx'] } } as unknown as Request;
      const res = createMockResponse();
      deviceService.imprintDevices.mockResolvedValue([]);

      await deviceController.imprintDevices(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('handles service errors', async () => {
      const req = { body: { macs: ['xx'] } } as unknown as Request;
      const res = createMockResponse();
      deviceService.imprintDevices.mockRejectedValue(new Error('service error'));

      await deviceController.imprintDevices(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to process the request' });
    });
  });

  describe('imprintDevice', () => {
    it('merges macs with existing', async () => {
      const req = { body: { mac: 'new' } } as unknown as Request;
      const res = createMockResponse();
      deviceService.getImprintedDevices.mockResolvedValue([makeDiscoveredMiner({ mac: 'old' })]);
      deviceService.imprintDevices.mockResolvedValue([
        makeDiscoveredMiner({ mac: 'old' }),
        makeDiscoveredMiner({ mac: 'new' }),
      ]);

      await deviceController.imprintDevice(req, res as unknown as Response);

      expect(deviceService.imprintDevices).toHaveBeenCalledWith(['old', 'new']);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('returns 404 when imprinting yields no devices', async () => {
      const req = { body: { mac: 'new' } } as unknown as Request;
      const res = createMockResponse();
      deviceService.getImprintedDevices.mockResolvedValue([makeDiscoveredMiner({ mac: 'old' })]);
      deviceService.imprintDevices.mockResolvedValue([]);

      await deviceController.imprintDevice(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('handles service errors', async () => {
      const req = { body: { mac: 'new' } } as unknown as Request;
      const res = createMockResponse();
      deviceService.getImprintedDevices.mockRejectedValue(new Error('service error'));

      await deviceController.imprintDevice(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to process the request' });
    });
  });

  describe('getImprintedDevices', () => {
    it('returns devices without enrichment', async () => {
      const req = { query: { q: '10.0' } } as unknown as Request;
      const res = createMockResponse();
      deviceService.getImprintedDevices.mockResolvedValue([makeDiscoveredMiner({ mac: 'x' })]);

      await deviceController.getImprintedDevices(req, res as unknown as Response);

      const payload = res.json.mock.calls[0][0];
      expect(payload.data).toHaveLength(1);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('handles service errors', async () => {
      const req = { query: {} } as unknown as Request;
      const res = createMockResponse();
      deviceService.getImprintedDevices.mockRejectedValue(new Error('fail'));

      await deviceController.getImprintedDevices(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to process the request' });
    });
  });

  describe('getImprintedDevice', () => {
    it('proxies response', async () => {
      const req = { params: { id: 'mac' } } as unknown as Request;
      const res = createMockResponse();
      const device = makeDiscoveredMiner({ mac: 'mac' });
      deviceService.getImprintedDevice.mockResolvedValue(device);

      await deviceController.getImprintedDevice(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Device retrieved successfully',
        data: device,
      });
    });

    it('handles errors', async () => {
      const req = { params: { id: 'mac' } } as unknown as Request;
      const res = createMockResponse();
      deviceService.getImprintedDevice.mockRejectedValue(new Error('fail'));

      await deviceController.getImprintedDevice(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('patchImprintedDevice', () => {
    it('handles success', async () => {
      const req = { params: { id: 'mac' }, body: { device: makeDiscoveredMiner() } } as unknown as Request;
      const res = createMockResponse();
      const device = makeDiscoveredMiner({ mac: 'mac' });
      deviceService.patchImprintedDevice.mockResolvedValue(device);

      await deviceController.patchImprintedDevice(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('handles not found', async () => {
      const req = { params: { id: 'mac' }, body: { device: makeDiscoveredMiner() } } as unknown as Request;
      const res = createMockResponse();
      deviceService.patchImprintedDevice.mockResolvedValue(null);

      await deviceController.patchImprintedDevice(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('handles errors gracefully', async () => {
      const req = { params: { id: 'mac' }, body: { device: makeDiscoveredMiner() } } as unknown as Request;
      const res = createMockResponse();
      deviceService.patchImprintedDevice.mockRejectedValue(new Error('fail'));

      await deviceController.patchImprintedDevice(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('deleteImprintedDevice', () => {
    it('returns 404 when not found', async () => {
      const req = { params: { id: 'mac' } } as unknown as Request;
      const res = createMockResponse();
      deviceService.deleteImprintedDevice.mockResolvedValue(null);

      await deviceController.deleteImprintedDevice(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('handles errors', async () => {
      const req = { params: { id: 'mac' } } as unknown as Request;
      const res = createMockResponse();
      deviceService.deleteImprintedDevice.mockRejectedValue(new Error('fail'));

      await deviceController.deleteImprintedDevice(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('returns 200 when device deleted', async () => {
      const req = { params: { id: 'mac' } } as unknown as Request;
      const res = createMockResponse();
      const device = makeDiscoveredMiner({ mac: 'mac' });
      deviceService.deleteImprintedDevice.mockResolvedValue(device);

      await deviceController.deleteImprintedDevice(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Device deleted successfully',
        data: device,
      });
    });
  });

  describe('putListenDevices', () => {
    it('filters macs before listening', async () => {
      const req = { body: { macs: ['match'], traceLogs: true } } as unknown as Request;
      const res = createMockResponse();
      deviceService.getImprintedDevices.mockResolvedValue([
        makeDiscoveredMiner({ mac: 'match' }),
        makeDiscoveredMiner({ mac: 'other' }),
      ]);
      deviceService.listenToDevices.mockResolvedValue([makeDiscoveredMiner({ mac: 'match' })]);

      await deviceController.putListenDevices(req, res as unknown as Response);

      expect(deviceService.listenToDevices).toHaveBeenCalledWith(
        [expect.objectContaining({ mac: 'match' })],
        true
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('handles service failures', async () => {
      const req = { body: { macs: ['match'] } } as unknown as Request;
      const res = createMockResponse();
      deviceService.getImprintedDevices.mockRejectedValue(new Error('fail'));

      await deviceController.putListenDevices(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('restartDevice', () => {
    it('restarts by ip via pyasic-bridge', async () => {
      const req = { params: { id: 'mac' } } as unknown as Request;
      const res = createMockResponse();
      const device = makeDiscoveredMiner({ mac: 'mac', ip: '10.0.0.2' });
      deviceService.getImprintedDevices.mockResolvedValue([device]);
      pyasicBridgeService.pyasicBridgeService.restartMiner.mockResolvedValue(undefined);

      await deviceController.restartDevice(req, res as unknown as Response);

      expect(pyasicBridgeService.pyasicBridgeService.restartMiner).toHaveBeenCalledWith('10.0.0.2');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Device restarted successfully',
        data: device,
      });
    });

    it('handles missing device', async () => {
      const req = { params: { id: 'unknown' } } as unknown as Request;
      const res = createMockResponse();
      deviceService.getImprintedDevices.mockResolvedValue([]);

      await deviceController.restartDevice(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 400 when IP missing', async () => {
      const req = { params: { id: 'mac' } } as unknown as Request;
      const res = createMockResponse();
      deviceService.getImprintedDevices.mockResolvedValue([makeDiscoveredMiner({ mac: 'mac', ip: undefined })]);

      await deviceController.restartDevice(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Device IP not available' });
    });

    it('handles pyasic-bridge errors', async () => {
      const req = { params: { id: 'mac' } } as unknown as Request;
      const res = createMockResponse();
      const device = makeDiscoveredMiner({ mac: 'mac', ip: '10.0.0.2' });
      deviceService.getImprintedDevices.mockResolvedValue([device]);
      pyasicBridgeService.pyasicBridgeService.restartMiner.mockRejectedValue(new Error('network error'));

      await deviceController.restartDevice(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to restart the device',
        details: 'network error',
      });
    });
  });

  describe('patchDeviceSystemInfo', () => {
    it('updates config via pyasic-bridge', async () => {
      const req = {
        params: { id: 'mac' },
        body: { pools: { groups: [{ pools: [{ url: 'stratum+tcp://pool.com:3333' }] }] } },
      } as unknown as Request;
      const res = createMockResponse();
      const device = makeDiscoveredMiner({ mac: 'mac', ip: '10.0.0.3' });
      deviceService.getImprintedDevices.mockResolvedValue([device]);
      pyasicBridgeService.pyasicBridgeService.updateMinerConfig.mockResolvedValue(undefined);
      deviceService.patchImprintedDevice.mockResolvedValue(device);

      await deviceController.patchDeviceSystemInfo(req, res as unknown as Response);

      expect(pyasicBridgeService.pyasicBridgeService.updateMinerConfig).toHaveBeenCalledWith(
        '10.0.0.3',
        expect.objectContaining({
          pools: { groups: [{ pools: [{ url: 'stratum+tcp://pool.com:3333' }] }] },
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('returns 404 when device missing', async () => {
      const req = { params: { id: 'mac' }, body: {} } as unknown as Request;
      const res = createMockResponse();
      deviceService.getImprintedDevices.mockResolvedValue([]);

      await deviceController.patchDeviceSystemInfo(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Device not found' });
    });

    it('returns 400 when ip missing', async () => {
      const req = { params: { id: 'mac' }, body: {} } as unknown as Request;
      const res = createMockResponse();
      deviceService.getImprintedDevices.mockResolvedValue([makeDiscoveredMiner({ mac: 'mac', ip: undefined })]);

      await deviceController.patchDeviceSystemInfo(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Device IP not available' });
    });

    it('handles invalid config payload', async () => {
      const req = { params: { id: 'mac' }, body: null } as unknown as Request;
      const res = createMockResponse();
      const device = makeDiscoveredMiner({ mac: 'mac', ip: '10.0.0.3' });
      deviceService.getImprintedDevices.mockResolvedValue([device]);

      await deviceController.patchDeviceSystemInfo(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid config payload' });
    });

    it('handles pyasic-bridge errors', async () => {
      const req = { params: { id: 'mac' }, body: { pools: {} } } as unknown as Request;
      const res = createMockResponse();
      const device = makeDiscoveredMiner({ mac: 'mac', ip: '10.0.0.3' });
      deviceService.getImprintedDevices.mockResolvedValue([device]);
      pyasicBridgeService.pyasicBridgeService.updateMinerConfig.mockRejectedValue(
        new Error('config update failed')
      );

      await deviceController.patchDeviceSystemInfo(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to update device system info',
        details: 'config update failed',
      });
    });

    it('updates device in database after successful config update', async () => {
      const req = {
        params: { id: 'mac' },
        body: { pools: { groups: [{ pools: [{ url: 'stratum+tcp://pool.com:3333' }] }] } },
      } as unknown as Request;
      const res = createMockResponse();
      const device = makeDiscoveredMiner({ mac: 'mac', ip: '10.0.0.3' });
      deviceService.getImprintedDevices.mockResolvedValue([device]);
      pyasicBridgeService.pyasicBridgeService.updateMinerConfig.mockResolvedValue(undefined);
      const updatedDevice = makeDiscoveredMiner({ mac: 'mac', ip: '10.0.0.3' });
      deviceService.patchImprintedDevice.mockResolvedValue(updatedDevice);

      await deviceController.patchDeviceSystemInfo(req, res as unknown as Response);

      expect(deviceService.patchImprintedDevice).toHaveBeenCalledWith('mac', expect.any(Object));
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('validateDeviceSystemInfo', () => {
    it('validates config via pyasic-bridge', async () => {
      const req = {
        params: { id: 'mac' },
        body: { extra_config: { frequency: 525, core_voltage: 1100 } },
      } as unknown as Request;
      const res = createMockResponse();
      const device = makeDiscoveredMiner({ mac: 'mac', ip: '10.0.0.3' });
      deviceService.getImprintedDevices.mockResolvedValue([device]);
      const validationResult = { valid: true, errors: [] };
      pyasicBridgeService.pyasicBridgeService.validateMinerConfig.mockResolvedValue(validationResult);

      await deviceController.validateDeviceSystemInfo(req, res as unknown as Response);

      expect(pyasicBridgeService.pyasicBridgeService.validateMinerConfig).toHaveBeenCalledWith(
        '10.0.0.3',
        expect.objectContaining({
          extra_config: { frequency: 525, core_voltage: 1100 },
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(validationResult);
    });

    it('returns validation errors when config is invalid', async () => {
      const req = {
        params: { id: 'mac' },
        body: { extra_config: { frequency: 999 } },
      } as unknown as Request;
      const res = createMockResponse();
      const device = makeDiscoveredMiner({ mac: 'mac', ip: '10.0.0.3' });
      deviceService.getImprintedDevices.mockResolvedValue([device]);
      const validationResult = {
        valid: false,
        errors: ['Invalid frequency 999 for Bitaxe miner. Accepted values are: [400, 490, 525, 550, 600, 625]'],
      };
      pyasicBridgeService.pyasicBridgeService.validateMinerConfig.mockResolvedValue(validationResult);

      await deviceController.validateDeviceSystemInfo(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(validationResult);
    });

    it('returns 404 when device missing', async () => {
      const req = { params: { id: 'mac' }, body: {} } as unknown as Request;
      const res = createMockResponse();
      deviceService.getImprintedDevices.mockResolvedValue([]);

      await deviceController.validateDeviceSystemInfo(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Device not found' });
    });

    it('returns 400 when ip missing', async () => {
      const req = { params: { id: 'mac' }, body: {} } as unknown as Request;
      const res = createMockResponse();
      deviceService.getImprintedDevices.mockResolvedValue([makeDiscoveredMiner({ mac: 'mac', ip: undefined })]);

      await deviceController.validateDeviceSystemInfo(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Device IP not available' });
    });

    it('handles invalid config payload', async () => {
      const req = { params: { id: 'mac' }, body: null } as unknown as Request;
      const res = createMockResponse();
      const device = makeDiscoveredMiner({ mac: 'mac', ip: '10.0.0.3' });
      deviceService.getImprintedDevices.mockResolvedValue([device]);

      await deviceController.validateDeviceSystemInfo(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid config payload' });
    });

    it('handles validation errors with 400 status', async () => {
      const req = { params: { id: 'mac' }, body: { extra_config: {} } } as unknown as Request;
      const res = createMockResponse();
      const device = makeDiscoveredMiner({ mac: 'mac', ip: '10.0.0.3' });
      deviceService.getImprintedDevices.mockResolvedValue([device]);
      pyasicBridgeService.pyasicBridgeService.validateMinerConfig.mockRejectedValue(
        new Error('validation failed: Invalid frequency')
      );

      await deviceController.validateDeviceSystemInfo(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        valid: false,
        errors: ['validation failed: Invalid frequency'],
      });
    });

    it('handles pyasic-bridge errors', async () => {
      const req = { params: { id: 'mac' }, body: { extra_config: {} } } as unknown as Request;
      const res = createMockResponse();
      const device = makeDiscoveredMiner({ mac: 'mac', ip: '10.0.0.3' });
      deviceService.getImprintedDevices.mockResolvedValue([device]);
      pyasicBridgeService.pyasicBridgeService.validateMinerConfig.mockRejectedValue(
        new Error('network error')
      );

      await deviceController.validateDeviceSystemInfo(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to validate device system info',
        details: 'network error',
      });
    });
  });

  describe('getDevicesByPresetId', () => {
    it('returns devices by preset id', async () => {
      const req = { params: { presetId: 'preset-123' } } as unknown as Request;
      const res = createMockResponse();
      const device = makeDiscoveredMiner({ mac: 'aa:bb:cc', presetUuid: 'preset-123' });
      deviceService.getDevicesByPresetId.mockResolvedValue([device]);

      await deviceController.getDevicesByPresetId(req, res as unknown as Response);

      expect(deviceService.getDevicesByPresetId).toHaveBeenCalledWith('preset-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Devices by preset retrieved successfully',
        data: [device],
      });
    });

    it('handles errors', async () => {
      const req = { params: { presetId: 'preset-123' } } as unknown as Request;
      const res = createMockResponse();
      deviceService.getDevicesByPresetId.mockRejectedValue(new Error('fail'));

      await deviceController.getDevicesByPresetId(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to process the request' });
    });
  });
});
