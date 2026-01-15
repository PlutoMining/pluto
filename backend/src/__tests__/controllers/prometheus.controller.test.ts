import type { Request, Response } from 'express';
import axios from 'axios';
import * as prometheusController from '@/controllers/prometheus.controller';

jest.mock('axios');
jest.mock('@/services/prometheus.service', () => ({
  prometheusQuery: jest.fn(),
  prometheusQueryRange: jest.fn(),
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const prometheusService = jest.requireMock('@/services/prometheus.service');

const mockRes = () =>
  ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  }) as unknown as Response;

describe('prometheus.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.isAxiosError.mockReturnValue(false);
  });

  describe('query', () => {
    it('returns proxied Prometheus response body', async () => {
      prometheusService.prometheusQuery.mockResolvedValue({ data: { status: 'success' } });
      const req = { query: { query: 'up' } } as unknown as Request;
      const res = mockRes();

      await prometheusController.query(req, res);

      expect(prometheusService.prometheusQuery).toHaveBeenCalledWith({ query: 'up', time: undefined });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ status: 'success' });
    });

    it('maps axios errors to upstream status/data', async () => {
      const error = {
        message: 'upstream down',
        response: { status: 503, data: { status: 'error', error: 'down' } },
      };
      mockedAxios.isAxiosError.mockReturnValue(true);
      prometheusService.prometheusQuery.mockRejectedValue(error);
      const req = { query: { query: 'up' } } as unknown as Request;
      const res = mockRes();

      await prometheusController.query(req, res);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({ status: 'error', error: 'down' });
    });

    it('maps validation errors to 400', async () => {
      prometheusService.prometheusQuery.mockRejectedValue(new Error("Missing 'query'"));
      const req = { query: {} } as unknown as Request;
      const res = mockRes();

      await prometheusController.query(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ status: 'error', error: "Missing 'query'" });
    });
  });

  describe('queryRange', () => {
    it('returns proxied Prometheus response body', async () => {
      prometheusService.prometheusQueryRange.mockResolvedValue({ data: { status: 'success' } });
      const req = {
        query: { query: 'up', start: '1', end: '2', step: '15s' },
      } as unknown as Request;
      const res = mockRes();

      await prometheusController.queryRange(req, res);

      expect(prometheusService.prometheusQueryRange).toHaveBeenCalledWith({
        query: 'up',
        start: '1',
        end: '2',
        step: '15s',
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ status: 'success' });
    });

    it('maps axios errors to upstream status/data', async () => {
      const error = {
        message: 'bad gateway',
        response: { status: 502, data: { status: 'error', error: 'bad gateway' } },
      };
      mockedAxios.isAxiosError.mockReturnValue(true);
      prometheusService.prometheusQueryRange.mockRejectedValue(error);
      const req = {
        query: { query: 'up', start: '1', end: '2', step: '15s' },
      } as unknown as Request;
      const res = mockRes();

      await prometheusController.queryRange(req, res);

      expect(res.status).toHaveBeenCalledWith(502);
      expect(res.json).toHaveBeenCalledWith({ status: 'error', error: 'bad gateway' });
    });

    it('maps validation errors to 400', async () => {
      prometheusService.prometheusQueryRange.mockRejectedValue(new Error('Range too large'));
      const req = {
        query: { query: 'up', start: '1', end: '2', step: '15s' },
      } as unknown as Request;
      const res = mockRes();

      await prometheusController.queryRange(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ status: 'error', error: 'Range too large' });
    });
  });
});

