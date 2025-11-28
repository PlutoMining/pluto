import { getMinerName } from '@/utils/minerMap';

describe('getMinerName', () => {
  it('returns friendly name when known', () => {
    expect(getMinerName('401')).toBe('Bitaxe Supra (401)');
  });

  it('falls back to board version when unknown', () => {
    expect(getMinerName('999')).toBe('999');
  });
});

