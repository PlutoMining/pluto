import { discoverDevices, lookupDiscoveredDevice, lookupMultipleDiscoveredDevices } from '@/services/discovery.service';
import { UtilsService } from '@/services/utils.service';
import type { MinerData } from '@pluto/interfaces';
import type { MinerValidationResult } from '../../services/miner-validation.service';

jest.mock('@pluto/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@pluto/db', () => ({
  findOne: jest.fn(),
  findMany: jest.fn(),
  insertOne: jest.fn(),
  updateOne: jest.fn(),
}));

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

jest.mock('@/services/native-detector.service', () => ({
  nativeMinerDetector: {
    detect: jest.fn(),
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
const { logger } = jest.requireMock('@pluto/logger');
const mockFetch = jest.fn();
global.fetch = mockFetch;

const { getActiveNetworkInterfaces, arpScan } = jest.requireMock('@/services/arpScanWrapper');
const { MinerValidationService } = jest.requireMock('@/services/miner-validation.service');
const { nativeMinerDetector } = jest.requireMock('@/services/native-detector.service');
const { config } = jest.requireMock('@/config/environment');

describe('discovery.service helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    nativeMinerDetector.detect.mockReset();
    nativeMinerDetector.detect.mockResolvedValue(null);

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
    it('discovers via native driver when nativeMinerDetector matches (single IP)', async () => {
      const nativeResult = {
        type: 'Bitaxe v2',
        model: 'Bitaxe v2',
        mac: 'aa:bb:cc:dd:ee:ff',
        supportLevel: 'native' as const,
        minerData: {
          ip: '1.2.3.4',
          mac: 'aa:bb:cc:dd:ee:ff',
          hostname: 'bitaxe-1',
          deviceInfo: { make: 'Bitaxe', model: 'Bitaxe v2', firmware: '1.0', algo: 'SHA256' },
          fans: [],
          hashboards: [],
        },
      };

      nativeMinerDetector.detect.mockResolvedValue(nativeResult);
      insertOne.mockResolvedValue(undefined);

      const result = await discoverDevices({ ip: '1.2.3.4' });

      expect(nativeMinerDetector.detect).toHaveBeenCalledWith('1.2.3.4');
      expect(MinerValidationService.validateSingleIp).not.toHaveBeenCalled();
      expect(insertOne).toHaveBeenCalledWith(
        'pluto_discovery',
        'devices:discovered',
        'aa:bb:cc:dd:ee:ff',
        expect.objectContaining({
          ip: '1.2.3.4',
          mac: 'aa:bb:cc:dd:ee:ff',
          type: 'Bitaxe v2',
          supportLevel: 'native',
          minerData: expect.objectContaining({
            ip: '1.2.3.4',
            hostname: 'bitaxe-1',
            deviceInfo: expect.objectContaining({ model: 'Bitaxe v2' }),
          }),
        })
      );
      expect(result).toHaveLength(1);
      expect(result[0].supportLevel).toBe('native');
    });

    it('short-circuits to direct ip lookup and stores device', async () => {
      const validationResult: MinerValidationResult = {
        ip: '1.2.3.4',
        is_miner: true,
        model: 'TestModel',
      };
      const minerData: MinerData = {
        ip: '1.2.3.4',
        mac: 'aa:bb',
        hostname: 'test-miner',
        deviceInfo: { model: 'TestModel' },
        fans: [],
        hashboards: [],
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
        hostname: 'test-miner',
        deviceInfo: { model: 'TestModel' },
        fans: [],
        hashboards: [],
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
        hostname: 'test-miner',
        deviceInfo: { model: 'TestModel' },
        fans: [],
        hashboards: [],
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
        hostname: 'test-miner',
        deviceInfo: { model: 'TestModel' },
        fans: [],
        hashboards: [],
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

    it('handles non-miner validation result without error message', async () => {
      const validationResult: MinerValidationResult = {
        ip: '9.9.9.9',
        is_miner: false,
      };

      MinerValidationService.validateSingleIp.mockResolvedValue(validationResult);

      const result = await discoverDevices({ ip: '9.9.9.9' });

      expect(result).toEqual([]);
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
        hostname: 'miner-a',
        deviceInfo: { model: 'ModelA' },
        fans: [],
        hashboards: [],
      };
      const minerDataB: MinerData = {
        ip: '10.0.0.2',
        mac: 'dd:ee:ff',
        hostname: 'miner-b',
        deviceInfo: { model: 'ModelB' },
        fans: [],
        hashboards: [],
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
        hostname: 'miner-x',
        deviceInfo: { model: 'ModelX' },
        fans: [],
        hashboards: [],
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

      // discoverMockDevices fetches /servers, gets no servers array
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const result = await discoverDevices();

      expect(result).toEqual([]);

      config.detectMockDevices = false;
    });

    it('returns empty array when mock discovery /servers returns non-ok', async () => {
      config.detectMockDevices = true;

      getActiveNetworkInterfaces.mockResolvedValue([]);
      arpScan.mockResolvedValue([]);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await discoverDevices();

      expect(result).toEqual([]);
      config.detectMockDevices = false;
    });

    it('skips mock device when /api/system/info returns non-ok', async () => {
      config.detectMockDevices = true;

      getActiveNetworkInterfaces.mockResolvedValue([]);
      arpScan.mockResolvedValue([]);

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ servers: [{ port: 9001 }, { port: 9002 }] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ip: 'mock:9001',
            hostname: 'mock-1',
            make: 'Bitmain',
            model: 'S19',
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        });

      insertOne.mockResolvedValue(undefined);

      const result = await discoverDevices();

      expect(result).toHaveLength(1);
      expect(result[0].minerData.deviceInfo?.model).toBe('S19');
      config.detectMockDevices = false;
    });

    it('still includes mock device when storeDiscoveredMiner throws (continues with miner)', async () => {
      config.detectMockDevices = true;

      getActiveNetworkInterfaces.mockResolvedValue([]);
      arpScan.mockResolvedValue([]);

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ servers: [{ port: 9001 }] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ip: 'mock:9001',
            hostname: 'mock-1',
            make: 'Bitmain',
            model: 'S19',
          }),
        });

      insertOne.mockRejectedValueOnce(new Error('db write failed'));

      const result = await discoverDevices();

      expect(result).toHaveLength(1);
      expect(result[0].ip).toContain('9001');
      config.detectMockDevices = false;
    });

    it('handles rejected promise when fetching mock device data', async () => {
      config.detectMockDevices = true;

      getActiveNetworkInterfaces.mockResolvedValue([]);
      arpScan.mockResolvedValue([]);

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ servers: [{ port: 9001 }, { port: 9002 }] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ip: 'mock:9001',
            hostname: 'mock-1',
            make: 'Bitmain',
            model: 'S19',
          }),
        })
        .mockRejectedValueOnce(new Error('fetch failed'));

      insertOne.mockResolvedValue(undefined);

      const result = await discoverDevices();

      expect(result).toHaveLength(1);
      config.detectMockDevices = false;
    });

    it('discovers via native driver during ARP scan when nativeMinerDetector matches', async () => {
      getActiveNetworkInterfaces.mockResolvedValue(['eth0']);
      arpScan.mockResolvedValue([{ ip: '10.0.0.1', mac: 'aa:bb:cc', type: 'miner' }]);

      const nativeResult = {
        type: 'Bitaxe v2',
        model: 'Bitaxe v2',
        mac: 'aa:bb:cc',
        supportLevel: 'native' as const,
        minerData: {
          ip: '10.0.0.1',
          mac: 'aa:bb:cc',
          hostname: 'bitaxe',
          deviceInfo: { make: 'Bitaxe', model: 'Bitaxe v2', firmware: '1.0', algo: 'SHA256' },
          fans: [],
          hashboards: [],
        },
      };

      nativeMinerDetector.detect.mockResolvedValue(nativeResult);
      insertOne.mockResolvedValue(undefined);

      const result = await discoverDevices();

      expect(MinerValidationService.validateBatch).not.toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].supportLevel).toBe('native');
      expect(result[0].type).toBe('Bitaxe v2');
    });

    it('skips pyasic-bridge when all IPs in chunk match native', async () => {
      getActiveNetworkInterfaces.mockResolvedValue(['eth0']);
      arpScan.mockResolvedValue([
        { ip: '10.0.0.1', mac: 'aa:bb:cc', type: 'miner' },
        { ip: '10.0.0.2', mac: 'dd:ee:ff', type: 'miner' },
      ]);

      const nativeResult1 = {
        type: 'Bitaxe',
        model: 'Bitaxe',
        mac: 'aa:bb:cc',
        supportLevel: 'native' as const,
        minerData: {
          ip: '10.0.0.1',
          mac: 'aa:bb:cc',
          hostname: 'bitaxe',
          deviceInfo: { make: 'Bitaxe', model: 'Bitaxe' },
          fans: [],
          hashboards: [],
        },
      };
      const nativeResult2 = {
        type: 'Bitaxe',
        model: 'Bitaxe',
        mac: 'dd:ee:ff',
        supportLevel: 'native' as const,
        minerData: {
          ip: '10.0.0.2',
          mac: 'dd:ee:ff',
          hostname: 'bitaxe2',
          deviceInfo: { make: 'Bitaxe', model: 'Bitaxe' },
          fans: [],
          hashboards: [],
        },
      };

      nativeMinerDetector.detect
        .mockResolvedValueOnce(nativeResult1)
        .mockResolvedValueOnce(nativeResult2);
      insertOne.mockResolvedValue(undefined);

      const result = await discoverDevices();

      expect(MinerValidationService.validateBatch).not.toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('logs warn when chunk contains IP not in ARP map (no ARP device found)', async () => {
      getActiveNetworkInterfaces.mockResolvedValue(['eth0']);
      arpScan.mockResolvedValue([{ ip: '10.0.0.1', mac: 'aa:bb:cc', type: 'miner' }]);

      const chunkArraySpy = jest.spyOn(UtilsService, 'chunkArray').mockImplementationOnce((arr, size) => {
        const a = arr as string[];
        const realChunks: string[][] = [];
        for (let i = 0; i < a.length; i += size) {
          realChunks.push(a.slice(i, i + size));
        }
        if (realChunks.length > 0) {
          realChunks[0] = [...realChunks[0], '192.168.99.99'];
        }
        return realChunks;
      });

      nativeMinerDetector.detect.mockResolvedValue(null);
      MinerValidationService.validateBatch.mockResolvedValue([
        { ip: '10.0.0.1', is_miner: true, model: 'A' },
      ]);
      MinerValidationService.fetchMinerData.mockResolvedValue({
        ip: '10.0.0.1',
        mac: 'aa:bb:cc',
        hostname: 'miner',
        deviceInfo: { model: 'A' },
        fans: [],
        hashboards: [],
      });
      insertOne.mockResolvedValue(undefined);

      const result = await discoverDevices();

      expect(logger.warn).toHaveBeenCalledWith('No ARP device found for IP: 192.168.99.99');
      expect(result).toHaveLength(1);
      chunkArraySpy.mockRestore();
    });

    it('skips validated IP when no ARP device found for that IP', async () => {
      getActiveNetworkInterfaces.mockResolvedValue(['eth0']);
      arpScan.mockResolvedValue([{ ip: '10.0.0.1', mac: 'aa:bb:cc', type: 'miner' }]);

      nativeMinerDetector.detect.mockResolvedValue(null);

      MinerValidationService.validateBatch.mockResolvedValue([
        { ip: '10.0.0.1', is_miner: true, model: 'ModelA' },
        { ip: '192.168.99.99', is_miner: true, model: 'ModelB' },
      ]);

      MinerValidationService.fetchMinerData.mockResolvedValue({
        ip: '10.0.0.1',
        mac: 'aa:bb:cc',
        hostname: 'miner-a',
        deviceInfo: { model: 'ModelA' },
        fans: [],
        hashboards: [],
      });

      insertOne.mockResolvedValue(undefined);

      const result = await discoverDevices();

      expect(result).toHaveLength(1);
      expect(result[0].ip).toBe('10.0.0.1');
    });

    it('continues when chunk validation fails (storeDiscoveredMiner throws)', async () => {
      getActiveNetworkInterfaces.mockResolvedValue(['eth0']);
      arpScan.mockResolvedValue([
        { ip: '10.0.0.1', mac: 'aa:bb:cc', type: 'miner' },
        { ip: '10.0.0.2', mac: 'dd:ee:ff', type: 'miner' },
      ]);

      config.pyasicValidationBatchSize = 1;
      const nativeResult = {
        type: 'Bitaxe',
        model: 'Bitaxe',
        mac: 'aa:bb:cc',
        supportLevel: 'native' as const,
        minerData: {
          ip: '10.0.0.1',
          mac: 'aa:bb:cc',
          hostname: 'bitaxe',
          deviceInfo: { make: 'Bitaxe', model: 'Bitaxe' },
          fans: [],
          hashboards: [],
        },
      };

      nativeMinerDetector.detect
        .mockResolvedValueOnce(nativeResult)
        .mockResolvedValueOnce(null);

      MinerValidationService.validateBatch.mockResolvedValue([
        { ip: '10.0.0.2', is_miner: true, model: 'B' },
      ]);
      MinerValidationService.fetchMinerData.mockResolvedValue({
        ip: '10.0.0.2',
        mac: 'dd:ee:ff',
        hostname: 'miner',
        deviceInfo: { model: 'B' },
        fans: [],
        hashboards: [],
      });

      insertOne
        .mockRejectedValueOnce(new Error('db error'))
        .mockResolvedValueOnce(undefined);

      const result = await discoverDevices();

      expect(result).toHaveLength(1);
      expect(result[0].ip).toBe('10.0.0.2');
      config.pyasicValidationBatchSize = 10;
    });

    it('continues when discoverMockDevices throws', async () => {
      config.detectMockDevices = true;

      getActiveNetworkInterfaces.mockResolvedValue(['eth0']);
      arpScan.mockResolvedValue([{ ip: '10.0.0.1', mac: 'aa:bb:cc', type: 'miner' }]);

      nativeMinerDetector.detect.mockResolvedValue(null);
      MinerValidationService.validateBatch.mockResolvedValue([
        { ip: '10.0.0.1', is_miner: true, model: 'A' },
      ]);
      MinerValidationService.fetchMinerData.mockResolvedValue({
        ip: '10.0.0.1',
        mac: 'aa:bb:cc',
        hostname: 'miner',
        deviceInfo: { model: 'A' },
        fans: [],
        hashboards: [],
      });
      insertOne.mockResolvedValue(undefined);

      mockFetch.mockRejectedValueOnce(new Error('mock discovery failed'));

      const result = await discoverDevices();

      expect(result).toHaveLength(1);
      expect(result[0].ip).toBe('10.0.0.1');
      config.detectMockDevices = false;
    });

    it('continues when discoverMockDevices throws a non-Error value', async () => {
      config.detectMockDevices = true;

      getActiveNetworkInterfaces.mockResolvedValue(['eth0']);
      arpScan.mockResolvedValue([{ ip: '10.0.0.1', mac: 'aa:bb:cc', type: 'miner' }]);

      nativeMinerDetector.detect.mockResolvedValue(null);
      MinerValidationService.validateBatch.mockResolvedValue([
        { ip: '10.0.0.1', is_miner: true, model: 'A' },
      ]);
      MinerValidationService.fetchMinerData.mockResolvedValue({
        ip: '10.0.0.1',
        mac: 'aa:bb:cc',
        hostname: 'miner',
        deviceInfo: { model: 'A' },
        fans: [],
        hashboards: [],
      });
      insertOne.mockResolvedValue(undefined);

      // Throw a non-Error value to cover the String(error) branch
      mockFetch.mockRejectedValueOnce('string error');

      const result = await discoverDevices();

      expect(result).toHaveLength(1);
      config.detectMockDevices = false;
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
        hostname: 'miner-a',
        deviceInfo: { model: 'ModelA' },
        fans: [],
        hashboards: [],
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
        hostname: 'miner-a',
        deviceInfo: { model: 'ModelA' },
        fans: [],
        hashboards: [],
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

    it('filters discovered miners by mac when mac option is provided', async () => {
      getActiveNetworkInterfaces.mockResolvedValue(['eth0']);
      arpScan.mockResolvedValue([
        { ip: '10.0.0.1', mac: 'aa:bb:cc', type: 'miner' },
        { ip: '10.0.0.2', mac: 'dd:ee:ff', type: 'miner' },
      ]);

      const validationResults: MinerValidationResult[] = [
        { ip: '10.0.0.1', is_miner: true, model: 'ModelA' },
        { ip: '10.0.0.2', is_miner: true, model: 'ModelB' },
      ];
      const minerDataA: MinerData = {
        ip: '10.0.0.1',
        mac: 'aa:bb:cc',
        hostname: 'miner-a',
        deviceInfo: { model: 'ModelA' },
        fans: [],
        hashboards: [],
      };
      const minerDataB: MinerData = {
        ip: '10.0.0.2',
        mac: 'dd:ee:ff',
        hostname: 'miner-b',
        deviceInfo: { model: 'ModelB' },
        fans: [],
        hashboards: [],
      };

      MinerValidationService.validateBatch.mockResolvedValue(validationResults);
      MinerValidationService.fetchMinerData
        .mockResolvedValueOnce(minerDataA)
        .mockResolvedValueOnce(minerDataB);
      insertOne.mockResolvedValue(undefined);

      const result = await discoverDevices({ mac: 'aa:bb:cc' });

      expect(getActiveNetworkInterfaces).toHaveBeenCalled();
      expect(arpScan).toHaveBeenCalledWith('eth0');
      expect(result).toHaveLength(1);
      expect(result[0].mac).toBe('aa:bb:cc');
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

    it('discovers mock devices directly, bypassing pyasic-bridge validation', async () => {
      config.detectMockDevices = true;
      config.mockDiscoveryHost = 'http://mock-host:7000';
      config.mockDeviceHost = 'host.docker.internal';

      // No real devices from ARP
      getActiveNetworkInterfaces.mockResolvedValue([]);
      arpScan.mockResolvedValue([]);

      const mockIp = 'host.docker.internal:9001';

      // First fetch: listing server /servers
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ servers: [{ port: 9001 }] }),
      });

      // Second fetch: mock device /api/system/info
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ip: mockIp,
          mac: 'ff:ff:ff:ff:23:29',
          hostname: 'mock-miner-1',
          make: 'Bitmain',
          model: 'Antminer S19 Pro',
          hashrate: 100000,
          is_mining: true,
          uptime: 3600,
          fans: [{ speed: 5000 }],
          hashboards: [{ slot: 0, hashrate: 33000, temp: 65, active: true }],
        }),
      });

      insertOne.mockResolvedValue(undefined);

      const result = await discoverDevices();

      expect(result).toHaveLength(1);
      expect(result[0].ip).toBe(mockIp);
      expect(result[0].supportLevel).toBe('generic');
      expect(result[0].minerData.deviceInfo?.model).toBe('Antminer S19 Pro');
      // pyasic-bridge should NOT be called for mock devices
      expect(MinerValidationService.validateBatch).not.toHaveBeenCalled();

      config.detectMockDevices = false;
      config.mockDeviceHost = undefined;
    });

    it('returns empty array when discovery fails before scanning completes', async () => {
      getActiveNetworkInterfaces.mockRejectedValue(new Error('no perms'));

      const result = await discoverDevices();

      expect(result).toEqual([]);
    });
  });
});
