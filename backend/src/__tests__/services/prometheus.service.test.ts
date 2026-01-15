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
  });
});

