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
  });
});

