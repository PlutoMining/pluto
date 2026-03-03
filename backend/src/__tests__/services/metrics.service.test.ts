import type { MinerData } from '@pluto/interfaces';

jest.mock('prom-client', () => {
  const gaugeInstances = new Map<string, any>();

  class Gauge {
    name: string;
    set: jest.Mock;
    labels: jest.Mock;
    remove: jest.Mock;
    reset: jest.Mock;

    constructor(options: {
      name: string;
      registers?: Array<{ registerMetric: (metric: Gauge) => void }>;
      labelNames?: readonly string[];
    }) {
      this.name = options.name;
      const labelSetFn = jest.fn();
      this.labels = jest.fn().mockReturnValue({ set: labelSetFn });
      this.set = jest.fn();
      this.remove = jest.fn();
      this.reset = jest.fn();
      gaugeInstances.set(this.name, this);
      options.registers?.forEach((registry) => registry.registerMetric(this));
    }
  }

  class Registry {
    private metrics = new Map<string, Gauge>();

    registerMetric(metric: Gauge) {
      this.metrics.set(metric.name, metric);
    }

    getMetricsAsArray() {
      return Array.from(this.metrics.values());
    }

    removeSingleMetric(name: string) {
      this.metrics.delete(name);
    }
  }

  const mock = { Gauge, Registry, __gaugeInstances: gaugeInstances };
  (mock as any).default = mock;
  return mock;
});

jest.mock('@pluto/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../services/tracing.helpers', () => ({
  extractHostnameFromMinerData: jest.fn((d: any) => d?.hostname ?? d?.ip ?? 'unknown'),
  extractModelFromMinerData: jest.fn((d: any) => d?.deviceInfo?.model ?? 'unknown'),
}));

import promClient from 'prom-client';
const gaugeInstances = (promClient as unknown as { __gaugeInstances: Map<string, any> }).__gaugeInstances;
const { logger: _logger } = jest.requireMock('@pluto/logger');

import {
  updateDeviceMetrics,
  removeDeviceMetrics,
  _resetMetricsForTesting,
  register as _register,
  updateOverviewMetrics,
} from '@/services/metrics.service';

