import { sanitizeHostname } from '../strings';

describe('sanitizeHostname', () => {
  it('replaces invalid characters with double underscores', () => {
    expect(sanitizeHostname('my-host.name')).toBe('my__host__name');
  });

  it('keeps alphanumeric and underscore characters', () => {
    expect(sanitizeHostname('my_host01')).toBe('my_host01');
  });

  it('prefixes with miner_ when hostname starts with a digit', () => {
    expect(sanitizeHostname('192.168.6.7')).toBe('miner_192__168__6__7');
  });

  it('does not prefix when hostname starts with a letter', () => {
    expect(sanitizeHostname('bitaxeGamma2')).toBe('bitaxeGamma2');
  });

  it('prefixes an all-numeric hostname', () => {
    expect(sanitizeHostname('12345')).toBe('miner_12345');
  });

  it('does not prefix when hostname starts with underscore', () => {
    expect(sanitizeHostname('_private')).toBe('_private');
  });
});
