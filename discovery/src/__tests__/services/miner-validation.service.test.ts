import { MinerValidationService } from '@/services/miner-validation.service';
import { logger } from '@pluto/logger';

jest.mock('@pluto/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/config/environment', () => ({
  config: {
    pyasicBridgeHost: 'http://pyasic-bridge:8000',
    pyasicValidationTimeout: 3000,
  },
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('MinerValidationService.validateSingleIp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns first element when validation succeeds', async () => {
    const payload = [{ ip: '1.2.3.4', is_miner: true, model: 'ModelA' }];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => payload,
    });

    const result = await MinerValidationService.validateSingleIp('1.2.3.4');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://pyasic-bridge:8000/miners/validate',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ ips: ['1.2.3.4'] }),
      }),
    );
    expect(result).toEqual({ ip: '1.2.3.4', is_miner: true, model: 'ModelA' });
  });

  it('returns null when res.ok is false', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const result = await MinerValidationService.validateSingleIp('1.2.3.4');

    expect(result).toBeNull();
  });

  it('returns null when response array is empty', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const result = await MinerValidationService.validateSingleIp('1.2.3.4');

    expect(result).toBeNull();
  });

  it('returns null when fetch throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network error'));

    const result = await MinerValidationService.validateSingleIp('1.2.3.4');

    expect(result).toBeNull();
  });
});

describe('MinerValidationService.validateBatch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty array when ips list is empty', async () => {
    const result = await MinerValidationService.validateBatch([]);
    expect(result).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns validation results and logs stats', async () => {
    const response = [
      { ip: '1.2.3.4', is_miner: true, model: 'A' },
      { ip: '5.6.7.8', is_miner: false, error: 'Not miner' },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => response,
    });

    const result = await MinerValidationService.validateBatch(['1.2.3.4', '5.6.7.8']);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://pyasic-bridge:8000/miners/validate',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ ips: ['1.2.3.4', '5.6.7.8'] }),
      }),
    );
    expect(result).toEqual(response);
  });

  it('returns empty array when res.ok is false (error logging path)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const result = await MinerValidationService.validateBatch(['1.2.3.4', '5.6.7.8']);

    expect(result).toEqual([]);
    expect(logger.error).toHaveBeenCalledWith('pyasic-bridge validation returned 500');
  });

  it('returns empty array on error and logs extra details when error has code', async () => {
    const error: any = new Error('timeout');
    error.code = 'ETIMEDOUT';
    mockFetch.mockRejectedValueOnce(error);

    const result = await MinerValidationService.validateBatch(['1.2.3.4']);

    expect(result).toEqual([]);
  });
});

