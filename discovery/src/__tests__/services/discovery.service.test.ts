import axios from 'axios';
import { discoverDevices, lookupDiscoveredDevice, lookupMultipleDiscoveredDevices } from '@/services/discovery.service';
import type { MinerData, MinerValidationResult } from '@pluto/pyasic-bridge-client';

jest.mock('@pluto/db', () => ({
  findOne: jest.fn(),
  findMany: jest.fn(),
  insertOne: jest.fn(),
  updateOne: jest.fn(),
}));

jest.mock('axios');

jest.mock('@/services/arpScanWrapper', () => ({
  getActiveNetworkInterfaces: jest.fn(),
  arpScan: jest.fn(),
}));

jest.mock('@/services/miner-validation.service', () => ({
  MinerValidationService: {
    validateSingleIp: jest.fn(),
    validateBatch: jest.fn(),
    fetchMinerData: jest.fn(),
  },
}));

jest.mock('@/config/environment', () => ({
  config: {
    detectMockDevices: false,
    mockDiscoveryHost: 'http://mock-discovery',
    mockDeviceHost: undefined,
    pyasicBridgeHost: 'http://pyasic-bridge:8000',
    pyasicValidationBatchSize: 10,
    pyasicValidationConcurrency: 3,
    pyasicValidationTimeout: 3000,
  },
}));

const { findOne, findMany, insertOne, updateOne } = jest.requireMock('@pluto/db');
const axiosModule = jest.requireMock('axios');
class MockAxiosError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}
axiosModule.AxiosError = MockAxiosError;

const mockedAxios = axios as jest.Mocked<typeof axios>;
const { getActiveNetworkInterfaces, arpScan } = jest.requireMock('@/services/arpScanWrapper');
const { MinerValidationService } = jest.requireMock('@/services/miner-validation.service');
const { config } = jest.requireMock('@/config/environment');

