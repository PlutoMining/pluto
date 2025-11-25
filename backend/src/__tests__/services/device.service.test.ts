import type { Device } from '@pluto/interfaces';
import axios from 'axios';
import * as deviceService from '@/services/device.service';

jest.mock('axios');
jest.mock('@pluto/db', () => ({
  findMany: jest.fn(),
  findOne: jest.fn(),
  insertOne: jest.fn(),
  updateOne: jest.fn(),
  deleteOne: jest.fn(),
}));
jest.mock('../../services/tracing.service', () => ({
  updateOriginalIpsListeners: jest.fn(),
}));
jest.mock('../../config/environment', () => ({
  config: { discoveryServiceHost: 'http://discovery.test' },
}));
jest.mock('@pluto/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const db = jest.requireMock('@pluto/db');
const tracing = jest.requireMock('../../services/tracing.service');
const { logger } = jest.requireMock('@pluto/logger');

describe('device.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches discovered devices with query params', async () => {
    mockedAxios.get.mockResolvedValue({ data: ['device'] });

    await expect(deviceService.discoverDevices({ ip: '1.1.1.1' })).resolves.toEqual(['device']);

    expect(mockedAxios.get).toHaveBeenCalledWith('http://discovery.test/discover', {
      params: { ip: '1.1.1.1', mac: undefined },
    });
  });

  it('surfaces axios errors from discoverDevices', async () => {
    const error = new Error('network');
    mockedAxios.get.mockRejectedValue(error);

    await expect(deviceService.discoverDevices()).rejects.toThrow('network');
    expect(logger.error).toHaveBeenCalledWith('Error during multiple discovered devices lookup', error);
  });

  it('builds lookupMultipleDiscoveredDevices query', async () => {
    mockedAxios.get.mockResolvedValue({ data: [] });

    await deviceService.lookupMultipleDiscoveredDevices({
      macs: ['aa', 'bb'],
      ips: ['1.1.1.1'],
      hostnames: ['rig'],
      partialMatch: { macs: 'left', ips: 'right', hostnames: 'none' },
    });

    expect(mockedAxios.get).toHaveBeenCalledWith('http://discovery.test/discovered', {
      params: {
        macs: 'aa,bb',
        ips: '1.1.1.1',
        hostnames: 'rig',
        partialMacs: 'left',
        partialIps: 'right',
        partialHostnames: 'none',
      },
    });
  });

  it('imprints devices inserting new entries', async () => {
    const lookupSpy = jest
      .spyOn(deviceService, 'lookupMultipleDiscoveredDevices')
      .mockResolvedValue([
        {
          mac: 'mac-1',
          info: {
            stratumPassword: 'secret',
            wifiPassword: 'wifi',
          },
        } as unknown as Device,
      ]);

    db.insertOne.mockResolvedValue(undefined);

    const devices = await deviceService.imprintDevices(['mac-1']);

    expect(lookupSpy).toHaveBeenCalledWith({ macs: ['mac-1'] });
    expect(db.insertOne).toHaveBeenCalledWith(
      'pluto_core',
      'devices:imprinted',
      'mac-1',
      expect.objectContaining({
        mac: 'mac-1',
        info: {},
      }),
    );
    expect(devices).toHaveLength(1);
  });

  it('updates devices when already imprinted', async () => {
    jest.spyOn(deviceService, 'lookupMultipleDiscoveredDevices').mockResolvedValue([
      {
        mac: 'mac-2',
        info: {},
      } as unknown as Device,
    ]);

    const duplicateError = new Error('already exists');
    db.insertOne.mockRejectedValue(duplicateError);
    db.updateOne.mockResolvedValue(undefined);

    await deviceService.imprintDevices(['mac-2']);

    expect(db.updateOne).toHaveBeenCalledWith(
      'pluto_core',
      'devices:imprinted',
      'mac-2',
      expect.objectContaining({ mac: 'mac-2' }),
    );
  });

  it('listens to devices by fetching when not provided', async () => {
    const devices = [{ mac: 'x', info: {} } as Device];
    db.findMany.mockResolvedValue(devices);

    const response = await deviceService.listenToDevices(undefined, true);

    expect(db.findMany).toHaveBeenCalledWith('pluto_core', 'devices:imprinted');
    expect(tracing.updateOriginalIpsListeners).toHaveBeenCalledWith(devices, true);
    expect(response).toEqual(devices);
  });

  it('listenToDevices reuses provided array', async () => {
    const devices = [{ mac: 'y', info: {} } as Device];

    const response = await deviceService.listenToDevices(devices, false);

    expect(db.findMany).not.toHaveBeenCalled();
    expect(tracing.updateOriginalIpsListeners).toHaveBeenCalledWith(devices, false);
    expect(response).toBe(devices);
  });

  it('filters imprinted devices by exact ip by default', async () => {
    db.findMany.mockResolvedValue([]);

    await deviceService.getImprintedDevices({ ip: '10.0.0.1' });

    const predicate = db.findMany.mock.calls[0][2];
    expect(predicate({ ip: '10.0.0.1' } as Device)).toBe(true);
    expect(predicate({ ip: '10.0.0.10' } as Device)).toBe(false);
  });

  it('supports partial ip matching for imprinted devices', async () => {
    db.findMany.mockResolvedValue([]);

    await deviceService.getImprintedDevices({ ip: '10.0', partialMatch: true });

    const predicate = db.findMany.mock.calls[0][2];
    expect(predicate({ ip: '10.0.1.5' } as Device)).toBe(true);
    expect(predicate({ ip: '11.0.0.1' } as Device)).toBe(false);
  });

  it('gets single imprinted device by mac', async () => {
    const device = { mac: 'mac-3' } as Device;
    db.findOne.mockResolvedValue(device);

    await expect(deviceService.getImprintedDevice('mac-3')).resolves.toEqual(device);
    expect(db.findOne).toHaveBeenCalledWith('pluto_core', 'devices:imprinted', 'mac-3');
  });

  it('filters devices by preset id', async () => {
    db.findMany.mockResolvedValue([]);

    await deviceService.getDevicesByPresetId('preset-1');

    const predicate = db.findMany.mock.calls[0][2];
    expect(predicate({ presetUuid: 'preset-1' } as Device)).toBe(true);
    expect(predicate({ presetUuid: 'preset-2' } as Device)).toBe(false);
    expect(predicate({} as Device)).toBe(false);
  });

  it('patches imprinted device sanitizing secrets', async () => {
    const payload = {
      mac: 'mac-4',
      info: {
        stratumPassword: 'secret',
        wifiPassword: 'wifi',
      },
    } as Device;
    db.updateOne.mockResolvedValue(payload);

    await deviceService.patchImprintedDevice('mac-4', payload);

    expect(db.updateOne).toHaveBeenCalledWith(
      'pluto_core',
      'devices:imprinted',
      'mac-4',
      expect.objectContaining({
        info: {},
      }),
    );
  });

  it('deletes imprinted device by id', async () => {
    db.deleteOne.mockResolvedValue(null);

    await deviceService.deleteImprintedDevice('mac-5');

    expect(db.deleteOne).toHaveBeenCalledWith('pluto_core', 'devices:imprinted', 'mac-5');
  });
});

