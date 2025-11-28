import type { Request, Response } from 'express';
import * as socketController from '@/controllers/socket.controller';

jest.mock('@/services/tracing.service', () => ({
  startIoHandler: jest.fn(),
}));

const tracingService = jest.requireMock('@/services/tracing.service');

const mockRes = () =>
  ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  }) as unknown as Response;

describe('socket.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('startIoHandler', () => {
    it('starts io handler successfully', async () => {
      const req = {
        app: {
          get: jest.fn().mockReturnValue('server'),
        },
      } as unknown as Request;
      const res = mockRes();

      await socketController.startIoHandler(req, res);

      expect(tracingService.startIoHandler).toHaveBeenCalledWith('server');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('handles errors when starting socket', async () => {
      tracingService.startIoHandler.mockImplementation(() => {
        throw new Error('boom');
      });
      const req = {
        app: {
          get: jest.fn().mockReturnValue('server'),
        },
      } as unknown as Request;
      const res = mockRes();

      await socketController.startIoHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to process the request' });
    });
  });
});

