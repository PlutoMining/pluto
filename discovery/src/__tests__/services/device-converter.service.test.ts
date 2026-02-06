import type { Device, DiscoveredMiner } from '@pluto/interfaces';
import type { MinerData, MinerValidationResult } from '@pluto/pyasic-bridge-client';
import type { ArpScanResult } from '@/services/arpScanWrapper';
import { DeviceConverterService } from '@/services/device-converter.service';

describe('DeviceConverterService.createDiscoveredMiner', () => {
  const baseValidation: MinerValidationResult = {
    ip: '1.2.3.4',
    is_miner: true,
    model: 'ValidationModel',
  };

  const baseMinerData: MinerData = {
    ip: '1.2.3.4',
    mac: 'aa:bb:cc',
    hostname: 'miner-host',
    model: 'MinerModel',
    device_info: { model: 'DeviceInfoModel' },
  };

  const arpResult: ArpScanResult = {
    ip: '1.2.3.4',
    mac: 'aa:bb:cc',
    type: 'ArpType',
  };

  it('prefers validation model, then device_info.model, then minerData.model, then arp type', () => {
    const discovered = DeviceConverterService.createDiscoveredMiner(
      '1.2.3.4',
      'aa:bb:cc',
      baseValidation,
      arpResult,
      baseMinerData,
    );

    expect(discovered.type).toBe('ValidationModel');

    const noValidation = DeviceConverterService.createDiscoveredMiner(
      '1.2.3.4',
      'aa:bb:cc',
      null,
      arpResult,
      baseMinerData,
    );
    expect(noValidation.type).toBe('DeviceInfoModel');

    const noDeviceInfo = DeviceConverterService.createDiscoveredMiner(
      '1.2.3.4',
      'aa:bb:cc',
      null,
      arpResult,
      { ...baseMinerData, device_info: undefined },
    );
    expect(noDeviceInfo.type).toBe('MinerModel');

    const fromArp = DeviceConverterService.createDiscoveredMiner(
      '1.2.3.4',
      'aa:bb:cc',
      null,
      { ...arpResult, type: 'FromArp' },
      null,
    );
    expect(fromArp.type).toBe('FromArp');

    const unknownType = DeviceConverterService.createDiscoveredMiner(
      '1.2.3.4',
      'aa:bb:cc',
      null,
      null,
      null,
    );
    expect(unknownType.type).toBe('unknown');
  });

  it('creates minimal MinerData when none is provided', () => {
    const discovered = DeviceConverterService.createDiscoveredMiner(
      '1.2.3.4',
      'aa:bb:cc',
      null,
      null,
      null,
    );

    expect(discovered.minerData).toEqual<Partial<MinerData>>({
      ip: '1.2.3.4',
      mac: 'aa:bb:cc',
      hostname: '1.2.3.4',
      model: undefined,
      device_info: undefined,
    });
  });

  it('omits mac in minimal MinerData when mac is "unknown"', () => {
    const discovered = DeviceConverterService.createDiscoveredMiner(
      '1.2.3.4',
      'unknown',
      null,
      null,
      null,
    );

    expect(discovered.minerData.mac).toBeUndefined();
    expect(discovered.mac).toBe('unknown');
  });
});

describe('DeviceConverterService.convertToLegacyDevice', () => {
  it('maps DiscoveredMiner to legacy Device format', () => {
    const minerData: MinerData = {
      ip: '1.2.3.4',
      mac: 'aa:bb:cc',
      hostname: 'miner-host',
      model: 'MinerModel',
      fw_ver: '1.0.0',
      wattage: 100,
      voltage: 12,
      temperature_avg: 50,
      best_difficulty: '123',
      best_session_difficulty: '456',
      shares_accepted: 10,
      shares_rejected: 1,
      uptime: 1000,
      fans: [{ speed: 2000 }],
      hashrate: { rate: 10 }, // Gh/s
      timestamp: 1700000000,
      efficiency_fract: 0.5,
      wattage_limit: 120,
      total_chips: 5,
      device_info: { model: 'DeviceInfoModel', firmware: '2.0.0' },
      config: {
        pools: {
          groups: [
            {
              pools: [
                {
                  url: 'stratum+tcp://example.com:3333',
                  user: 'worker',
                },
              ],
            },
          ],
        },
      },
    };

    const discovered: DiscoveredMiner = {
      ip: '1.2.3.4',
      mac: 'aa:bb:cc',
      type: 'SomeType',
      minerData,
      storageIp: '1.2.3.4',
    };

    const device = DeviceConverterService.convertToLegacyDevice(discovered) as Device;

    expect(device.ip).toBe('1.2.3.4');
    expect(device.mac).toBe('aa:bb:cc');
    expect(device.type).toBe('SomeType');

    expect(device.info.ASICModel).toBe('DeviceInfoModel');
    expect(device.info.deviceModel).toBe('MinerModel');
    expect(device.info.hostname).toBe('miner-host');
    expect((device.info as any).mac).toBe('aa:bb:cc');
    expect(device.info.version).toBe('1.0.0');
    expect(device.info.power).toBe(100);
    expect(device.info.voltage).toBe(12);
    expect(device.info.fanSpeedRpm).toBe(2000);
    expect(device.info.temp).toBe(50);
    expect(device.info.hashRate).toBe(10000); // 10 * 1000
    expect(device.info.bestDiff).toBe('123');
    expect(device.info.bestSessionDiff).toBe('456');
    expect(device.info.sharesAccepted).toBe(10);
    expect(device.info.sharesRejected).toBe(1);
    expect(device.info.uptimeSeconds).toBe(1000);
    expect(device.info.stratumURL).toBe('stratum+tcp://example.com:3333');
    expect(device.info.stratumUser).toBe('worker');
    expect(device.info.efficiency).toBe(0.5);
    expect(device.info.maxPower).toBe(120);
    expect(device.info.asicCount).toBe(5);
  });
});

describe('DeviceConverterService.convertToDevice', () => {
  it('delegates to createDiscoveredMiner and convertToLegacyDevice', () => {
    const validation: MinerValidationResult = {
      ip: '1.2.3.4',
      is_miner: true,
      model: 'ValidationModel',
    };

    const minerData: MinerData = {
      ip: '1.2.3.4',
      mac: 'aa:bb:cc',
      hostname: 'miner-host',
      model: 'MinerModel',
    };

    const device = DeviceConverterService.convertToDevice(
      '1.2.3.4',
      'aa:bb:cc',
      validation,
      null,
      minerData,
    ) as Device;

    expect(device.ip).toBe('1.2.3.4');
    expect(device.mac).toBe('aa:bb:cc');
    expect(device.info.hostname).toBe('miner-host');
  });
});

