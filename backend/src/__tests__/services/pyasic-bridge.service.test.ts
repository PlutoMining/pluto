import type { MinerData, MinerConfigModelInput, ConfigValidationResponse } from '@pluto/pyasic-bridge-client';
import {
  getMinerDataMinerIpDataGet,
  updateMinerConfigMinerIpConfigPatch,
  restartMinerMinerIpRestartPost,
  validateMinerConfigMinerIpConfigValidatePost,
} from '@pluto/pyasic-bridge-client';
import { pyasicBridgeService, getPyasicBridgeService } from '@/services/pyasic-bridge.service';

jest.mock('@pluto/pyasic-bridge-client', () => ({
  getMinerDataMinerIpDataGet: jest.fn(),
  updateMinerConfigMinerIpConfigPatch: jest.fn(),
  restartMinerMinerIpRestartPost: jest.fn(),
  validateMinerConfigMinerIpConfigValidatePost: jest.fn(),
}));

const mockWebSocketInstances: Array<{
  url: string;
  handlers: Record<string, (arg?: any) => void>;
  close: jest.Mock;
  trigger: (event: string, data?: any) => void;
}> = [];

jest.mock('ws', () => {
  class MockWebSocket {
    url: string;
    handlers: Record<string, (arg?: any) => void> = {};
    close = jest.fn();

    constructor(url: string) {
      this.url = url;
      const instance = {
        url: this.url,
        handlers: this.handlers,
        close: this.close,
        trigger: (event: string, data?: any) => {
          this.handlers[event]?.(data);
        },
      };
      mockWebSocketInstances.push(instance);
      setTimeout(() => {
        this.handlers.open?.();
      }, 0);
    }

    on(event: string, handler: (arg?: any) => void) {
      this.handlers[event] = handler;
    }
  }
  return jest.fn().mockImplementation((url: string) => new MockWebSocket(url)) as any;
});

jest.mock('@pluto/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../config/environment', () => ({
  config: {
    pyasicBridgeHost: 'http://pyasic-bridge:8000',
  },
}));

const mockedGetMinerData = getMinerDataMinerIpDataGet as jest.MockedFunction<
  typeof getMinerDataMinerIpDataGet
>;
const mockedUpdateConfig = updateMinerConfigMinerIpConfigPatch as jest.MockedFunction<
  typeof updateMinerConfigMinerIpConfigPatch
>;
const mockedRestart = restartMinerMinerIpRestartPost as jest.MockedFunction<
  typeof restartMinerMinerIpRestartPost
>;
const mockedValidateConfig = validateMinerConfigMinerIpConfigValidatePost as jest.MockedFunction<
  typeof validateMinerConfigMinerIpConfigValidatePost
>;

