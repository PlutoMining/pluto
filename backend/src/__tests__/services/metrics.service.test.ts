import { createPyasicMinerInfoFixture } from '../fixtures/pyasic-miner-info.fixture';
jest.mock('prom-client', () => {
  const gaugeInstances = new Map<string, any>();

  class Gauge {
    name: string;
    set: jest.Mock;
    labels: jest.Mock;

    constructor(options: { name: string; registers?: Array<{ registerMetric: (metric: Gauge) => void }>; labelNames?: string[] }) {
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

    getSingleMetric(name: string) {
      return this.metrics.get(name) || null;
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
    warn: jest.fn(),
  },
}));

import promClient from 'prom-client';
const gaugeInstances = (promClient as unknown as { __gaugeInstances: Map<string, any> }).__gaugeInstances;
const { logger } = jest.requireMock('@pluto/logger');

import { createMetricsForDevice, deleteMetricsForDevice, register, updateOverviewMetrics } from '@/services/metrics.service';

describe('metrics.service', () => {
  beforeEach(() => {
    gaugeInstances.forEach((gauge) => {
      gauge.set.mockClear();
      gauge.labels.mockClear();
    });
    jest.clearAllMocks();
  });

  describe('createMetricsForDevice', () => {
    it('updates device metrics from pyasic info', () => {
      const { updatePrometheusMetrics } = createMetricsForDevice('rig');

      const info = createPyasicMinerInfoFixture();

      updatePrometheusMetrics(info);

      // Power comes directly from wattage
      expect(gaugeInstances.get('rig_power_watts')?.set).toHaveBeenCalledWith(info.wattage);

      // Voltage is derived from hashboard voltage (mV -> V)
      const expectedVoltageMv = info.hashboards[0].voltage!;
      expect(gaugeInstances.get('rig_voltage_volts')?.set).toHaveBeenCalledWith(
        expectedVoltageMv / 1000
      );

      // Current is not present in pyasic schema, so we expose 0
      expect(gaugeInstances.get('rig_current_amps')?.set).toHaveBeenCalledWith(0);

      // Fan speed, temperatures, hashrate and shares are mapped from pyasic fields
      expect(gaugeInstances.get('rig_fanspeed_rpm')?.set).toHaveBeenCalledWith(
        info.fans[0].speed
      );
      expect(gaugeInstances.get('rig_temperature_celsius')?.set).toHaveBeenCalledWith(
        info.temperature_avg
      );
      expect(gaugeInstances.get('rig_vr_temperature_celsius')?.set).toHaveBeenCalledWith(
        info.hashboards[0].chip_temp
      );
      expect(gaugeInstances.get('rig_hashrate_ghs')?.set).toHaveBeenCalledWith(
        info.hashrate.rate
      );
      expect(gaugeInstances.get('rig_shares_accepted')?.set).toHaveBeenCalledWith(
        info.shares_accepted
      );
      expect(gaugeInstances.get('rig_shares_rejected')?.set).toHaveBeenCalledWith(
        info.shares_rejected
      );

      // Uptime is taken from pyasic uptime field
      expect(gaugeInstances.get('rig_uptime_seconds')?.set).toHaveBeenCalledWith(info.uptime);

      // Efficiency prefers the explicit pyasic efficiency metric
      expect(gaugeInstances.get('rig_efficiency')?.set).toHaveBeenCalledWith(
        info.efficiency.rate
      );
    });

    it('does not keep stale metrics when values become zero', () => {
      const { updatePrometheusMetrics } = createMetricsForDevice('rig2');

      updatePrometheusMetrics(
        createPyasicMinerInfoFixture({
          wattage: 100,
          hashrate: { unit: { value: 1000000000, suffix: 'Gh/s' }, rate: 10 },
        })
      );
      updatePrometheusMetrics(
        createPyasicMinerInfoFixture({
          wattage: 0,
          hashrate: { unit: { value: 1000000000, suffix: 'Gh/s' }, rate: 0 },
        })
      );

      expect(gaugeInstances.get('rig2_power_watts')?.set).toHaveBeenCalledWith(0);
      expect(gaugeInstances.get('rig2_hashrate_ghs')?.set).toHaveBeenCalledWith(0);
      // With pyasic-native metrics we keep the explicit efficiency value
      expect(gaugeInstances.get('rig2_efficiency')?.set).toHaveBeenCalledWith(
        createPyasicMinerInfoFixture().efficiency.rate
      );
    });

    it('reuses existing metrics when creating metrics for the same hostname twice', () => {
      // Create metrics for the first time
      const { updatePrometheusMetrics: update1 } = createMetricsForDevice('duplicate-rig');
      const info1 = createPyasicMinerInfoFixture({ wattage: 100 });
      update1(info1);

      // Create metrics for the same hostname again - should reuse existing metrics
      const { updatePrometheusMetrics: update2 } = createMetricsForDevice('duplicate-rig');
      const info2 = createPyasicMinerInfoFixture({ wattage: 200 });
      update2(info2);

      // Should have reused the same gauge instance
      const powerGauge = gaugeInstances.get('duplicate-rig_power_watts');
      expect(powerGauge?.set).toHaveBeenCalledWith(100);
      expect(powerGauge?.set).toHaveBeenCalledWith(200);
      // Should have logged that we're reusing the metric
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Reusing existing metric'));
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
    it('updates overview metrics and per-pool data', () => {
      const devices = [
        {
          ...createPyasicMinerInfoFixture({
            mac: 'a',
            wattage: 100,
            hashrate: { unit: { value: 1000000000, suffix: 'Gh/s' }, rate: 50 },
            shares_accepted: 5,
            shares_rejected: 1,
            fw_ver: '1.0.0',
            api_ver: '1.0.0',
            config: {
              pools: {
                groups: [
                  {
                    pools: [{ url: 'stratum+tcp://mine.ocean.xyz:3334', user: 'user', password: '' }],
                    quota: 1,
                    name: null,
                  },
                ],
              },
              fan_mode: { mode: 'auto', speed: 0, minimum_fans: 0 },
              temperature: { target: null, hot: null, danger: null },
              mining_mode: { mode: 'normal' },
              extra_config: {},
            },
          }),
          tracing: true,
        },
        {
          ...createPyasicMinerInfoFixture({
            mac: 'b',
            wattage: 0,
            hashrate: { unit: { value: 1000000000, suffix: 'Gh/s' }, rate: 25 },
            shares_accepted: 3,
            shares_rejected: 2,
            fw_ver: 'custom',
            api_ver: 'custom',
            config: {
              pools: {
                groups: [
                  {
                    pools: [{ url: 'stratum+tcp://custom:1234', user: 'user', password: '' }],
                    quota: 1,
                    name: null,
                  },
                ],
              },
              fan_mode: { mode: 'auto', speed: 0, minimum_fans: 0 },
              temperature: { target: null, hot: null, danger: null },
              mining_mode: { mode: 'normal' },
              extra_config: {},
            },
          }),
          tracing: false,
        },
      ];

      updateOverviewMetrics(devices);

      expect(gaugeInstances.get('total_hardware')?.set).toHaveBeenCalledWith(2);
      expect(gaugeInstances.get('hardware_online')?.set).toHaveBeenCalledWith(1);
      expect(gaugeInstances.get('hardware_offline')?.set).toHaveBeenCalledWith(1);
      expect(gaugeInstances.get('total_hashrate')?.set).toHaveBeenCalledWith(50);
      expect(gaugeInstances.get('average_hashrate')?.set).toHaveBeenCalledWith(25);

      const firmwareGauge = gaugeInstances.get('firmware_version_distribution');
      const acceptedGauge = gaugeInstances.get('shares_by_pool_accepted');
      const rejectedGauge = gaugeInstances.get('shares_by_pool_rejected');
      expect(firmwareGauge?.labels).toHaveBeenCalled();

      expect(acceptedGauge?.labels).toHaveBeenCalledWith('Ocean Main');
      expect(acceptedGauge?.labels).toHaveBeenCalledWith('custom:1234');
      const acceptedSet = acceptedGauge?.labels.mock.results[0].value.set as jest.Mock | undefined;
      expect(acceptedSet).toBeDefined();
      expect(acceptedSet).toHaveBeenCalledWith(5);
      expect(acceptedSet).toHaveBeenCalledWith(3);

      expect(rejectedGauge?.labels).toHaveBeenCalledWith('Ocean Main');
      expect(rejectedGauge?.labels).toHaveBeenCalledWith('custom:1234');
      const rejectedSet = rejectedGauge?.labels.mock.results[0].value.set as jest.Mock | undefined;
      expect(rejectedSet).toBeDefined();
      expect(rejectedSet).toHaveBeenCalledWith(1);
      expect(rejectedSet).toHaveBeenCalledWith(2);
    });

    it('normalizes pool keys from stratum URLs', () => {
      const devices = [
        {
          ...createPyasicMinerInfoFixture({
            mac: 'a',
            wattage: 100,
            hashrate: { unit: { value: 1000000000, suffix: 'Gh/s' }, rate: 50 },
            shares_accepted: 1,
            shares_rejected: 0,
            fw_ver: '1.0.0',
            config: {
              pools: {
                groups: [
                  {
                    pools: [{ url: 'stratum+tcp://192.168.78.28:2018', user: 'user', password: '' }],
                    quota: 1,
                    name: null,
                  },
                ],
              },
              fan_mode: { mode: 'auto', speed: 0, minimum_fans: 0 },
              temperature: { target: null, hot: null, danger: null },
              mining_mode: { mode: 'normal' },
              extra_config: {},
            },
          }),
          tracing: true,
        },
        {
          ...createPyasicMinerInfoFixture({
            mac: 'b',
            wattage: 0,
            hashrate: { unit: { value: 1000000000, suffix: 'Gh/s' }, rate: 25 },
            shares_accepted: 2,
            shares_rejected: 0,
            fw_ver: 'custom',
            config: {
              pools: {
                groups: [
                  {
                    pools: [{ url: '', user: 'user', password: '' }],
                    quota: 1,
                    name: null,
                  },
                ],
              },
              fan_mode: { mode: 'auto', speed: 0, minimum_fans: 0 },
              temperature: { target: null, hot: null, danger: null },
              mining_mode: { mode: 'normal' },
              extra_config: {},
            },
          }),
          tracing: true,
        },
        {
          ...createPyasicMinerInfoFixture({
            mac: 'c',
            wattage: 0,
            hashrate: { unit: { value: 1000000000, suffix: 'Gh/s' }, rate: 25 },
            shares_accepted: 3,
            shares_rejected: 0,
            fw_ver: 'custom',
            config: {
              pools: {
                groups: [
                  {
                    pools: [{ url: 'stratum+tcp://solo.ckpool.org', user: 'user', password: '' }],
                    quota: 1,
                    name: null,
                  },
                ],
              },
              fan_mode: { mode: 'auto', speed: 0, minimum_fans: 0 },
              temperature: { target: null, hot: null, danger: null },
              mining_mode: { mode: 'normal' },
              extra_config: {},
            },
          }),
          tracing: true,
        },
      ];

      updateOverviewMetrics(devices);

      const acceptedGauge = gaugeInstances.get('shares_by_pool_accepted');
      expect(acceptedGauge?.labels).toHaveBeenCalledWith('192.168.78.28:2018');
      expect(acceptedGauge?.labels).toHaveBeenCalledWith('unknown');
      expect(acceptedGauge?.labels).toHaveBeenCalledWith('solo.ckpool.org');
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

    it('handles missing values and extracts hashrate from pyasic schema', () => {
      const devices = [
        {
          ...createPyasicMinerInfoFixture({
            mac: 'a',
            wattage: 50,
            hashrate: { unit: { value: 1000000000, suffix: 'Gh/s' }, rate: 10 },
            shares_accepted: 0,
            shares_rejected: 0,
            fw_ver: undefined,
            api_ver: undefined,
            config: {
              pools: {
                groups: [
                  {
                    pools: [{ url: '123', user: 'user', password: '' }],
                    quota: 1,
                    name: null,
                  },
                ],
              },
              fan_mode: { mode: 'auto', speed: 0, minimum_fans: 0 },
              temperature: { target: null, hot: null, danger: null },
              mining_mode: { mode: 'normal' },
              extra_config: {},
            },
          }),
          tracing: true,
        },
        {
          ...createPyasicMinerInfoFixture({
            mac: 'b',
            wattage: 0,
            hashrate: { unit: { value: 1000000000, suffix: 'Gh/s' }, rate: 0 },
            shares_accepted: 0,
            shares_rejected: 0,
            fw_ver: 'v',
            api_ver: 'v',
            config: {
              pools: {
                groups: [
                  {
                    pools: [{ url: 'stratum+tcp://example.com:abc:123', user: 'user', password: '' }],
                    quota: 1,
                    name: null,
                  },
                ],
              },
              fan_mode: { mode: 'auto', speed: 0, minimum_fans: 0 },
              temperature: { target: null, hot: null, danger: null },
              mining_mode: { mode: 'normal' },
              extra_config: {},
            },
          }),
          tracing: true,
        },
      ];

      updateOverviewMetrics(devices);

      expect(gaugeInstances.get('total_hashrate')?.set).toHaveBeenCalledWith(10);
      expect(gaugeInstances.get('total_power_watts')?.set).toHaveBeenCalledWith(50);
      expect(gaugeInstances.get('total_efficiency')?.set).toHaveBeenCalledWith(50 / (10 / 1000));

      const acceptedGauge = gaugeInstances.get('shares_by_pool_accepted');
      expect(acceptedGauge?.labels).toHaveBeenCalledWith('unknown');
      expect(acceptedGauge?.labels).toHaveBeenCalledWith('example.com:abc:123');

      const firmwareGauge = gaugeInstances.get('firmware_version_distribution');
      expect(firmwareGauge?.labels).toHaveBeenCalledWith('unknown');
      expect(firmwareGauge?.labels).toHaveBeenCalledWith('v');
    });
  });
});
