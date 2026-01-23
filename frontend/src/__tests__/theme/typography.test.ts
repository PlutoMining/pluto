import { accentFont, fontSizes, fonts, fontWeights } from '@/theme/typography';

describe('theme/typography', () => {
  it('exports fonts and sizes', () => {
    expect(accentFont.style.fontFamily).toBe('Azeret Mono');
    expect(fonts.heading).toBe('Clash_Display');
    expect(fontSizes['4xl']).toBe('2.5rem');
    expect(fontWeights['700']).toBe(700);
  });
});