describe('pyasic-bridge.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWebSocketInstances.length = 0;
  });

  describe('fetchMinerData', () => {
    it('fetches miner data successfully', async () => {
      const minerData: MinerData = {
        ip: '10.0.0.1',
        hostname: 'miner-1',
        model: 'BM1368',
        hashrate: { rate: 100, unit: 'GH/s' },
        wattage: 50,
      } as MinerData;

      mockedGetMinerData.mockResolvedValue(minerData as any);

      const result = await pyasicBridgeService.fetchMinerData('10.0.0.1');

      expect(mockedGetMinerData).toHaveBeenCalledWith({
        baseUrl: 'http://pyasic-bridge:8000',
        path: { ip: '10.0.0.1' },
        responseStyle: 'data',
        throwOnError: false,
      });
      expect(result).toEqual(minerData);
    });

    it('returns null when fetch fails', async () => {
      mockedGetMinerData.mockRejectedValue(new Error('network error'));

      const result = await pyasicBridgeService.fetchMinerData('10.0.0.1');

      expect(result).toBeNull();
    });

    it('returns null when result is invalid', async () => {
      mockedGetMinerData.mockResolvedValue({} as MinerData as any);

      const result = await pyasicBridgeService.fetchMinerData('10.0.0.1');

      expect(result).toBeNull();
    });
  });

  describe('updateMinerConfig', () => {
    it('updates miner config successfully', async () => {
      const config: MinerConfigModelInput = {
        pools: {
          groups: [
            {
              pools: [{ url: 'stratum+tcp://pool.com:3333' }],
            },
          ],
        },
      };

      mockedUpdateConfig.mockResolvedValue({ status: 'success' } as any);

      await pyasicBridgeService.updateMinerConfig('10.0.0.1', config);

      expect(mockedUpdateConfig).toHaveBeenCalledWith({
        baseUrl: 'http://pyasic-bridge:8000',
        path: { ip: '10.0.0.1' },
        body: config,
        responseStyle: 'data',
        throwOnError: true,
      });
    });

    it('throws error when update fails', async () => {
      const config: MinerConfigModelInput = {};
      const error = new Error('update failed');
      mockedUpdateConfig.mockRejectedValue(error);

      await expect(pyasicBridgeService.updateMinerConfig('10.0.0.1', config)).rejects.toThrow(
        'Failed to update miner config: update failed'
      );
    });
  });

  describe('restartMiner', () => {
    it('restarts miner successfully', async () => {
      mockedRestart.mockResolvedValue({ status: 'success' } as any);

      await pyasicBridgeService.restartMiner('10.0.0.1');

      expect(mockedRestart).toHaveBeenCalledWith({
        baseUrl: 'http://pyasic-bridge:8000',
        path: { ip: '10.0.0.1' },
        responseStyle: 'data',
        throwOnError: true,
      });
    });

    it('throws error when restart fails', async () => {
      const error = new Error('restart failed');
      mockedRestart.mockRejectedValue(error);

      await expect(pyasicBridgeService.restartMiner('10.0.0.1')).rejects.toThrow(
        'Failed to restart miner: restart failed'
      );
    });
  });

  describe('validateMinerConfig', () => {
    it('validates miner config successfully', async () => {
      const config: MinerConfigModelInput = {
        extra_config: {
          frequency: 525,
          core_voltage: 1100,
        },
      };

      const validationResult: ConfigValidationResponse = {
        valid: true,
        errors: [],
      };

      mockedValidateConfig.mockResolvedValue({ data: validationResult } as any);

      const result = await pyasicBridgeService.validateMinerConfig('10.0.0.1', config);

      expect(mockedValidateConfig).toHaveBeenCalledWith({
        baseUrl: 'http://pyasic-bridge:8000',
        path: { ip: '10.0.0.1' },
        body: config,
        responseStyle: 'data',
        throwOnError: true,
      });
      expect(result).toEqual(validationResult);
    });

    it('returns validation errors when config is invalid', async () => {
      const config: MinerConfigModelInput = {
        extra_config: {
          frequency: 999, // Invalid frequency
        },
      };

      const validationResult: ConfigValidationResponse = {
        valid: false,
        errors: ['Invalid frequency 999 for Bitaxe miner. Accepted values are: [400, 490, 525, 550, 600, 625]'],
      };

      mockedValidateConfig.mockResolvedValue({ data: validationResult } as any);

      const result = await pyasicBridgeService.validateMinerConfig('10.0.0.1', config);

      expect(result).toEqual(validationResult);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it('throws error when validation request fails', async () => {
      const config: MinerConfigModelInput = {};
      const error = new Error('validation request failed');
      mockedValidateConfig.mockRejectedValue(error);

      await expect(pyasicBridgeService.validateMinerConfig('10.0.0.1', config)).rejects.toThrow(
        'Failed to validate miner config: validation request failed'
      );
    });
  });

  describe('connectMinerLogsWebSocket', () => {
    it('connects to WebSocket and returns cleanup function', async () => {
      const onMessage = jest.fn();
      const onError = jest.fn();
      const onClose = jest.fn();

      const cleanup = await pyasicBridgeService.connectMinerLogsWebSocket(
        '10.0.0.1',
        onMessage,
        onError,
        onClose
      );

      expect(cleanup).toBeDefined();
      expect(typeof cleanup).toBe('function');

      // Trigger message
      const wsInstance = mockWebSocketInstances[0];
      wsInstance.trigger('message', 'test log');

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(onMessage).toHaveBeenCalledWith('test log');
    });

    it('handles WebSocket errors', async () => {
      const onMessage = jest.fn();
      const onError = jest.fn();
      const onClose = jest.fn();

      await pyasicBridgeService.connectMinerLogsWebSocket('10.0.0.1', onMessage, onError, onClose);

      const wsInstance = mockWebSocketInstances[0];
      const error = new Error('ws error');
      wsInstance.trigger('error', error);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(onError).toHaveBeenCalledWith(error);
    });

    it('handles WebSocket close', async () => {
      const onMessage = jest.fn();
      const onError = jest.fn();
      const onClose = jest.fn();

      await pyasicBridgeService.connectMinerLogsWebSocket('10.0.0.1', onMessage, onError, onClose);

      const wsInstance = mockWebSocketInstances[0];
      wsInstance.trigger('close');

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(onClose).toHaveBeenCalled();
    });

    it('cleanup function closes WebSocket', async () => {
      const onMessage = jest.fn();
      const onError = jest.fn();
      const onClose = jest.fn();

      const cleanup = await pyasicBridgeService.connectMinerLogsWebSocket(
        '10.0.0.1',
        onMessage,
        onError,
        onClose
      );

      cleanup();

      const wsInstance = mockWebSocketInstances[0];
      expect(wsInstance.close).toHaveBeenCalled();
    });

    it('converts http to ws URL correctly', async () => {
      const onMessage = jest.fn();
      const onError = jest.fn();
      const onClose = jest.fn();

      await pyasicBridgeService.connectMinerLogsWebSocket('10.0.0.1', onMessage, onError, onClose);

      expect(mockWebSocketInstances.length).toBeGreaterThan(0);
      expect(mockWebSocketInstances[0].url).toBe('ws://pyasic-bridge:8000/ws/miner/10.0.0.1');
    });
  });

  describe('getPyasicBridgeService', () => {
    it('returns singleton instance', () => {
      const instance1 = getPyasicBridgeService();
      const instance2 = getPyasicBridgeService();

      expect(instance1).toBe(instance2);
    });

    it('creates instance with custom baseUrl', () => {
      const instance = getPyasicBridgeService('http://custom:9000');

      expect(instance).toBeDefined();
    });
  });
});
