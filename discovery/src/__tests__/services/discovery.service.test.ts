import axios from 'axios';
import { discoverDevices, lookupDiscoveredDevice, lookupMultipleDiscoveredDevices } from '@/services/discovery.service';

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

jest.mock('@/config/environment', () => ({
  config: {
    detectMockDevices: false,
    mockDiscoveryHost: 'http://mock-discovery',
    mockDeviceHost: undefined,
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
        { mac: 'aa:bb:cc', ip: '192.168.1.10', info: { hostname: 'rig-alpha' } },
        { mac: 'dd:ee:ff', ip: '10.0.0.5', info: { hostname: 'rig-beta' } },
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
        { mac: 'aa:bb:cc', ip: '192.168.1.10', info: { hostname: 'rig-alpha' } },
        { mac: 'dd:ee:ff', ip: '10.0.0.5', info: { hostname: 'rig-beta' } },
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
        { mac: 'aa:bb:cc', ip: '10.0.0.1', info: { hostname: 'rig-alpha' } },
        { mac: 'dd:ee:ff', ip: '10.0.0.2', info: { hostname: 'rig-beta' } },
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
      const devices = [{ mac: 'aa:bb:cc', ip: '10.0.0.1', info: { hostname: 'rig-alpha' } }];

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
      const devices = [{ mac: 'aa:bb:cc', ip: '10.0.0.1', info: { hostname: 'rig-alpha' } }];

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
      mockedAxios.get.mockResolvedValue({
        data: { ASICModel: 'TestModel', mac: 'aa:bb', extra: true },
      });
      insertOne.mockResolvedValue(undefined);

      const result = await discoverDevices({ ip: '1.2.3.4' });

      expect(mockedAxios.get).toHaveBeenCalledWith('http://1.2.3.4/api/system/info', { timeout: 1000 });
      expect(insertOne).toHaveBeenCalledWith(
        'pluto_discovery',
        'devices:discovered',
        'aa:bb',
        expect.objectContaining({
          ip: '1.2.3.4',
          info: expect.objectContaining({ ASICModel: 'TestModel' }),
        }),
      );
      expect(result).toHaveLength(1);
    });

    it('uses provided mac when direct lookup response lacks mac', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { ASICModel: 'TestModel' },
      });
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

    it('falls back to unknown mac when direct lookup and options provide none', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { ASICModel: 'TestModel' },
      });
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
      mockedAxios.get.mockResolvedValue({
        data: { ASICModel: 'TestModel', mac: 'aa:bb', extra: true },
      });

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

    it('handles non-timeout axios errors during direct ip lookup', async () => {
      mockedAxios.get.mockRejectedValue(new MockAxiosError('connection refused', 'ECONNREFUSED'));

      const result = await discoverDevices({ ip: '9.9.9.9' });

      expect(result).toEqual([]);
    });

    it('handles non-Axios errors during direct ip lookup by stringifying them', async () => {
      mockedAxios.get.mockRejectedValueOnce('boom');

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

      mockedAxios.get
        .mockResolvedValueOnce({ data: { ASICModel: 'ModelA' } })
        .mockResolvedValueOnce({ data: { ASICModel: 'ModelB' } });

      insertOne
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('already exists'));
      updateOne.mockResolvedValue(undefined);

      const result = await discoverDevices();

      expect(getActiveNetworkInterfaces).toHaveBeenCalled();
      expect(arpScan).toHaveBeenCalledWith('eth0');
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
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
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('returns empty array when arp scan finds no devices and no ip filter provided', async () => {
      getActiveNetworkInterfaces.mockResolvedValue(['eth0']);
      arpScan.mockResolvedValue([]);

      const result = await discoverDevices();

      expect(result).toEqual([]);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('returns empty array when ASICModel missing', async () => {
      mockedAxios.get.mockResolvedValue({ data: {} });

      const result = await discoverDevices({ ip: '5.6.7.8' });

      expect(result).toEqual([]);
    });

    it('handles axios errors gracefully', async () => {
      mockedAxios.get.mockRejectedValue(new MockAxiosError('timeout', 'ECONNABORTED'));

      const result = await discoverDevices({ ip: '9.9.9.9' });

      expect(result).toEqual([]);
    });

    it('falls back when insert fails unexpectedly', async () => {
      mockedAxios.get.mockResolvedValue({ data: { ASICModel: 'ModelX' } });
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

      mockedAxios.get.mockResolvedValueOnce({ data: { ASICModel: 'ModelA' } });
      insertOne.mockResolvedValue(undefined);

      const result = await discoverDevices({ ip: '10.0', partialMatch: true });

      expect(result).toHaveLength(1);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(mockedAxios.get).toHaveBeenCalledWith('http://10.0.0.1/api/system/info', { timeout: 1000 });
    });

    it('returns empty array when no valid devices remain after filtering', async () => {
      getActiveNetworkInterfaces.mockResolvedValue(['eth0']);
      arpScan.mockResolvedValue([{ ip: '', mac: 'aa:bb:cc', type: 'miner' }]);

      const result = await discoverDevices({ ip: '10.0', partialMatch: true });

      expect(result).toEqual([]);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('keeps discovered device when insert fails unexpectedly during scan', async () => {
      getActiveNetworkInterfaces.mockResolvedValue(['eth0']);
      arpScan.mockResolvedValue([{ ip: '10.0.0.1', mac: 'aa:bb:cc', type: 'miner' }]);

      mockedAxios.get.mockResolvedValueOnce({ data: { ASICModel: 'ModelA' } });
      insertOne.mockRejectedValue(new Error('db down'));

      const result = await discoverDevices();

      expect(result).toHaveLength(1);
      expect(result[0].ip).toBe('10.0.0.1');
      expect(updateOne).not.toHaveBeenCalled();
    });

    it('skips device during scan when ASICModel is missing', async () => {
      getActiveNetworkInterfaces.mockResolvedValue(['eth0']);
      arpScan.mockResolvedValue([{ ip: '10.0.0.1', mac: 'aa:bb:cc', type: 'miner' }]);

      mockedAxios.get.mockResolvedValueOnce({ data: {} });

      const result = await discoverDevices();

      expect(result).toEqual([]);
      expect(insertOne).not.toHaveBeenCalled();
    });

    it('handles non-timeout axios error during scan and continues', async () => {
      getActiveNetworkInterfaces.mockResolvedValue(['eth0']);
      arpScan.mockResolvedValue([{ ip: '10.0.0.1', mac: 'aa:bb:cc', type: 'miner' }]);

      mockedAxios.get.mockRejectedValueOnce(new MockAxiosError('connection refused', 'ECONNREFUSED'));

      const result = await discoverDevices();

      expect(result).toEqual([]);
    });

    it('handles non-Axios errors during scan by stringifying them', async () => {
      getActiveNetworkInterfaces.mockResolvedValue(['eth0']);
      arpScan.mockResolvedValue([{ ip: '10.0.0.1', mac: 'aa:bb:cc', type: 'miner' }]);

      mockedAxios.get.mockRejectedValueOnce('boom');

      const result = await discoverDevices();

      expect(result).toEqual([]);
    });

    it('logs and skips when request times out during scan', async () => {
      getActiveNetworkInterfaces.mockResolvedValue(['eth0']);
      arpScan.mockResolvedValue([{ ip: '10.0.0.1', mac: 'aa:bb:cc', type: 'miner' }]);

      mockedAxios.get.mockRejectedValueOnce(new MockAxiosError('timeout', 'ECONNABORTED'));

      const result = await discoverDevices();

      expect(result).toEqual([]);
    });

    it('appends mock devices when detection is enabled', async () => {
      config.detectMockDevices = true;
      config.mockDiscoveryHost = 'http://mock-host:7000';
      config.mockDeviceHost = 'host.docker.internal';

      getActiveNetworkInterfaces.mockResolvedValue([]);
      arpScan.mockResolvedValue([]);

      mockedAxios.get
        .mockResolvedValueOnce({ data: { servers: [{ port: 9001 }] } })
        .mockResolvedValueOnce({ data: { ASICModel: 'MockModel' } });

      insertOne.mockResolvedValue(undefined);

      const result = await discoverDevices();

      expect(result).toHaveLength(1);
      expect(result[0].ip).toContain('host.docker.internal');

      config.detectMockDevices = false;
      config.mockDeviceHost = undefined;
    });

    it('builds mock device ips from discovery host when mockDeviceHost is unset', async () => {
      config.detectMockDevices = true;
      config.mockDiscoveryHost = 'http://mock-host:7000';
      config.mockDeviceHost = undefined;

      getActiveNetworkInterfaces.mockResolvedValue([]);
      arpScan.mockResolvedValue([]);

      mockedAxios.get
        .mockResolvedValueOnce({ data: { servers: [{ port: '9001' }, { port: 0 }, { port: 'wat' }] } })
        .mockResolvedValueOnce({ data: { ASICModel: 'MockModelA' } })
        .mockResolvedValueOnce({ data: { ASICModel: 'MockModelB' } })
        .mockResolvedValueOnce({ data: { ASICModel: 'MockModelC' } });

      insertOne.mockResolvedValue(undefined);

      const result = await discoverDevices();

      expect(result).toHaveLength(3);
      expect(result[0].ip).toBe('mock-host:9001');
      expect(result[1].ip).toBe('mock-host:0');
      expect(result[2].ip).toBe('mock-host:wat');
    });

    it('returns empty array when discovery fails before scanning completes', async () => {
      getActiveNetworkInterfaces.mockRejectedValue(new Error('no perms'));

      const result = await discoverDevices();

      expect(result).toEqual([]);
    });
  });
});