describe('metrics.service', () => {
  beforeEach(() => {
    _resetMetricsForTesting();
    gaugeInstances.forEach((gauge: any) => {
      gauge.set.mockClear();
      gauge.labels.mockClear();
      gauge.remove.mockClear();
      gauge.reset.mockClear();
    });
    jest.clearAllMocks();
  });

  describe('updateDeviceMetrics', () => {
    it('sets labeled gauges from MinerData', () => {
      const minerData = {
        ip: '10.0.0.1',
        hostname: 'rig',
        deviceInfo: { model: 'BM1368' },
        wattage: 1200,
        voltage: 12.5,
        hashrate: { rate: 800, unit: { suffix: 'GH/s' } },
        sharesAccepted: 10,
        sharesRejected: 1,
        uptime: 3600,
        fans: [{ speed: 1200 }],
        temperatureAvg: 45,
        hashboards: [],
        bitaxe: {
          current: 6000,
          coreVoltage: 1100,
          coreVoltageActual: 1050,
          frequency: 500,
          freeHeap: 512,
          freeHeapInternal: 128,
          freeHeapSpiram: 0,
          vrTemp: 70,
        },
      } as unknown as MinerData;

      updateDeviceMetrics('aa:bb:cc:dd:ee:ff', minerData);

      const expectedLabels = {
        device_id: 'aa:bb:cc:dd:ee:ff',
        hostname: 'rig',
        ip: '10.0.0.1',
        model: 'BM1368',
      };

      const powerGauge = gaugeInstances.get('pluto_device_power_watts');
      expect(powerGauge?.labels).toHaveBeenCalledWith(expectedLabels);

      const hashrateGauge = gaugeInstances.get('pluto_device_hashrate_ghs');
      expect(hashrateGauge?.labels).toHaveBeenCalledWith(expectedLabels);

      const efficiencyGauge = gaugeInstances.get('pluto_device_efficiency');
      expect(efficiencyGauge?.labels).toHaveBeenCalledWith(expectedLabels);
    });

    it('handles missing optional fields gracefully', () => {
      const minerData: MinerData = {
        ip: '10.0.0.1',
        hostname: 'rig',
        deviceInfo: { model: 'BM1368' },
        wattage: 0,
        hashrate: { rate: 0, unit: { suffix: 'GH/s' } },
        fans: [],
        hashboards: [],
      } as MinerData;

      expect(() => updateDeviceMetrics('aa:bb:cc:dd:ee:ff', minerData)).not.toThrow();

      const powerGauge = gaugeInstances.get('pluto_device_power_watts');
      expect(powerGauge?.labels).toHaveBeenCalled();
    });

    it('extracts temperature from hashboards when temperatureAvg is missing', () => {
      const minerData: MinerData = {
        ip: '10.0.0.1',
        hostname: 'rig',
        deviceInfo: { model: 'BM1368' },
        fans: [],
        hashboards: [{ temp: 55 }],
      } as MinerData;

      updateDeviceMetrics('aa:bb:cc:dd:ee:ff', minerData);

      const tempGauge = gaugeInstances.get('pluto_device_temperature_celsius');
      expect(tempGauge?.labels).toHaveBeenCalled();
    });

    it('removes old labels when hostname changes', () => {
      const data1: MinerData = {
        ip: '10.0.0.1',
        hostname: 'old-name',
        deviceInfo: { model: 'BM1368' },
        wattage: 100,
        hashrate: { rate: 50, unit: { suffix: 'GH/s' } },
        fans: [],
        hashboards: [],
      } as MinerData;

      updateDeviceMetrics('aa:bb:cc:dd:ee:ff', data1);

      const data2: MinerData = {
        ip: '10.0.0.1',
        hostname: 'new-name',
        deviceInfo: { model: 'BM1368' },
        wattage: 100,
        hashrate: { rate: 50, unit: { suffix: 'GH/s' } },
        fans: [],
        hashboards: [],
      } as MinerData;

      updateDeviceMetrics('aa:bb:cc:dd:ee:ff', data2);

      const powerGauge = gaugeInstances.get('pluto_device_power_watts');
      expect(powerGauge?.remove).toHaveBeenCalledWith(
        expect.objectContaining({ hostname: 'old-name' })
      );
    });
  });

  describe('removeDeviceMetrics', () => {
    it('removes label combinations for a device', () => {
      const minerData: MinerData = {
        ip: '10.0.0.1',
        hostname: 'rig',
        deviceInfo: { model: 'BM1368' },
        wattage: 100,
        hashrate: { rate: 50, unit: { suffix: 'GH/s' } },
        fans: [],
        hashboards: [],
      } as MinerData;

      updateDeviceMetrics('aa:bb:cc:dd:ee:ff', minerData);
      removeDeviceMetrics('aa:bb:cc:dd:ee:ff');

      const powerGauge = gaugeInstances.get('pluto_device_power_watts');
      expect(powerGauge?.remove).toHaveBeenCalledWith(
        expect.objectContaining({ device_id: 'aa:bb:cc:dd:ee:ff' })
      );
    });

    it('does nothing if no previous labels exist', () => {
      removeDeviceMetrics('nonexistent');

      const powerGauge = gaugeInstances.get('pluto_device_power_watts');
      expect(powerGauge?.remove).not.toHaveBeenCalled();
    });
  });

  describe('updateOverviewMetrics', () => {
    it('updates overview metrics from MinerData array', () => {
      const minerDataArray: MinerData[] = [
        {
          ip: '10.0.0.1',
          wattage: 100,
          hashrate: { rate: 50, unit: { suffix: 'GH/s' } },
          sharesAccepted: 5,
          sharesRejected: 1,
          fwVer: '1.0.0',
          fans: [],
          hashboards: [],
          pools: {
            groups: [
              {
                pools: [{ url: 'stratum+tcp://mine.ocean.xyz:3334' }],
              },
            ],
          },
        } as MinerData,
        {
          ip: '10.0.0.2',
          wattage: 0,
          hashrate: { rate: 25, unit: { suffix: 'GH/s' } },
          sharesAccepted: 3,
          sharesRejected: 2,
          fwVer: 'custom',
          fans: [],
          hashboards: [],
          pools: {
            groups: [
              {
                pools: [{ url: 'stratum+tcp://custom:1234' }],
              },
            ],
          },
        } as MinerData,
      ];

      updateOverviewMetrics(minerDataArray);

      expect(gaugeInstances.get('total_hardware')?.set).toHaveBeenCalledWith(2);
      expect(gaugeInstances.get('hardware_online')?.set).toHaveBeenCalledWith(2);
      expect(gaugeInstances.get('hardware_offline')?.set).toHaveBeenCalledWith(0);
      expect(gaugeInstances.get('total_hashrate')?.set).toHaveBeenCalledWith(75);
      expect(gaugeInstances.get('average_hashrate')?.set).toHaveBeenCalledWith(37.5);

      const firmwareGauge = gaugeInstances.get('firmware_version_distribution');
      expect(firmwareGauge?.labels).toHaveBeenCalled();

      const acceptedGauge = gaugeInstances.get('shares_by_pool_accepted');
      expect(acceptedGauge?.labels).toHaveBeenCalledWith('Ocean Main');
      expect(acceptedGauge?.labels).toHaveBeenCalledWith('custom:1234');
    });

    it('handles empty device list', () => {
      updateOverviewMetrics([]);

      expect(gaugeInstances.get('total_hardware')?.set).toHaveBeenCalledWith(0);
      expect(gaugeInstances.get('hardware_online')?.set).toHaveBeenCalledWith(0);
      expect(gaugeInstances.get('hardware_offline')?.set).toHaveBeenCalledWith(0);
      expect(gaugeInstances.get('total_hashrate')?.set).toHaveBeenCalledWith(0);
      expect(gaugeInstances.get('average_hashrate')?.set).toHaveBeenCalledWith(0);
      expect(gaugeInstances.get('total_power_watts')?.set).toHaveBeenCalledWith(0);
      expect(gaugeInstances.get('total_efficiency')?.set).toHaveBeenCalledWith(0);
    });

    it('handles missing hashrate gracefully', () => {
      const minerDataArray: MinerData[] = [
        {
          ip: '10.0.0.1',
          wattage: 50,
          fans: [],
          hashboards: [],
        },
      ];

      updateOverviewMetrics(minerDataArray);

      expect(gaugeInstances.get('total_hashrate')?.set).toHaveBeenCalledWith(0);
      expect(gaugeInstances.get('total_efficiency')?.set).toHaveBeenCalledWith(0);
    });

    it('extracts pool info from pools structure', () => {
      const minerDataArray: MinerData[] = [
        {
          ip: '10.0.0.1',
          wattage: 100,
          hashrate: { rate: 50, unit: { suffix: 'GH/s' } },
          sharesAccepted: 1,
          sharesRejected: 0,
          fans: [],
          hashboards: [],
          pools: {
            groups: [
              {
                pools: [{ url: 'stratum+tcp://192.168.78.28:2018' }],
              },
            ],
          },
        } as MinerData,
      ];

      updateOverviewMetrics(minerDataArray);

      const acceptedGauge = gaugeInstances.get('shares_by_pool_accepted');
      expect(acceptedGauge?.labels).toHaveBeenCalledWith('192.168.78.28:2018');
    });

    it('handles missing pool config', () => {
      const minerDataArray: MinerData[] = [
        {
          ip: '10.0.0.1',
          wattage: 100,
          hashrate: { rate: 50, unit: { suffix: 'GH/s' } },
          sharesAccepted: 1,
          sharesRejected: 0,
          fans: [],
          hashboards: [],
        } as MinerData,
      ];

      updateOverviewMetrics(minerDataArray);

      const acceptedGauge = gaugeInstances.get('shares_by_pool_accepted');
      expect(acceptedGauge?.labels).toHaveBeenCalledWith('unknown:0');
    });
  });
});
