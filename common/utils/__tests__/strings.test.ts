import { sanitizeHostname } from '../strings';

describe('sanitizeHostname', () => {
  it('replaces invalid characters with double underscores', () => {
    expect(sanitizeHostname('my-host.name')).toBe('my__host__name');
  });

  it('keeps alphanumeric and underscore characters', () => {
    expect(sanitizeHostname('my_host01')).toBe('my_host01');
  });

  it('replaces dots and colons in IP addresses', () => {
    expect(sanitizeHostname('192.168.6.7')).toBe('192__168__6__7');
  });

  it('does not alter a simple alphanumeric hostname', () => {
    expect(sanitizeHostname('bitaxeGamma2')).toBe('bitaxeGamma2');
  });

  it('leaves underscores untouched', () => {
    expect(sanitizeHostname('_private')).toBe('_private');
  });
});
