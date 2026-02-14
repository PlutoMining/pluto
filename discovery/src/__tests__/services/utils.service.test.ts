import { UtilsService } from '@/services/utils.service';

describe('UtilsService.chunkArray', () => {
  it('splits array into chunks of given size', () => {
    const arr = [1, 2, 3, 4, 5];
    const chunks = UtilsService.chunkArray(arr, 2);

    expect(chunks).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('returns empty array when input is empty', () => {
    expect(UtilsService.chunkArray([], 3)).toEqual([]);
  });

  it('throws when size is not positive', () => {
    expect(() => UtilsService.chunkArray([1, 2], 0)).toThrow('Chunk size must be greater than 0');
    expect(() => UtilsService.chunkArray([1, 2], -1)).toThrow('Chunk size must be greater than 0');
  });
});

describe('UtilsService.mockMacFromPort', () => {
  it('returns deterministic mac for numeric port', () => {
    const mac1 = UtilsService.mockMacFromPort(9001);
    const mac2 = UtilsService.mockMacFromPort('9001');

    expect(mac1).toBe('ff:ff:ff:ff:23:29');
    expect(mac2).toBe(mac1);
  });

  it('returns undefined for invalid ports', () => {
    expect(UtilsService.mockMacFromPort(0)).toBeUndefined();
    expect(UtilsService.mockMacFromPort(-1)).toBeUndefined();
    expect(UtilsService.mockMacFromPort('wat')).toBeUndefined();
  });
});

describe('UtilsService.isMockDevice', () => {
  it('detects mock device mac addresses', () => {
    expect(UtilsService.isMockDevice('ff:ff:ff:ff:00:01')).toBe(true);
    expect(UtilsService.isMockDevice('FF:FF:FF:FF:AA:BB')).toBe(true);
  });

  it('returns false for non-mock mac addresses or non-strings', () => {
    expect(UtilsService.isMockDevice('aa:bb:cc:dd:ee:ff')).toBe(false);
    // @ts-expect-error runtime guard handles non-string
    expect(UtilsService.isMockDevice(null)).toBe(false);
  });
});

