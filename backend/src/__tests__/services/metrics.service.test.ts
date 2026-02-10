import type { MinerData } from '@pluto/pyasic-bridge-client';
jest.mock('prom-client', () => {
  const gaugeInstances = new Map<string, any>();

  class Gauge {
    name: string;
    set: jest.Mock;
    labels: jest.Mock;

    constructor(options: {
      name: string;
      registers?: Array<{ registerMetric: (metric: Gauge) => void }>;
      labelNames?: string[];
    }) {
      this.name = options.name;
      this.set = jest.fn();
      this.labels = jest.fn().mockReturnValue({ set: jest.fn() });
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

import promClient from 'prom-client';
const gaugeInstances = (promClient as unknown as { __gaugeInstances: Map<string, any> }).__gaugeInstances;
const { logger } = jest.requireMock('@pluto/logger');

import {
  createMetricsForDevice,
  deleteMetricsForDevice,
  register,
  updateOverviewMetrics,
} from '@/services/metrics.service';

describe('metrics.service', () => {
  beforeEach(() => {
    gaugeInstances.forEach((gauge) => {
      gauge.set.mockClear();
      gauge.labels.mockClear();
    });
    jest.clearAllMocks();
  });

  describe('createMetricsForDevice', () => {
    it('updates device metrics from MinerData structure', () => {
      const { updatePrometheusMetrics } = createMetricsForDevice('rig');

      const minerData: MinerData = {
        ip: '10.0.0.1',
        wattage: 1200,
        voltage: 12.5,
        hashrate: { rate: 800, unit: 'GH/s' },
        shares_accepted: 10,
        shares_rejected: 1,
        uptime: 3600,
        fans: [{ speed: 1200 }],
        temperature_avg: 45,
        hashboards: [],
        config: {
          extra_config: {
            current: 6000,
            core_voltage: 1100,
            core_voltage_actual: 1050,
            frequency: 500,
            free_heap: 512,
            free_heap_internal: 128,
            free_heap_spiram: 0,
            vr_temp: 70,
          },
        },
      } as MinerData;

      updatePrometheusMetrics(minerData);

      expect(gaugeInstances.get('rig_power_watts')?.set).toHaveBeenCalledWith(1200);
      expect(gaugeInstances.get('rig_voltage_volts')?.set).toHaveBeenCalledWith(12.5);
      expect(gaugeInstances.get('rig_current_amps')?.set).toHaveBeenCalledWith(6);
      expect(gaugeInstances.get('rig_fanspeed_rpm')?.set).toHaveBeenCalledWith(1200);
      expect(gaugeInstances.get('rig_temperature_celsius')?.set).toHaveBeenCalledWith(45);
      expect(gaugeInstances.get('rig_vr_temperature_celsius')?.set).toHaveBeenCalledWith(70);
      expect(gaugeInstances.get('rig_hashrate_ghs')?.set).toHaveBeenCalledWith(800);
      expect(gaugeInstances.get('rig_free_heap_bytes')?.set).toHaveBeenCalledWith(512);
      expect(gaugeInstances.get('rig_free_heap_internal_bytes')?.set).toHaveBeenCalledWith(128);
      expect(gaugeInstances.get('rig_free_heap_spiram_bytes')?.set).toHaveBeenCalledWith(0);
      expect(gaugeInstances.get('rig_core_voltage_volts')?.set).toHaveBeenCalledWith(1.1);
      expect(gaugeInstances.get('rig_core_voltage_actual_volts')?.set).toHaveBeenCalledWith(1.05);
      expect(gaugeInstances.get('rig_frequency_mhz')?.set).toHaveBeenCalledWith(500);
      expect(gaugeInstances.get('rig_efficiency')?.set).toHaveBeenCalledWith(1200 / (800 / 1000));
    });

    it('handles nested hashrate structure', () => {
      const { updatePrometheusMetrics } = createMetricsForDevice('rig2');

      const minerData: MinerData = {
        ip: '10.0.0.1',
        wattage: 100,
        hashrate: { rate: 10, unit: 'GH/s' },
      } as MinerData;

      updatePrometheusMetrics(minerData);

      expect(gaugeInstances.get('rig2_hashrate_ghs')?.set).toHaveBeenCalledWith(10);
    });

    it('handles missing optional fields gracefully', () => {
      const { updatePrometheusMetrics } = createMetricsForDevice('rig3');

      const minerData: MinerData = {
        ip: '10.0.0.1',
        wattage: 0,
        hashrate: { rate: 0, unit: 'GH/s' },
      } as MinerData;

      updatePrometheusMetrics(minerData);

      expect(gaugeInstances.get('rig3_power_watts')?.set).toHaveBeenCalledWith(0);
      expect(gaugeInstances.get('rig3_hashrate_ghs')?.set).toHaveBeenCalledWith(0);
      expect(gaugeInstances.get('rig3_efficiency')?.set).toHaveBeenCalledWith(0);
    });

    it('extracts temperature from hashboards when temperature_avg is missing', () => {
      const { updatePrometheusMetrics } = createMetricsForDevice('rig4');

      const minerData: MinerData = {
        ip: '10.0.0.1',
        hashboards: [{ temp: 55 }],
      } as MinerData;

      updatePrometheusMetrics(minerData);

      expect(gaugeInstances.get('rig4_temperature_celsius')?.set).toHaveBeenCalledWith(55);
    });
  });

  describe('deleteMetricsForDevice', () => {
    it('removes metrics for a hostname', () => {
      createMetricsForDevice('rig');
      const removeSpy = jest.spyOn(register, 'removeSingleMetric');

      deleteMetricsForDevice('rig');

      expect(removeSpy).toHaveBeenCalled();
    });

    it('logs errors when deletion fails', () => {
      jest.spyOn(register, 'getMetricsAsArray').mockImplementationOnce(() => {
        throw new Error('boom');
      });

      deleteMetricsForDevice('rig');

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('updateOverviewMetrics', () => {
    it('updates overview metrics from MinerData array', () => {
      const minerDataArray: MinerData[] = [
        {
          ip: '10.0.0.1',
          wattage: 100,
          hashrate: { rate: 50, unit: 'GH/s' },
          shares_accepted: 5,
          shares_rejected: 1,
          fw_ver: '1.0.0',
          config: {
            pools: {
              groups: [
                {
                  pools: [{ url: 'stratum+tcp://mine.ocean.xyz:3334' }],
                },
              ],
            },
          },
        } as MinerData,
        {
          ip: '10.0.0.2',
          wattage: 0,
          hashrate: { rate: 25, unit: 'GH/s' },
          shares_accepted: 3,
          shares_rejected: 2,
          fw_ver: 'custom',
          config: {
            pools: {
              groups: [
                {
                  pools: [{ url: 'stratum+tcp://custom:1234' }],
                },
              ],
            },
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
          hashrate: null,
        } as MinerData,
      ];

      updateOverviewMetrics(minerDataArray);

      expect(gaugeInstances.get('total_hashrate')?.set).toHaveBeenCalledWith(0);
      expect(gaugeInstances.get('total_efficiency')?.set).toHaveBeenCalledWith(0);
    });

    it('extracts pool info from config structure', () => {
      const minerDataArray: MinerData[] = [
        {
          ip: '10.0.0.1',
          wattage: 100,
          hashrate: { rate: 50, unit: 'GH/s' },
          shares_accepted: 1,
          shares_rejected: 0,
          config: {
            pools: {
              groups: [
                {
                  pools: [{ url: 'stratum+tcp://192.168.78.28:2018' }],
                },
              ],
            },
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
          hashrate: { rate: 50, unit: 'GH/s' },
          shares_accepted: 1,
          shares_rejected: 0,
        } as MinerData,
      ];

      updateOverviewMetrics(minerDataArray);

      const acceptedGauge = gaugeInstances.get('shares_by_pool_accepted');
      expect(acceptedGauge?.labels).toHaveBeenCalledWith('unknown:0');
    });
  });
});
