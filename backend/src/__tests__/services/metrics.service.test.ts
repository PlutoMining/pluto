import type { DeviceInfo, ExtendedDeviceInfo } from '@pluto/interfaces';
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
    it('updates device metrics converting units', () => {
      const { updatePrometheusMetrics } = createMetricsForDevice('rig');

      const payload = {
        power: 1200,
        voltage: 12000,
        current: 6000,
        fanSpeedRpm: 1200,
        temp: 45,
        vrTemp: 70,
        hashRate: 800,
        sharesAccepted: 10,
        sharesRejected: 1,
        uptimeSeconds: 3600,
        freeHeap: 512,
        coreVoltage: 1100,
        coreVoltageActual: 1050,
        frequency: 500,
        efficiency: 1,
      } as DeviceInfo;

      updatePrometheusMetrics(payload);
      updatePrometheusMetrics({ fanspeed: 900 } as unknown as DeviceInfo);
      updatePrometheusMetrics({} as DeviceInfo);

      expect(gaugeInstances.get('rig_power_watts')?.set).toHaveBeenCalledWith(1200);
      expect(gaugeInstances.get('rig_voltage_volts')?.set).toHaveBeenCalledWith(12);
      expect(gaugeInstances.get('rig_current_amps')?.set).toHaveBeenCalledWith(6);
      expect(gaugeInstances.get('rig_fanspeed_rpm')?.set).toHaveBeenCalledWith(1200);
      expect(gaugeInstances.get('rig_temperature_celsius')?.set).toHaveBeenCalledWith(45);
      expect(gaugeInstances.get('rig_vr_temperature_celsius')?.set).toHaveBeenCalledWith(70);
      expect(gaugeInstances.get('rig_hashrate_ghs')?.set).toHaveBeenCalledWith(800);
      expect(gaugeInstances.get('rig_efficiency')?.set).toHaveBeenCalledWith(1200 / (800 / 1000));
    });

    it('does not keep stale metrics when values become zero', () => {
      const { updatePrometheusMetrics } = createMetricsForDevice('rig2');

      updatePrometheusMetrics({ power: 100, hashRate: 10 } as unknown as DeviceInfo);
      updatePrometheusMetrics({ power: 0, hashRate: 0 } as unknown as DeviceInfo);

      expect(gaugeInstances.get('rig2_power_watts')?.set).toHaveBeenCalledWith(0);
      expect(gaugeInstances.get('rig2_hashrate_ghs')?.set).toHaveBeenCalledWith(0);
      expect(gaugeInstances.get('rig2_efficiency')?.set).toHaveBeenCalledWith(0);
    });
  });

  describe('deleteMetricsForDevice', () => {
    it('removes metrics for a hostname', () => {
      createMetricsForDevice('rig');
      const removeSpy = jest.spyOn(register, 'removeSingleMetric');

      deleteMetricsForDevice('rig');

      expect(removeSpy).toHaveBeenCalled();
    });
  });

  describe('updateOverviewMetrics', () => {
    it('updates overview metrics and per-pool data', () => {
      const devices: ExtendedDeviceInfo[] = [
        {
          mac: 'a',
          power: 100,
          hashRate: 50,
          sharesAccepted: 5,
          sharesRejected: 1,
          tracing: true,
          version: '1.0.0',
          stratumURL: 'mine.ocean.xyz',
          stratumPort: 3334,
        } as unknown as ExtendedDeviceInfo,
        {
          mac: 'b',
          power: 0,
          hashRate_10m: 25,
          sharesAccepted: 3,
          sharesRejected: 2,
          tracing: false,
          version: 'custom',
          stratumURL: 'custom',
          stratumPort: 1234,
        } as unknown as ExtendedDeviceInfo,
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
  });
});