describe('discovery.service helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.get.mockReset();

    // Reset shared config mutable object between tests
    config.detectMockDevices = false;
    config.mockDiscoveryHost = 'http://mock-discovery';
    config.mockDeviceHost = undefined;
  });

  describe('lookupDiscoveredDevice', () => {
    it('returns device when found', async () => {
      const device = { mac: 'aa:bb' };
      findOne.mockResolvedValue(device);

      await expect(lookupDiscoveredDevice('aa:bb')).resolves.toEqual(device);
      expect(findOne).toHaveBeenCalledWith('pluto_discovery', 'devices:discovered', 'aa:bb');
    });

    it('returns undefined when not found', async () => {
      findOne.mockResolvedValue(undefined);

      await expect(lookupDiscoveredDevice('cc:dd')).resolves.toBeUndefined();
    });

    it('throws when lookup fails', async () => {
      findOne.mockRejectedValue(new Error('db error'));

      await expect(lookupDiscoveredDevice('ee:ff')).rejects.toThrow('db error');
    });
  });

  describe('lookupMultipleDiscoveredDevices', () => {
    it('filters devices using partial match options', async () => {
      const devices = [
        {
          mac: 'aa:bb:cc',
          ip: '192.168.1.10',
          minerData: { ip: '192.168.1.10', hostname: 'rig-alpha' },
        },
        {
          mac: 'dd:ee:ff',
          ip: '10.0.0.5',
          minerData: { ip: '10.0.0.5', hostname: 'rig-beta' },
        },
      ];

      findMany.mockImplementation(async (_db: string, _collection: string, predicate: (device: any) => boolean) => {
        return devices.filter((device) => predicate(device));
      });

      const result = await lookupMultipleDiscoveredDevices({
        macs: ['aa:bb'],
        ips: ['192.168'],
        hostnames: ['alpha'],
        partialMatch: { macs: 'both', ips: 'right', hostnames: 'both' },
      });

      expect(result).toHaveLength(1);
      expect(result[0].mac).toBe('aa:bb:cc');
    });

    it('defaults to both-sided partial matching when partialMatch keys are missing', async () => {
      const devices = [
        {
          mac: 'aa:bb:cc',
          ip: '192.168.1.10',
          minerData: { ip: '192.168.1.10', hostname: 'rig-alpha' },
        },
        {
          mac: 'dd:ee:ff',
          ip: '10.0.0.5',
          minerData: { ip: '10.0.0.5', hostname: 'rig-beta' },
        },
      ];

      findMany.mockImplementation(async (_db: string, _collection: string, predicate: (device: any) => boolean) => {
        return devices.filter((device) => predicate(device));
      });

      const result = await lookupMultipleDiscoveredDevices({
        macs: ['aa:bb'],
        ips: ['192.168'],
        hostnames: ['alpha'],
        partialMatch: {} as any,
      });

      expect(result).toHaveLength(1);
      expect(result[0].mac).toBe('aa:bb:cc');
    });

    it('supports exact (none) and left partial match types', async () => {
      const devices = [
        {
          mac: 'aa:bb:cc',
          ip: '10.0.0.1',
          minerData: { ip: '10.0.0.1', hostname: 'rig-alpha' },
        },
        {
          mac: 'dd:ee:ff',
          ip: '10.0.0.2',
          minerData: { ip: '10.0.0.2', hostname: 'rig-beta' },
        },
      ];

      findMany.mockImplementation(async (_db: string, _collection: string, predicate: (device: any) => boolean) => {
        return devices.filter((device) => predicate(device));
      });

      const result = await lookupMultipleDiscoveredDevices({
        macs: ['aa:bb:cc'],
        ips: ['0.0.1'],
        partialMatch: { macs: 'none', ips: 'left' },
      });

      expect(result).toHaveLength(1);
      expect(result[0].ip).toBe('10.0.0.1');
    });

    it('returns empty list when IP filter mismatches', async () => {
      const devices = [
        {
          mac: 'aa:bb:cc',
          ip: '10.0.0.1',
          minerData: { ip: '10.0.0.1', hostname: 'rig-alpha' },
        },
      ];

      findMany.mockImplementation(async (_db: string, _collection: string, predicate: (device: any) => boolean) => {
        return devices.filter((device) => predicate(device));
      });

      const result = await lookupMultipleDiscoveredDevices({
        macs: ['aa:bb'],
        ips: ['192.168.1.10'],
        partialMatch: { macs: 'both', ips: 'none' },
      });

      expect(result).toHaveLength(0);
    });

    it('returns empty list when hostname filter mismatches', async () => {
      const devices = [
        {
          mac: 'aa:bb:cc',
          ip: '10.0.0.1',
          minerData: { ip: '10.0.0.1', hostname: 'rig-alpha' },
        },
      ];

      findMany.mockImplementation(async (_db: string, _collection: string, predicate: (device: any) => boolean) => {
        return devices.filter((device) => predicate(device));
      });

      const result = await lookupMultipleDiscoveredDevices({
        hostnames: ['rig-gamma'],
        partialMatch: { hostnames: 'none' },
      });

      expect(result).toHaveLength(0);
    });

    it('throws when findMany fails', async () => {
      findMany.mockRejectedValue(new Error('findMany boom'));

      await expect(
        lookupMultipleDiscoveredDevices({
          macs: ['aa:bb'],
        }),
      ).rejects.toThrow('findMany boom');
    });
  });

  describe('discoverDevices', () => {
    it('short-circuits to direct ip lookup and stores device', async () => {
      const validationResult: MinerValidationResult = {
        ip: '1.2.3.4',
        is_miner: true,
        model: 'TestModel',
      };
      const minerData: MinerData = {
        ip: '1.2.3.4',
        mac: 'aa:bb',
        model: 'TestModel',
        hostname: 'test-miner',
        device_info: { model: 'TestModel' },
      };

      MinerValidationService.validateSingleIp.mockResolvedValue(validationResult);
      MinerValidationService.fetchMinerData.mockResolvedValue(minerData);
      insertOne.mockResolvedValue(undefined);

      const result = await discoverDevices({ ip: '1.2.3.4' });

      expect(MinerValidationService.validateSingleIp).toHaveBeenCalledWith('1.2.3.4');
      expect(MinerValidationService.fetchMinerData).toHaveBeenCalledWith('1.2.3.4');
      expect(insertOne).toHaveBeenCalledWith(
        'pluto_discovery',
        'devices:discovered',
        'aa:bb',
        expect.objectContaining({
          ip: '1.2.3.4',
          mac: 'aa:bb',
          type: 'TestModel',
          minerData: expect.objectContaining({
            ip: '1.2.3.4',
            mac: 'aa:bb',
            hostname: 'test-miner',
          }),
        }),
      );
      expect(result).toHaveLength(1);
    });

    it('uses provided mac when miner data lacks mac', async () => {
      const validationResult: MinerValidationResult = {
        ip: '1.2.3.4',
        is_miner: true,
        model: 'TestModel',
      };
      const minerData: MinerData = {
        ip: '1.2.3.4',
        model: 'TestModel',
        hostname: 'test-miner',
        device_info: { model: 'TestModel' },
      };

      MinerValidationService.validateSingleIp.mockResolvedValue(validationResult);
      MinerValidationService.fetchMinerData.mockResolvedValue(minerData);
      insertOne.mockResolvedValue(undefined);

      const result = await discoverDevices({ ip: '1.2.3.4', mac: 'ff:ee' });

      expect(result).toHaveLength(1);
      expect(insertOne).toHaveBeenCalledWith(
        'pluto_discovery',
        'devices:discovered',
        'ff:ee',
        expect.objectContaining({
          ip: '1.2.3.4',
          mac: 'ff:ee',
        }),
      );
    });

    it('falls back to unknown mac when validation and options provide none', async () => {
      const validationResult: MinerValidationResult = {
        ip: '1.2.3.4',
        is_miner: true,
        model: 'TestModel',
      };
      const minerData: MinerData = {
        ip: '1.2.3.4',
        model: 'TestModel',
        hostname: 'test-miner',
        device_info: { model: 'TestModel' },
      };

      MinerValidationService.validateSingleIp.mockResolvedValue(validationResult);
      MinerValidationService.fetchMinerData.mockResolvedValue(minerData);
      insertOne.mockResolvedValue(undefined);

      const result = await discoverDevices({ ip: '1.2.3.4' });

      expect(result).toHaveLength(1);
      expect(insertOne).toHaveBeenCalledWith(
        'pluto_discovery',
        'devices:discovered',
        'unknown',
        expect.objectContaining({
          ip: '1.2.3.4',
          mac: 'unknown',
        }),
      );
    });

    it('updates device when it already exists during direct ip lookup', async () => {
      const validationResult: MinerValidationResult = {
        ip: '1.2.3.4',
        is_miner: true,
        model: 'TestModel',
      };
      const minerData: MinerData = {
        ip: '1.2.3.4',
        mac: 'aa:bb',
        model: 'TestModel',
        hostname: 'test-miner',
        device_info: { model: 'TestModel' },
      };

      MinerValidationService.validateSingleIp.mockResolvedValue(validationResult);
      MinerValidationService.fetchMinerData.mockResolvedValue(minerData);
      insertOne.mockRejectedValue(new Error('already exists'));
      updateOne.mockResolvedValue(undefined);

      const result = await discoverDevices({ ip: '1.2.3.4' });

      expect(result).toHaveLength(1);
      expect(updateOne).toHaveBeenCalledWith(
        'pluto_discovery',
        'devices:discovered',
        'aa:bb',
        expect.objectContaining({
          ip: '1.2.3.4',
          mac: 'aa:bb',
        }),
      );
    });

    it('handles validation failure during direct ip lookup', async () => {
      MinerValidationService.validateSingleIp.mockResolvedValue(null);

      const result = await discoverDevices({ ip: '9.9.9.9' });

      expect(result).toEqual([]);
      expect(MinerValidationService.fetchMinerData).not.toHaveBeenCalled();
      expect(insertOne).not.toHaveBeenCalled();
    });

    it('handles non-miner validation result', async () => {
      const validationResult: MinerValidationResult = {
        ip: '9.9.9.9',
        is_miner: false,
        error: 'Not a miner',
      };

      MinerValidationService.validateSingleIp.mockResolvedValue(validationResult);

      const result = await discoverDevices({ ip: '9.9.9.9' });

      expect(result).toEqual([]);
      expect(MinerValidationService.fetchMinerData).not.toHaveBeenCalled();
    });

    it('handles validation service errors during direct ip lookup', async () => {
      MinerValidationService.validateSingleIp.mockRejectedValue(new Error('validation error'));

      const result = await discoverDevices({ ip: '9.9.9.9' });

      expect(result).toEqual([]);
    });

    it('scans network interfaces and handles insert/update flows', async () => {
      getActiveNetworkInterfaces.mockResolvedValue(['eth0', 'eth1']);
      arpScan.mockImplementation(async (iface: string) => {
        if (iface === 'eth1') {
          throw new Error('scan failed');
        }
        return [
          { ip: '10.0.0.1', mac: 'aa:bb:cc', type: 'miner' },
          { ip: '10.0.0.2', mac: 'dd:ee:ff', type: 'miner' },
        ];
      });

      const validationResults: MinerValidationResult[] = [
        { ip: '10.0.0.1', is_miner: true, model: 'ModelA' },
        { ip: '10.0.0.2', is_miner: true, model: 'ModelB' },
      ];
      const minerDataA: MinerData = {
        ip: '10.0.0.1',
        mac: 'aa:bb:cc',
        model: 'ModelA',
        hostname: 'miner-a',
        device_info: { model: 'ModelA' },
      };
      const minerDataB: MinerData = {
        ip: '10.0.0.2',
        mac: 'dd:ee:ff',
        model: 'ModelB',
        hostname: 'miner-b',
        device_info: { model: 'ModelB' },
      };

      MinerValidationService.validateBatch.mockResolvedValue(validationResults);
      MinerValidationService.fetchMinerData
        .mockResolvedValueOnce(minerDataA)
        .mockResolvedValueOnce(minerDataB);

      insertOne
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('already exists'));
      updateOne.mockResolvedValue(undefined);

      const result = await discoverDevices();

      expect(getActiveNetworkInterfaces).toHaveBeenCalled();
      expect(arpScan).toHaveBeenCalledWith('eth0');
      expect(MinerValidationService.validateBatch).toHaveBeenCalledWith(['10.0.0.1', '10.0.0.2']);
      expect(MinerValidationService.fetchMinerData).toHaveBeenCalledTimes(2);
      expect(insertOne).toHaveBeenCalledTimes(2);
      expect(updateOne).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(2);
      expect(result[0].ip).toBe('10.0.0.1');
    });

    it('handles non-Error arp scan failures without aborting discovery', async () => {
      getActiveNetworkInterfaces.mockResolvedValue(['eth0']);
      arpScan.mockRejectedValueOnce('scan failed');

      const result = await discoverDevices();

      expect(result).toEqual([]);
      expect(MinerValidationService.validateBatch).not.toHaveBeenCalled();
    });

    it('returns empty array when arp scan finds no devices and no ip filter provided', async () => {
      getActiveNetworkInterfaces.mockResolvedValue(['eth0']);
      arpScan.mockResolvedValue([]);

      const result = await discoverDevices();

      expect(result).toEqual([]);
      expect(MinerValidationService.validateBatch).not.toHaveBeenCalled();
    });

    it('returns empty array when validation indicates not a miner', async () => {
      const validationResult: MinerValidationResult = {
        ip: '5.6.7.8',
        is_miner: false,
        error: 'Not a miner',
      };

      MinerValidationService.validateSingleIp.mockResolvedValue(validationResult);

      const result = await discoverDevices({ ip: '5.6.7.8' });

      expect(result).toEqual([]);
      expect(insertOne).not.toHaveBeenCalled();
    });

    it('handles validation errors gracefully', async () => {
      MinerValidationService.validateSingleIp.mockRejectedValue(new Error('timeout'));

      const result = await discoverDevices({ ip: '9.9.9.9' });

      expect(result).toEqual([]);
    });

    it('falls back when insert fails unexpectedly', async () => {
      const validationResult: MinerValidationResult = {
        ip: '7.7.7.7',
        is_miner: true,
        model: 'ModelX',
      };
      const minerData: MinerData = {
        ip: '7.7.7.7',
        model: 'ModelX',
        hostname: 'miner-x',
        device_info: { model: 'ModelX' },
      };

      MinerValidationService.validateSingleIp.mockResolvedValue(validationResult);
      MinerValidationService.fetchMinerData.mockResolvedValue(minerData);
      insertOne.mockRejectedValue(new Error('boom'));

      const result = await discoverDevices({ ip: '7.7.7.7' });

      expect(result).toEqual([]);
    });

    it('returns empty array when mock server list is missing', async () => {
      config.detectMockDevices = true;

      getActiveNetworkInterfaces.mockResolvedValue([]);
      arpScan.mockResolvedValue([]);

      mockedAxios.get.mockResolvedValueOnce({ data: {} });

      const result = await discoverDevices();

      expect(result).toEqual([]);
    });

    it('filters arp scan results by partial ip match', async () => {
      getActiveNetworkInterfaces.mockResolvedValue(['eth0']);
      arpScan.mockResolvedValue([
        { ip: '10.0.0.1', mac: 'aa:bb:cc', type: 'miner' },
        { ip: '192.168.1.50', mac: 'dd:ee:ff', type: 'miner' },
      ]);

      const validationResult: MinerValidationResult = {
        ip: '10.0.0.1',
        is_miner: true,
        model: 'ModelA',
      };
      const minerData: MinerData = {
        ip: '10.0.0.1',
        mac: 'aa:bb:cc',
        model: 'ModelA',
        hostname: 'miner-a',
        device_info: { model: 'ModelA' },
      };

      MinerValidationService.validateBatch.mockResolvedValue([validationResult]);
      MinerValidationService.fetchMinerData.mockResolvedValue(minerData);
      insertOne.mockResolvedValue(undefined);

      const result = await discoverDevices({ ip: '10.0', partialMatch: true });

      expect(result).toHaveLength(1);
      expect(MinerValidationService.validateBatch).toHaveBeenCalledWith(['10.0.0.1']);
    });

    it('returns empty array when no valid devices remain after filtering', async () => {
      getActiveNetworkInterfaces.mockResolvedValue(['eth0']);
      arpScan.mockResolvedValue([{ ip: '', mac: 'aa:bb:cc', type: 'miner' }]);

      const result = await discoverDevices({ ip: '10.0', partialMatch: true });

      expect(result).toEqual([]);
      expect(MinerValidationService.validateBatch).not.toHaveBeenCalled();
    });

    it('keeps discovered device when insert fails unexpectedly during scan', async () => {
      getActiveNetworkInterfaces.mockResolvedValue(['eth0']);
      arpScan.mockResolvedValue([{ ip: '10.0.0.1', mac: 'aa:bb:cc', type: 'miner' }]);

      const validationResult: MinerValidationResult = {
        ip: '10.0.0.1',
        is_miner: true,
        model: 'ModelA',
      };
      const minerData: MinerData = {
        ip: '10.0.0.1',
        mac: 'aa:bb:cc',
        model: 'ModelA',
        hostname: 'miner-a',
        device_info: { model: 'ModelA' },
      };

      MinerValidationService.validateBatch.mockResolvedValue([validationResult]);
      MinerValidationService.fetchMinerData.mockResolvedValue(minerData);
      insertOne.mockRejectedValue(new Error('db down'));

      const result = await discoverDevices();

      expect(result).toHaveLength(1);
      expect(result[0].ip).toBe('10.0.0.1');
      expect(updateOne).not.toHaveBeenCalled();
    });

    it('skips device during scan when validation indicates not a miner', async () => {
      getActiveNetworkInterfaces.mockResolvedValue(['eth0']);
      arpScan.mockResolvedValue([{ ip: '10.0.0.1', mac: 'aa:bb:cc', type: 'miner' }]);

      const validationResult: MinerValidationResult = {
        ip: '10.0.0.1',
        is_miner: false,
        error: 'Not a miner',
      };

      MinerValidationService.validateBatch.mockResolvedValue([validationResult]);

      const result = await discoverDevices();

      expect(result).toEqual([]);
      expect(insertOne).not.toHaveBeenCalled();
    });

    it('handles validation errors during scan and continues', async () => {
      getActiveNetworkInterfaces.mockResolvedValue(['eth0']);
      arpScan.mockResolvedValue([{ ip: '10.0.0.1', mac: 'aa:bb:cc', type: 'miner' }]);

      MinerValidationService.validateBatch.mockRejectedValueOnce(new Error('connection refused'));

      const result = await discoverDevices();

      expect(result).toEqual([]);
    });

    it('handles batch validation returning empty results', async () => {
      getActiveNetworkInterfaces.mockResolvedValue(['eth0']);
      arpScan.mockResolvedValue([{ ip: '10.0.0.1', mac: 'aa:bb:cc', type: 'miner' }]);

      MinerValidationService.validateBatch.mockResolvedValue([]);

      const result = await discoverDevices();

      expect(result).toEqual([]);
    });

    it('skips mock devices from validation when detection is enabled', async () => {
      config.detectMockDevices = true;
      config.mockDiscoveryHost = 'http://mock-host:7000';
      config.mockDeviceHost = 'host.docker.internal';

      getActiveNetworkInterfaces.mockResolvedValue([]);
      arpScan.mockResolvedValue([]);

      mockedAxios.get.mockResolvedValueOnce({ data: { servers: [{ port: 9001 }] } });

      const result = await discoverDevices();

      // Mock devices are skipped from pyasic-bridge validation (as per code comment)
      expect(result).toHaveLength(0);
      expect(MinerValidationService.validateBatch).not.toHaveBeenCalled();

      config.detectMockDevices = false;
      config.mockDeviceHost = undefined;
    });

    it('skips mock devices even when mock server list is provided', async () => {
      config.detectMockDevices = true;
      config.mockDiscoveryHost = 'http://mock-host:7000';
      config.mockDeviceHost = undefined;

      getActiveNetworkInterfaces.mockResolvedValue([]);
      arpScan.mockResolvedValue([]);

      mockedAxios.get.mockResolvedValueOnce({
        data: { servers: [{ port: '9001' }, { port: 0 }, { port: 'wat' }] },
      });

      const result = await discoverDevices();

      // Mock devices are skipped from pyasic-bridge validation
      expect(result).toHaveLength(0);
      expect(MinerValidationService.validateBatch).not.toHaveBeenCalled();
    });

    it('returns empty array when discovery fails before scanning completes', async () => {
      getActiveNetworkInterfaces.mockRejectedValue(new Error('no perms'));

      const result = await discoverDevices();

      expect(result).toEqual([]);
    });
  });
});
