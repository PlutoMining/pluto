import type { Request, Response } from 'express';
import * as presetsController from '@/controllers/presets.controller';

jest.mock('@/services/presets.service', () => ({
  getPresets: jest.fn(),
  getPreset: jest.fn(),
  createPreset: jest.fn(),
  deletePreset: jest.fn(),
}));

jest.mock('@pluto/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

const presetsService = jest.requireMock('@/services/presets.service');

const mockRes = () =>
  ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  }) as unknown as Response;

describe('presets.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPresets', () => {
    it('gets presets successfully', async () => {
      const res = mockRes();
      presetsService.getPresets.mockResolvedValue([{ uuid: '1' }]);

      await presetsController.getPresets({} as Request, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Presets retrieved successfully', data: [{ uuid: '1' }] });
    });

    it('handles getPresets errors', async () => {
      const res = mockRes();
      presetsService.getPresets.mockRejectedValue(new Error('fail'));

      await presetsController.getPresets({} as Request, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to process the request' });
    });
  });

  describe('getPreset', () => {
    it('returns preset when available', async () => {
      const res = mockRes();
      presetsService.getPreset.mockResolvedValue({ uuid: '1' });

      await presetsController.getPreset({ params: { id: '1' } } as unknown as Request, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('handles getPreset not found', async () => {
      const res = mockRes();
      presetsService.getPreset.mockResolvedValue(null);

      await presetsController.getPreset({ params: { id: 'missing' } } as unknown as Request, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Preset not found', data: null });
    });
  });

  describe('createPreset', () => {
    it('creates preset', async () => {
      const res = mockRes();
      presetsService.createPreset.mockResolvedValue({ uuid: '1' });

      await presetsController.createPreset({ body: {} } as Request, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Preset created successfully', data: { uuid: '1' } });
    });

    it('handles createPreset errors', async () => {
      const res = mockRes();
      presetsService.createPreset.mockRejectedValue(new Error('fail'));

      await presetsController.createPreset({ body: {} } as Request, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('deletePreset', () => {
    it('deletes preset returning not found', async () => {
      const res = mockRes();
      presetsService.deletePreset.mockResolvedValue(null);

      await presetsController.deletePreset({ params: { id: 'missing' } } as unknown as Request, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('handles deletePreset errors', async () => {
      const res = mockRes();
      presetsService.deletePreset.mockRejectedValue(new Error('fail'));

      await presetsController.deletePreset({ params: { id: 'boom' } } as unknown as Request, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});

