import { colors } from '@/theme/colors';

describe('theme/colors', () => {
  it('exports the expected palette shape', () => {
    expect(colors.greyscale[0]).toBe('#fff');
    expect(colors.primary[500]).toBe('#13FFEB');
    expect(colors.alert.error).toBe('#EE2B34');
  });
});
