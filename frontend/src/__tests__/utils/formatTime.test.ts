import { formatTime, formatDetailedTime, convertIsoTomMdDYy } from '@/utils/formatTime';

describe('formatTime', () => {
  it('returns human-friendly buckets', () => {
    expect(formatTime(65)).toBe('1 m');
    expect(formatTime(3661)).toBe('1 h');
    expect(formatTime(90000)).toBe('1 d');
    expect(formatTime(0)).toBe('-');
    expect(formatTime(10)).toBe('< 1 m');
  });

  it('handles missing values', () => {
    expect(formatTime(undefined)).toBe('-');
    expect(formatTime(null)).toBe('-');
  });
});

describe('formatDetailedTime', () => {
  it('includes up to three most significant units', () => {
    expect(formatDetailedTime(4000000)).toBe('6w 4d 7h');
    expect(formatDetailedTime(90000)).toBe('1d 1h');
    expect(formatDetailedTime(125)).toBe('2m');
  });

  it('handles missing values', () => {
    expect(formatDetailedTime(undefined)).toBe('-');
    expect(formatDetailedTime(null)).toBe('-');
  });

  it('handles multi-year durations', () => {
    const seconds = 2 * 365 * 24 * 60 * 60 + 10 * 7 * 24 * 60 * 60 + 3 * 24 * 60 * 60;
    expect(formatDetailedTime(seconds)).toBe('2y 10w 5d');
  });
});

describe('convertIsoTomMdDYy', () => {
  it('formats ISO strings into mm/dd/yy', () => {
    expect(convertIsoTomMdDYy('2024-10-05T10:00:00Z')).toBe('10/05/24');
  });
});
