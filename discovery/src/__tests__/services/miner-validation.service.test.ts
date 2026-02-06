import {
  getMinerDataMinerIpDataGet,
  validateMinersMinersValidatePost,
} from '@pluto/pyasic-bridge-client';
import { MinerValidationService } from '@/services/miner-validation.service';

jest.mock('@pluto/pyasic-bridge-client', () => ({
  validateMinersMinersValidatePost: jest.fn(),
  getMinerDataMinerIpDataGet: jest.fn(),
}));

jest.mock('@/config/environment', () => ({
  config: {
    pyasicBridgeHost: 'http://pyasic-bridge:8000',
    pyasicValidationTimeout: 3000,
  },
}));

const mockedValidateMiners = validateMinersMinersValidatePost as jest.MockedFunction<
  typeof validateMinersMinersValidatePost
>;
const mockedGetMinerData = getMinerDataMinerIpDataGet as jest.MockedFunction<
  typeof getMinerDataMinerIpDataGet
>;

describe('MinerValidationService.validateSingleIp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns first element when validation succeeds with direct array', async () => {
    mockedValidateMiners.mockResolvedValueOnce([
      { ip: '1.2.3.4', is_miner: true, model: 'ModelA' },
    ] as any);

    const result = await MinerValidationService.validateSingleIp('1.2.3.4');

    expect(mockedValidateMiners).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: 'http://pyasic-bridge:8000',
        body: { ips: ['1.2.3.4'] },
        responseStyle: 'data',
        throwOnError: true,
      }),
    );
    expect(result).toEqual({ ip: '1.2.3.4', is_miner: true, model: 'ModelA' });
  });

  it('handles client returning an object with data property', async () => {
    mockedValidateMiners.mockResolvedValueOnce({
      data: [{ ip: '1.2.3.4', is_miner: true, model: 'ModelA' }],
    } as any);

    const result = await MinerValidationService.validateSingleIp('1.2.3.4');

    expect(result).toEqual({ ip: '1.2.3.4', is_miner: true, model: 'ModelA' });
  });

  it('returns null when client throws', async () => {
    mockedValidateMiners.mockRejectedValueOnce(new Error('network error'));

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
    expect(mockedValidateMiners).not.toHaveBeenCalled();
  });

  it('returns validation results and logs stats', async () => {
    const response = [
      { ip: '1.2.3.4', is_miner: true, model: 'A' },
      { ip: '5.6.7.8', is_miner: false, error: 'Not miner' },
    ];
    mockedValidateMiners.mockResolvedValueOnce(response as any);

    const result = await MinerValidationService.validateBatch(['1.2.3.4', '5.6.7.8']);

    expect(mockedValidateMiners).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: 'http://pyasic-bridge:8000',
        body: { ips: ['1.2.3.4', '5.6.7.8'] },
        responseStyle: 'data',
        throwOnError: true,
      }),
    );
    expect(result).toEqual(response);
  });

  it('handles client returning object with data property', async () => {
    const response = [{ ip: '1.2.3.4', is_miner: true, model: 'A' }];
    mockedValidateMiners.mockResolvedValueOnce({ data: response } as any);

    const result = await MinerValidationService.validateBatch(['1.2.3.4']);

    expect(result).toEqual(response);
  });

  it('returns empty array on error and logs extra details when error has code', async () => {
    const error: any = new Error('timeout');
    error.code = 'ETIMEDOUT';
    mockedValidateMiners.mockRejectedValueOnce(error);

    const result = await MinerValidationService.validateBatch(['1.2.3.4']);

    expect(result).toEqual([]);
  });
});

describe('MinerValidationService.fetchMinerData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns MinerData when client returns a valid object', async () => {
    const minerData = {
      ip: '1.2.3.4',
      mac: 'aa:bb',
      hostname: 'host',
    };
    mockedGetMinerData.mockResolvedValueOnce(minerData as any);

    const result = await MinerValidationService.fetchMinerData('1.2.3.4');

    expect(mockedGetMinerData).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: 'http://pyasic-bridge:8000',
        path: { ip: '1.2.3.4' },
        responseStyle: 'data',
        throwOnError: false,
      }),
    );
    expect(result).toEqual(minerData);
  });

  it('returns null when client returns non-object or missing ip', async () => {
    mockedGetMinerData.mockResolvedValueOnce(null as any);

    const result = await MinerValidationService.fetchMinerData('1.2.3.4');

    expect(result).toBeNull();
  });

  it('returns null when client throws', async () => {
    mockedGetMinerData.mockRejectedValueOnce(new Error('network down'));

    const result = await MinerValidationService.fetchMinerData('1.2.3.4');

    expect(result).toBeNull();
  });
});

