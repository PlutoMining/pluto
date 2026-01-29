import axios from 'axios';
import { prometheusQuery, prometheusQueryRange } from '@/services/prometheus.service';

jest.mock('axios');
jest.mock('@/config/environment', () => ({
  config: {
    prometheusHost: 'http://prom.test',
  },
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('prometheus.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('prometheusQuery', () => {
    it('proxies query without time param when omitted', async () => {
      mockedAxios.get.mockResolvedValue({ data: { status: 'success' } } as any);

      await prometheusQuery({ query: 'up' });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://prom.test/api/v1/query',
        expect.objectContaining({
          timeout: expect.any(Number),
          params: { query: 'up' },
        })
      );
    });

    it('proxies query with parsed unix seconds time', async () => {
      mockedAxios.get.mockResolvedValue({ data: { status: 'success' } } as any);

      await prometheusQuery({ query: 'up', time: '123' });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://prom.test/api/v1/query',
        expect.objectContaining({
          timeout: expect.any(Number),
          params: { query: 'up', time: 123 },
        })
      );
    });

    it('rejects missing query', async () => {
      await expect(prometheusQuery({ query: '' })).rejects.toThrow("Missing 'query'");
    });

    it("rejects invalid 'time'", async () => {
      await expect(prometheusQuery({ query: 'up', time: 'not-a-number' })).rejects.toThrow("Invalid 'time'");
    });

    it("rejects blank 'time'", async () => {
      await expect(prometheusQuery({ query: 'up', time: '   ' })).rejects.toThrow("Invalid 'time'");
    });

    it('rejects too-long query', async () => {
      await expect(prometheusQuery({ query: 'x'.repeat(8001) })).rejects.toThrow('Query too long');
    });
  });

  describe('prometheusQueryRange', () => {
    it('proxies query_range and normalizes duration step', async () => {
      mockedAxios.get.mockResolvedValue({ data: { status: 'success' } } as any);

      await prometheusQueryRange({ query: 'up', start: 100, end: 160, step: '2m' });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://prom.test/api/v1/query_range',
        expect.objectContaining({
          timeout: expect.any(Number),
          params: {
            query: 'up',
            start: 100,
            end: 160,
            step: '120s',
          },
        })
      );
    });

    it('accepts seconds duration step', async () => {
      mockedAxios.get.mockResolvedValue({ data: { status: 'success' } } as any);

      await prometheusQueryRange({ query: 'up', start: 100, end: 160, step: '15s' });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://prom.test/api/v1/query_range',
        expect.objectContaining({
          params: expect.objectContaining({
            step: '15s',
          }),
        })
      );
    });

    it('accepts hours duration step', async () => {
      mockedAxios.get.mockResolvedValue({ data: { status: 'success' } } as any);

      await prometheusQueryRange({ query: 'up', start: 0, end: 4000, step: '1h' });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://prom.test/api/v1/query_range',
        expect.objectContaining({
          params: expect.objectContaining({
            step: '3600s',
          }),
        })
      );
    });

    it('rejects ranges larger than 7d', async () => {
      await expect(
        prometheusQueryRange({
          query: 'up',
          start: 0,
          end: 60 * 60 * 24 * 8,
          step: '60s',
        })
      ).rejects.toThrow('Range too large');
    });

    it('rejects too-small step', async () => {
      await expect(
        prometheusQueryRange({
          query: 'up',
          start: 0,
          end: 60,
          step: '1s',
        })
      ).rejects.toThrow('Step too small');
    });

    it("rejects when 'end' is not greater than 'start'", async () => {
      await expect(
        prometheusQueryRange({
          query: 'up',
          start: 10,
          end: 10,
          step: '60s',
        })
      ).rejects.toThrow("Invalid time range: 'end' must be > 'start'");
    });

    it('rejects non-string non-number step', async () => {
      await expect(
        prometheusQueryRange({
          query: 'up',
          start: 0,
          end: 60,
          step: {} as any,
        })
      ).rejects.toThrow("Invalid 'step'");
    });

    it('rejects empty step string', async () => {
      await expect(
        prometheusQueryRange({
          query: 'up',
          start: 0,
          end: 60,
          step: '   ',
        })
      ).rejects.toThrow("Invalid 'step'");
    });

    it('rejects non-numeric step string', async () => {
      await expect(
        prometheusQueryRange({
          query: 'up',
          start: 0,
          end: 60,
          step: 'abc',
        })
      ).rejects.toThrow("Invalid 'step'");
    });

    it('accepts numeric step (number)', async () => {
      mockedAxios.get.mockResolvedValue({ data: { status: 'success' } } as any);

      await prometheusQueryRange({ query: 'up', start: 0, end: 60, step: 15 });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://prom.test/api/v1/query_range',
        expect.objectContaining({
          params: expect.objectContaining({
            step: '15s',
          }),
        })
      );
    });

    it('accepts numeric step (string seconds)', async () => {
      mockedAxios.get.mockResolvedValue({ data: { status: 'success' } } as any);

      await prometheusQueryRange({ query: 'up', start: 0, end: 60, step: '15' });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://prom.test/api/v1/query_range',
        expect.objectContaining({
          params: expect.objectContaining({
            step: '15s',
          }),
        })
      );
    });

    it('rejects non-positive step', async () => {
      await expect(
        prometheusQueryRange({
          query: 'up',
          start: 0,
          end: 60,
          step: 0,
        })
      ).rejects.toThrow("Invalid 'step'");
    });

    it('rejects too-large step', async () => {
      await expect(
        prometheusQueryRange({
          query: 'up',
          start: 0,
          end: 4000,
          step: '3601s',
        })
      ).rejects.toThrow('Step too large');
    });

    it('rejects too many datapoints', async () => {
      await expect(
        prometheusQueryRange({
          query: 'up',
          start: 0,
          end: 55005,
          step: '5s',
        })
      ).rejects.toThrow('Too many datapoints');
    });
  });
});
