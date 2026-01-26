import { sanitizeHostname } from '../strings';

describe('sanitizeHostname', () => {
  it('replaces invalid characters with double underscores', () => {
    expect(sanitizeHostname('my-host.name')).toBe('my__host__name');
  });

  it('keeps alphanumeric and underscore characters', () => {
    expect(sanitizeHostname('my_host01')).toBe('my_host01');
  });
});
