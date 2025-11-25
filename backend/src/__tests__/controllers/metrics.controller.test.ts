import type { Request, Response } from 'express';
import * as metricsController from '@/controllers/metrics.controller';

jest.mock('@/services/metrics.service', () => ({
  register: {
    contentType: 'text/plain',
    metrics: jest.fn(),
  },
}));

const { register } = jest.requireMock('@/services/metrics.service');

const mockRes = () =>
  ({
    setHeader: jest.fn(),
    end: jest.fn(),
    status: jest.fn().mockReturnThis(),
  }) as unknown as Response;

describe('metrics.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('streams metrics on success', async () => {
    register.metrics.mockResolvedValue('# HELP');
    const res = mockRes();

    await metricsController.getMetrics({} as Request, res);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain');
    expect(res.end).toHaveBeenCalledWith('# HELP');
  });

  it('handles errors collecting metrics', async () => {
    register.metrics.mockRejectedValue(new Error('boom'));
    const res = mockRes();

    await metricsController.getMetrics({} as Request, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.end).toHaveBeenCalledWith('Failed to collect metrics');
  });
});

