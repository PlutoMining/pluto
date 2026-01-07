import type { Preset } from '@pluto/interfaces';
import { deletePreset, createPreset, getPreset, getPresets } from '@/services/presets.service';

jest.mock('@pluto/db', () => ({
  findMany: jest.fn(),
  findOne: jest.fn(),
  insertOne: jest.fn(),
  deleteOne: jest.fn(),
}));

jest.mock('@pluto/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

jest.mock('uuid', () => ({
  v7: jest.fn(),
}));

const { findMany, findOne, insertOne, deleteOne } = jest.requireMock('@pluto/db');
const { logger } = jest.requireMock('@pluto/logger');
const { v7 } = jest.requireMock('uuid');

describe('presets.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPresets', () => {
    it('returns all presets via getPresets', async () => {
      const mockPresets = [{ uuid: '1' }] as Preset[];
      findMany.mockResolvedValue(mockPresets);

      await expect(getPresets()).resolves.toEqual(mockPresets);
      expect(findMany).toHaveBeenCalledWith('pluto_core', 'presets');
    });

    it('logs and rethrows errors in getPresets', async () => {
      const error = new Error('boom');
      findMany.mockRejectedValue(error);

      await expect(getPresets()).rejects.toThrow('boom');
      expect(logger.error).toHaveBeenCalledWith('Error in getPresets:', error);
    });
  });

  describe('getPreset', () => {
    it('returns preset by id', async () => {
      const preset = { uuid: '2' } as Preset;
      findOne.mockResolvedValue(preset);

      await expect(getPreset('2')).resolves.toEqual(preset);
      expect(findOne).toHaveBeenCalledWith('pluto_core', 'presets', '2');
    });

    it('logs and rethrows errors in getPreset', async () => {
      const error = new Error('not found');
      findOne.mockRejectedValue(error);

      await expect(getPreset('2')).rejects.toThrow('not found');
      expect(logger.error).toHaveBeenCalledWith('Error in getPresets:', error);
    });
  });

  describe('createPreset', () => {
    it('creates preset assigning a uuid', async () => {
      const preset = { name: 'test' } as Preset;
      v7.mockReturnValue('generated-id');
      insertOne.mockResolvedValue({ ...preset, uuid: 'generated-id' });

      const created = await createPreset(preset);

      expect(v7).toHaveBeenCalled();
      expect(insertOne).toHaveBeenCalledWith('pluto_core', 'presets', 'generated-id', preset);
      expect(created).toEqual({ ...preset, uuid: 'generated-id' });
      expect(preset.uuid).toBe('generated-id');
    });

    it('logs and rethrows errors in createPreset', async () => {
      const preset = { name: 'test' } as Preset;
      const error = new Error('insert failed');
      v7.mockReturnValue('generated-id');
      insertOne.mockRejectedValue(error);

      await expect(createPreset(preset)).rejects.toThrow('insert failed');
      expect(logger.error).toHaveBeenCalledWith('Error in getPresets:', error);
    });
  });

  describe('deletePreset', () => {
    it('deletes preset by id', async () => {
      const preset = { uuid: '3' } as Preset;
      deleteOne.mockResolvedValue(preset);

      await expect(deletePreset('3')).resolves.toEqual(preset);
      expect(deleteOne).toHaveBeenCalledWith('pluto_core', 'presets', '3');
    });

    it('logs and rethrows errors in deletePreset', async () => {
      const error = new Error('delete failed');
      deleteOne.mockRejectedValue(error);

      await expect(deletePreset('3')).rejects.toThrow('delete failed');
      expect(logger.error).toHaveBeenCalledWith('Error in getPresets:', error);
    });
  });
});

