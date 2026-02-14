import type { DiscoveredMiner } from '@pluto/interfaces';
import type { MinerData } from '@pluto/pyasic-bridge-client';
import axios from 'axios';
import * as deviceService from '@/services/device.service';

jest.mock('axios');
jest.mock('@pluto/db', () => ({
  findMany: jest.fn(),
  findOne: jest.fn(),
  insertOne: jest.fn(),
  updateOne: jest.fn(),
  deleteOne: jest.fn(),
}));
jest.mock('../../services/tracing.service', () => ({
  updateOriginalIpsListeners: jest.fn(),
  getTracingByIp: jest.fn().mockReturnValue({}),
}));
jest.mock('../../config/environment', () => ({
  config: { discoveryServiceHost: 'http://discovery.test' },
}));
jest.mock('@pluto/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const db = jest.requireMock('@pluto/db');
const tracing = jest.requireMock('../../services/tracing.service');
const { logger } = jest.requireMock('@pluto/logger');

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

describe('device.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('discoverDevices', () => {
    it('fetches discovered devices with query params', async () => {
      mockedAxios.get.mockResolvedValue({ data: [makeDiscoveredMiner()] });

      await expect(deviceService.discoverDevices({ ip: '1.1.1.1' })).resolves.toEqual([
        expect.objectContaining({ ip: '10.0.0.1' }),
      ]);

      expect(mockedAxios.get).toHaveBeenCalledWith('http://discovery.test/discover', {
        params: { ip: '1.1.1.1', mac: undefined },
      });
    });

    it('surfaces axios errors from discoverDevices', async () => {
      const error = new Error('network');
      mockedAxios.get.mockRejectedValue(error);

      await expect(deviceService.discoverDevices()).rejects.toThrow('network');
      expect(logger.error).toHaveBeenCalledWith('Error during multiple discovered devices lookup', error);
    });
  });

  describe('lookupMultipleDiscoveredDevices', () => {
    it('builds lookupMultipleDiscoveredDevices query', async () => {
      mockedAxios.get.mockResolvedValue({ data: [] });

      await deviceService.lookupMultipleDiscoveredDevices({
        macs: ['aa', 'bb'],
        ips: ['1.1.1.1'],
        hostnames: ['rig'],
        partialMatch: { macs: 'left', ips: 'right', hostnames: 'none' },
      });

      expect(mockedAxios.get).toHaveBeenCalledWith('http://discovery.test/discovered', {
        params: {
          macs: 'aa,bb',
          ips: '1.1.1.1',
          hostnames: 'rig',
          partialMacs: 'left',
          partialIps: 'right',
          partialHostnames: 'none',
        },
      });
    });

    it('omits macs/ips/hostnames when empty and defaults partialMatch', async () => {
      mockedAxios.get.mockResolvedValue({ data: [] });

      await deviceService.lookupMultipleDiscoveredDevices({
        macs: [],
        ips: [],
        hostnames: [],
      });

      expect(mockedAxios.get).toHaveBeenCalledWith('http://discovery.test/discovered', {
        params: {
          partialMacs: 'both',
          partialIps: 'both',
          partialHostnames: 'both',
        },
      });
    });

    it('omits partialMatch params when values are missing', async () => {
      mockedAxios.get.mockResolvedValue({ data: [] });

      await deviceService.lookupMultipleDiscoveredDevices({
        macs: ['aa'],
        partialMatch: {},
      });

      expect(mockedAxios.get).toHaveBeenCalledWith('http://discovery.test/discovered', {
        params: {
          macs: 'aa',
        },
      });
    });

    it('logs and rethrows on axios error', async () => {
      const error = new Error('network');
      mockedAxios.get.mockRejectedValue(error);

      await expect(deviceService.lookupMultipleDiscoveredDevices({ macs: ['aa'] })).rejects.toThrow('network');
      expect(logger.error).toHaveBeenCalledWith('Error during multiple discovered devices lookup', error);
    });
  });

  describe('imprintDevices', () => {
    it('returns [] when no devices found', async () => {
      jest.spyOn(deviceService, 'lookupMultipleDiscoveredDevices').mockResolvedValue([]);

      await expect(deviceService.imprintDevices(['mac-0'])).resolves.toEqual([]);
    });

    it('imprints devices inserting new entries', async () => {
      const device = makeDiscoveredMiner({ mac: 'mac-1' });
      const lookupSpy = jest
        .spyOn(deviceService, 'lookupMultipleDiscoveredDevices')
        .mockResolvedValue([device]);

      db.insertOne.mockResolvedValue(undefined);

      const devices = await deviceService.imprintDevices(['mac-1']);

      expect(lookupSpy).toHaveBeenCalledWith({ macs: ['mac-1'] });
      expect(db.insertOne).toHaveBeenCalledWith('pluto_core', 'devices:imprinted', 'mac-1', device);
      expect(devices).toHaveLength(1);
    });

    it('updates devices when already imprinted', async () => {
      const device = makeDiscoveredMiner({ mac: 'mac-2' });
      jest.spyOn(deviceService, 'lookupMultipleDiscoveredDevices').mockResolvedValue([device]);

      const duplicateError = new Error('already exists');
      db.insertOne.mockRejectedValue(duplicateError);
      db.updateOne.mockResolvedValue(undefined);

      await deviceService.imprintDevices(['mac-2']);

      expect(db.updateOne).toHaveBeenCalledWith('pluto_core', 'devices:imprinted', 'mac-2', device);
    });

    it('rethrows non-duplicate insert errors', async () => {
      const device = makeDiscoveredMiner({ mac: 'mac-3' });
      jest.spyOn(deviceService, 'lookupMultipleDiscoveredDevices').mockResolvedValue([device]);

      const error = new Error('boom');
      db.insertOne.mockRejectedValue(error);

      await expect(deviceService.imprintDevices(['mac-3'])).rejects.toThrow('boom');
      expect(logger.error).toHaveBeenCalledWith('Error in imprintDevices:', error);
    });

    it('surfaces update errors after duplicate insert', async () => {
      const device = makeDiscoveredMiner({ mac: 'mac-4' });
      jest.spyOn(deviceService, 'lookupMultipleDiscoveredDevices').mockResolvedValue([device]);

      const duplicateError = new Error('already exists');
      const updateError = new Error('update boom');
      db.insertOne.mockRejectedValue(duplicateError);
      db.updateOne.mockRejectedValue(updateError);

      await expect(deviceService.imprintDevices(['mac-4'])).rejects.toThrow('update boom');
      expect(logger.error).toHaveBeenCalledWith('Error in imprintDevices:', updateError);
    });
  });

  describe('listenToDevices', () => {
    it('listens to devices by fetching when not provided', async () => {
      const devices = [makeDiscoveredMiner({ mac: 'x' })];
      db.findMany.mockResolvedValue(devices);

      const response = await deviceService.listenToDevices(undefined, true);

      expect(db.findMany).toHaveBeenCalledWith('pluto_core', 'devices:imprinted');
      expect(tracing.updateOriginalIpsListeners).toHaveBeenCalledWith(devices, true);
      expect(response).toEqual(devices);
    });

    it('logs and throws on db error', async () => {
      const error = new Error('db down');
      db.findMany.mockRejectedValue(error);

      await expect(deviceService.listenToDevices(undefined, true)).rejects.toThrow('db down');
      expect(logger.error).toHaveBeenCalledWith('Error in listenToDevices:', error);
    });

    it('reuses provided array', async () => {
      const devices = [makeDiscoveredMiner({ mac: 'y' })];

      const response = await deviceService.listenToDevices(devices, false);

      expect(db.findMany).not.toHaveBeenCalled();
      expect(tracing.updateOriginalIpsListeners).toHaveBeenCalledWith(devices, false);
      expect(response).toBe(devices);
    });
  });

  describe('getImprintedDevices', () => {
    it('filters imprinted devices by query over ip', async () => {
      db.findMany.mockResolvedValue([]);

      await deviceService.getImprintedDevices({ q: '10.0.0.1' });

      const predicate = db.findMany.mock.calls[0][2];
      expect(predicate(makeDiscoveredMiner({ ip: '10.0.0.1' }))).toBe(true);
      expect(predicate(makeDiscoveredMiner({ ip: '10.0.0.10' }))).toBe(false);
    });

    it('treats blank query as match-all', async () => {
      db.findMany.mockResolvedValue([]);

      await deviceService.getImprintedDevices({ q: '   ' });

      const predicate = db.findMany.mock.calls[0][2];
      expect(predicate(makeDiscoveredMiner({ ip: '1.2.3.4' }))).toBe(true);
    });

    it('matches full ip when stored as ip:port', async () => {
      db.findMany.mockResolvedValue([]);

      await deviceService.getImprintedDevices({ q: '10.0.0.1' });

      const predicate = db.findMany.mock.calls[0][2];
      expect(predicate(makeDiscoveredMiner({ ip: '10.0.0.1:4028' }))).toBe(true);
    });

    it('logs and throws on db error', async () => {
      const error = new Error('db down');
      db.findMany.mockRejectedValue(error);

      await expect(deviceService.getImprintedDevices({ q: 'x' })).rejects.toThrow('db down');
      expect(logger.error).toHaveBeenCalledWith('Error in getImprintedDevices:', error);
    });

    it('supports partial query matching for imprinted devices', async () => {
      db.findMany.mockResolvedValue([]);

      await deviceService.getImprintedDevices({ q: '10.0' });

      const predicate = db.findMany.mock.calls[0][2];
      expect(predicate(makeDiscoveredMiner({ ip: '10.0.1.5' }))).toBe(true);
      expect(predicate(makeDiscoveredMiner({ ip: '11.0.0.1' }))).toBe(false);
    });

    it('filters imprinted devices by query over hostname and mac', async () => {
      db.findMany.mockResolvedValue([]);

      await deviceService.getImprintedDevices({ q: 'S19' });

      const predicate = db.findMany.mock.calls[0][2];
      const minerWithHostname = makeDiscoveredMiner({
        minerData: { ip: '10.0.0.1', hostname: 'miner-s19-01' } as MinerData,
      });
      expect(predicate(minerWithHostname)).toBe(true);
      const minerWithoutMatch = makeDiscoveredMiner({
        mac: 'xx:yy:zz:aa:bb:cc',
        minerData: { ip: '10.0.0.2', hostname: 'other-miner' } as MinerData,
      });
      expect(predicate(minerWithoutMatch)).toBe(false);

      await deviceService.getImprintedDevices({ q: 'aa:bb' });

      const predicate2 = db.findMany.mock.calls[1][2];
      expect(predicate2(makeDiscoveredMiner({ mac: 'aa:bb:cc:dd:ee:ff' }))).toBe(true);
      const minerWithDifferentMac = makeDiscoveredMiner({
        mac: 'xx:yy:zz:11:22:33',
        minerData: { ip: '10.0.0.1', hostname: 'miner-s19-01' } as MinerData,
      });
      expect(predicate2(minerWithDifferentMac)).toBe(false);
    });
  });

  describe('getImprintedDevice', () => {
    it('gets single imprinted device by mac', async () => {
      const device = makeDiscoveredMiner({ mac: 'mac-3' });
      db.findOne.mockResolvedValue(device);

      await expect(deviceService.getImprintedDevice('mac-3')).resolves.toEqual({ ...device, tracing: false });
      expect(db.findOne).toHaveBeenCalledWith('pluto_core', 'devices:imprinted', 'mac-3');
    });

    it('logs and throws on db error', async () => {
      const error = new Error('db down');
      db.findOne.mockRejectedValue(error);

      await expect(deviceService.getImprintedDevice('mac-3')).rejects.toThrow('db down');
      expect(logger.error).toHaveBeenCalledWith('Error in getImprintedDevice:', error);
    });
  });

  describe('getDevicesByPresetId', () => {
    it('filters devices by preset id', async () => {
      db.findMany.mockResolvedValue([]);

      await deviceService.getDevicesByPresetId('preset-1');

      const predicate = db.findMany.mock.calls[0][2];
      expect(predicate(makeDiscoveredMiner({ presetUuid: 'preset-1' }))).toBe(true);
      expect(predicate(makeDiscoveredMiner({ presetUuid: 'preset-2' }))).toBe(false);
      expect(predicate(makeDiscoveredMiner({}))).toBe(false);
    });

    it('logs and throws on db error', async () => {
      const error = new Error('db down');
      db.findMany.mockRejectedValue(error);

      await expect(deviceService.getDevicesByPresetId('preset-1')).rejects.toThrow('db down');
      expect(logger.error).toHaveBeenCalledWith('Error in getDevicesByPresetId:', error);
    });
  });

  describe('patchImprintedDevice', () => {
    it('patches imprinted device', async () => {
      const payload = makeDiscoveredMiner({ mac: 'mac-4' });
      db.updateOne.mockResolvedValue(payload);

      await deviceService.patchImprintedDevice('mac-4', payload);

      expect(db.updateOne).toHaveBeenCalledWith('pluto_core', 'devices:imprinted', 'mac-4', payload);
    });

    it('logs and throws on db error', async () => {
      const error = new Error('db down');
      db.updateOne.mockRejectedValue(error);

      await expect(deviceService.patchImprintedDevice('mac-4', makeDiscoveredMiner())).rejects.toThrow('db down');
      expect(logger.error).toHaveBeenCalledWith('Error in patchImprintedDevice:', error);
    });
  });

  describe('deleteImprintedDevice', () => {
    it('deletes imprinted device by id', async () => {
      db.deleteOne.mockResolvedValue(null);

      await deviceService.deleteImprintedDevice('mac-5');

      expect(db.deleteOne).toHaveBeenCalledWith('pluto_core', 'devices:imprinted', 'mac-5');
    });

    it('logs and throws on db error', async () => {
      const error = new Error('db down');
      db.deleteOne.mockRejectedValue(error);

      await expect(deviceService.deleteImprintedDevice('mac-5')).rejects.toThrow('db down');
      expect(logger.error).toHaveBeenCalledWith('Error in deleteImprintedDevice:', error);
    });
  });
});
