import type { MinerData } from '@pluto/interfaces';
import type { MinerValidationResult } from '../../services/miner-validation.service';
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
    deviceInfo: { model: 'DeviceInfoModel' },
    fans: [],
    hashboards: [],
  };

  const arpResult: ArpScanResult = {
    ip: '1.2.3.4',
    mac: 'aa:bb:cc',
    type: 'ArpType',
  };

  it('prefers validation model, then deviceInfo.model, then arp type', () => {
    const discovered = DeviceConverterService.createDiscoveredMiner(
      '1.2.3.4',
      'aa:bb:cc',
      baseValidation,
      arpResult,
      baseMinerData,
    );

    expect(discovered.type).toBe('ValidationModel');
    expect(discovered.supportLevel).toBe('generic');

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
      { ...baseMinerData, deviceInfo: undefined },
    );
    expect(noDeviceInfo.type).toBe('ArpType');

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
      deviceInfo: undefined,
      fans: [],
      hashboards: [],
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

  it('passes supportLevel through to the result', () => {
    const discovered = DeviceConverterService.createDiscoveredMiner(
      '1.2.3.4',
      'aa:bb:cc',
      null,
      null,
      baseMinerData,
      'native',
    );

    expect(discovered.supportLevel).toBe('native');
  });
});
