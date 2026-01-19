jest.mock('@/lib/prometheus', () => {
  const original = jest.requireActual('@/lib/prometheus');
  return {
    __esModule: true,
    ...original,
    promQuery: jest.fn(),
    promQueryRange: jest.fn(),
  };
});

import { matrixToSeries, rangeToQueryParams, vectorToNumber } from '@/lib/prometheus';

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
  });
});
