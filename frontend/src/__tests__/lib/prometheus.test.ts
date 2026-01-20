import { matrixToSeries, promQuery, promQueryRange, rangeToQueryParams, vectorToNumber } from '@/lib/prometheus';

describe('prometheus lib', () => {

  describe('vectorToNumber', () => {
    it('returns fallback for empty/invalid', () => {
      expect(vectorToNumber(undefined, 7)).toBe(7);
      expect(vectorToNumber([], 7)).toBe(7);
      expect(vectorToNumber([{ metric: {}, value: [0, 'not-a-number'] }], 7)).toBe(7);
    });

    it('parses the first vector value', () => {
      expect(vectorToNumber([{ metric: {}, value: [1700000000, '42'] }], 0)).toBe(42);
    });
  });

  describe('matrixToSeries', () => {
    it('maps and filters points', () => {
      const input = [
        {
          metric: { job: 'demo' },
          values: [
            ['1700000000', '1.25'],
            [1700000001, '2'],
            ['bad-time', '3'],
            [1700000002, 'bad-value'],
          ],
        },
      ];

      const out = matrixToSeries(input);
      expect(out).toHaveLength(1);
      expect(out[0].metric).toEqual({ job: 'demo' });
      expect(out[0].points).toEqual([
        { t: 1700000000, v: 1.25 },
        { t: 1700000001, v: 2 },
      ]);
    });

    it('returns empty for undefined', () => {
      expect(matrixToSeries(undefined)).toEqual([]);
    });
  });

  describe('rangeToQueryParams', () => {
    it('returns start/end/step aligned with now', () => {
      const fixedNowMs = 1700000000 * 1000;
      jest.spyOn(Date, 'now').mockReturnValue(fixedNowMs);

      const params = rangeToQueryParams(3600);

      expect(params.end).toBe(1700000000);
      expect(params.start).toBe(1700000000 - 3600);
      expect(params.step).toMatch(/^\d+s$/);

      (Date.now as jest.Mock).mockRestore();
    });

    it('falls back to a 1h step for very large ranges', () => {
      const fixedNowMs = 1700000000 * 1000;
      jest.spyOn(Date, 'now').mockReturnValue(fixedNowMs);

      // raw step > 3600 means we hit the `?? 3600` fallback.
      const params = rangeToQueryParams(864000 + 1);
      expect(params.step).toBe('3600s');

      (Date.now as jest.Mock).mockRestore();
    });
  });

  describe('promQuery/promQueryRange (fetchProm)', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('returns json on success', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch' as any).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'success',
          data: { resultType: 'vector', result: [] },
        }),
      } as any);

      const res = await promQuery('up', 1700000000);

      expect(res.status).toBe('success');
      const [url, init] = fetchSpy.mock.calls[0];
      expect(String(url)).toContain('/api/prometheus/query');
      expect(String(url)).toContain('query=up');
      expect(String(url)).toContain('time=1700000000');
      expect(init).toMatchObject({
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
    });

    it('throws when response.ok is false', async () => {
      jest.spyOn(global, 'fetch' as any).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({
          status: 'success',
          data: { resultType: 'vector', result: [] },
        }),
      } as any);

      await expect(promQuery('up')).rejects.toThrow('Prometheus request failed (500)');
    });

    it('throws when json.status is error', async () => {
      jest.spyOn(global, 'fetch' as any).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'error',
          error: 'bad_data',
          errorType: 'bad_data',
        }),
      } as any);

      await expect(promQuery('up')).rejects.toThrow('bad_data');
    });

    it('passes AbortSignal through to fetch', async () => {
      const controller = new AbortController();
      const fetchSpy = jest.spyOn(global, 'fetch' as any).mockImplementation((_url: string, init?: any) => {
        const signal = init?.signal as AbortSignal | undefined;
        return new Promise((_resolve, reject) => {
          signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      });

      const promise = promQueryRange('up', 1, 2, '15s', { signal: controller.signal });
      controller.abort();

      await expect(promise).rejects.toMatchObject({ name: 'AbortError' });

      const init = fetchSpy.mock.calls[0][1];
      expect(init.signal).toBe(controller.signal);
    });

    it('passes AbortSignal via promQuery options', async () => {
      const controller = new AbortController();

      const fetchSpy = jest.spyOn(global, 'fetch' as any).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'success',
          data: { resultType: 'vector', result: [] },
        }),
      } as any);

      await promQuery('up', undefined, { signal: controller.signal });

      const init = fetchSpy.mock.calls[0][1];
      expect(init.signal).toBe(controller.signal);
    });
  });
});