describe('MinerValidationService.fetchMinerData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns mapped MinerData when pyasic-bridge returns valid data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ip: '1.2.3.4',
        mac: 'aa:bb',
        hostname: 'host',
      }),
    });

    const result = await MinerValidationService.fetchMinerData('1.2.3.4');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://pyasic-bridge:8000/miner/1.2.3.4/data',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        ip: '1.2.3.4',
        mac: 'aa:bb',
        hostname: 'host',
        fans: [],
        hashboards: [],
      }),
    );
  });

  it('maps full PbMinerData with all optional fields', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ip: '1.2.3.4',
        mac: 'aa:bb',
        hostname: 'host',
        device_info: { make: 'X', model: 'Y', firmware: '1.0', algo: 'SHA256' },
        serial_number: 'SN123',
        hashrate: { rate: 100, unit: 'GH/s' },
        expected_hashrate: { rate: 110, unit: 'GH/s' },
        wattage: 100,
        wattage_limit: 120,
        voltage: 12,
        temperature_avg: 55,
        env_temp: 25,
        shares_accepted: 1000,
        shares_rejected: 5,
        best_difficulty: '1',
        best_session_difficulty: '2',
        network_difficulty: 1000000,
        fans: [{ speed: 3000 }, { speed: 3100 }],
        hashboards: [
          {
            slot: 0,
            temp: 60,
            chip_temp: 65,
            chips: 100,
            expected_chips: 100,
            serial_number: 'HB0',
            missing: false,
            active: true,
            voltage: 12,
          },
        ],
        total_chips: 100,
        expected_chips: 100,
        expected_hashboards: 1,
        expected_fans: 2,
        is_mining: true,
        uptime: 3600,
        nominal: true,
        fw_ver: '1.0',
        api_ver: '1',
        datetime: '2024-01-01',
        timestamp: 1704067200,
        config: {
          pools: {
            groups: [
              {
                pools: [{ url: 'stratum://pool', user: 'u', password: 'p' }],
                quota: 100,
              },
            ],
          },
        },
      }),
    });

    const result = await MinerValidationService.fetchMinerData('1.2.3.4');

    expect(result).toMatchObject({
      ip: '1.2.3.4',
      mac: 'aa:bb',
      hostname: 'host',
      deviceInfo: { make: 'X', model: 'Y', firmware: '1.0', algo: 'SHA256' },
      serialNumber: 'SN123',
      hashrate: { rate: 100, unit: 'GH/s' },
      expectedHashrate: { rate: 110, unit: 'GH/s' },
      wattage: 100,
      wattageLimit: 120,
      voltage: 12,
      temperatureAvg: 55,
      envTemp: 25,
      sharesAccepted: 1000,
      sharesRejected: 5,
      bestDifficulty: '1',
      bestSessionDifficulty: '2',
      networkDifficulty: 1000000,
      fans: [{ speed: 3000 }, { speed: 3100 }],
      hashboards: [
        expect.objectContaining({
          slot: 0,
          temp: 60,
          chipTemp: 65,
          chips: 100,
          expectedChips: 100,
          serialNumber: 'HB0',
          missing: false,
          active: true,
          voltage: 12,
        }),
      ],
      totalChips: 100,
      expectedChips: 100,
      expectedHashboards: 1,
      expectedFans: 2,
      isMining: true,
      uptime: 3600,
      nominal: true,
      fwVer: '1.0',
      apiVer: '1',
      datetime: '2024-01-01',
      timestamp: 1704067200,
      pools: {
        groups: [
          {
            pools: [{ url: 'stratum://pool', user: 'u', password: 'p' }],
            quota: 100,
          },
        ],
      },
    });
  });

  it('maps snake_case fields to camelCase MinerData', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ip: '1.2.3.4',
        mac: 'aa:bb',
        hostname: 'host',
        device_info: { model: 'TestModel', firmware: '1.0' },
        temperature_avg: 55,
        shares_accepted: 100,
        shares_rejected: 2,
        fw_ver: '1.0.0',
        wattage_limit: 120,
        total_chips: 5,
        fans: [{ speed: 3000 }],
        hashboards: [{ slot: 0, temp: 60, chip_temp: 65 }],
      }),
    });

    const result = await MinerValidationService.fetchMinerData('1.2.3.4');

    expect(result).toEqual(
      expect.objectContaining({
        ip: '1.2.3.4',
        deviceInfo: { model: 'TestModel', firmware: '1.0', make: undefined, algo: undefined },
        temperatureAvg: 55,
        sharesAccepted: 100,
        sharesRejected: 2,
        fwVer: '1.0.0',
        wattageLimit: 120,
        totalChips: 5,
        fans: [{ speed: 3000 }],
        hashboards: [expect.objectContaining({ slot: 0, temp: 60, chipTemp: 65 })],
      }),
    );
  });

  it('returns null when response is null or missing ip', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => null,
    });

    const result = await MinerValidationService.fetchMinerData('1.2.3.4');

    expect(result).toBeNull();
  });

  it('returns null when raw.ip is missing (object without ip)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ mac: 'aa:bb', hostname: 'host' }),
    });

    const result = await MinerValidationService.fetchMinerData('1.2.3.4');

    expect(result).toBeNull();
  });

  it('returns null when raw.ip is empty string', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ip: '', mac: 'aa:bb', hostname: 'host' }),
    });

    const result = await MinerValidationService.fetchMinerData('1.2.3.4');

    expect(result).toBeNull();
  });

  it('returns null when raw is empty object (no ip)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const result = await MinerValidationService.fetchMinerData('1.2.3.4');

    expect(result).toBeNull();
  });

  it('returns null when raw is undefined', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => undefined,
    });

    const result = await MinerValidationService.fetchMinerData('1.2.3.4');

    expect(result).toBeNull();
  });

  it('returns null when fetch throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network down'));

    const result = await MinerValidationService.fetchMinerData('1.2.3.4');

    expect(result).toBeNull();
  });

  it('handles raw without device_info (deviceInfo undefined)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ip: '1.2.3.4',
        mac: 'aa:bb',
        hostname: 'host',
      }),
    });

    const result = await MinerValidationService.fetchMinerData('1.2.3.4');

    expect(result?.deviceInfo).toBeUndefined();
    expect(result?.ip).toBe('1.2.3.4');
  });

  it('handles raw without hashrate and expected_hashrate', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ip: '1.2.3.4',
        mac: 'aa:bb',
        hostname: 'host',
        device_info: { make: 'X', model: 'Y' },
      }),
    });

    const result = await MinerValidationService.fetchMinerData('1.2.3.4');

    expect(result?.hashrate).toBeUndefined();
    expect(result?.expectedHashrate).toBeUndefined();
  });

  it('handles raw without config.pools', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ip: '1.2.3.4',
        mac: 'aa:bb',
        hostname: 'host',
        config: {},
      }),
    });

    const result = await MinerValidationService.fetchMinerData('1.2.3.4');

    expect(result?.pools).toBeUndefined();
  });

  it('handles raw with res.ok false', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const result = await MinerValidationService.fetchMinerData('1.2.3.4');

    expect(result).toBeNull();
  });

  it('handles null values in optional fields (covers ?? undefined branches)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ip: '1.2.3.4',
        mac: null,
        hostname: null,
        device_info: {
          make: null,
          model: null,
          firmware: null,
          algo: null,
        },
        serial_number: null,
        hashrate: { rate: null, unit: null },
        expected_hashrate: { rate: null, unit: null },
        wattage: null,
        wattage_limit: null,
        voltage: null,
        temperature_avg: null,
        env_temp: null,
        shares_accepted: null,
        shares_rejected: null,
        best_difficulty: null,
        best_session_difficulty: null,
        network_difficulty: null,
        fans: [{ speed: null }],
        hashboards: [{
          slot: null,
          temp: null,
          chip_temp: null,
          chips: null,
          expected_chips: null,
          serial_number: null,
          missing: null,
          active: null,
          voltage: null,
        }],
        total_chips: null,
        expected_chips: null,
        expected_hashboards: null,
        expected_fans: null,
        is_mining: null,
        uptime: null,
        nominal: null,
        fw_ver: null,
        api_ver: null,
        datetime: null,
        timestamp: null,
        config: {
          pools: {
            groups: [{
              pools: [{ url: null, user: null, password: null }],
              quota: null,
            }],
          },
        },
      }),
    });

    const result = await MinerValidationService.fetchMinerData('1.2.3.4');

    expect(result).not.toBeNull();
    expect(result?.mac).toBeUndefined();
    expect(result?.hostname).toBeUndefined();
    expect(result?.deviceInfo?.make).toBeUndefined();
    expect(result?.fans?.[0].speed).toBeUndefined();
    expect(result?.hashboards?.[0].slot).toBeUndefined();
    expect(result?.pools?.groups[0].quota).toBeUndefined();
    expect(result?.pools?.groups[0].pools[0].url).toBeUndefined();
  });
});
