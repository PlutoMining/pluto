import {
  isValidIp,
  isValidMac,
  validateBitcoinAddress,
  validateDomain,
  validateTCPPort,
} from '../validators';

describe('validators', () => {
  it('validates IPv4 and MAC formats', () => {
    expect(isValidIp('192.168.0.1')).toBe(true);
    expect(isValidIp('999.1.1.1')).toBe(false);

    expect(isValidMac('aa:bb:cc:dd:ee:ff')).toBe(true);
    expect(isValidMac('aa:bb:cc:dd:ee')).toBe(false);
  });

  it('validates ports, domains, and bitcoin addresses', () => {
    expect(validateTCPPort(0)).toBe(true);
    expect(validateTCPPort(65535)).toBe(true);
    expect(validateTCPPort(65536)).toBe(false);

    expect(validateDomain('example.com', { requireFQDN: true })).toBe(true);
    expect(validateDomain('example', { requireFQDN: true })).toBe(false);

    expect(validateDomain('_srv.example.com', { allowUnderscore: true, requireFQDN: true })).toBe(
      true,
    );
    expect(validateDomain('192.168.0.1', { allowIP: false, requireFQDN: true })).toBe(false);

    expect(validateBitcoinAddress('1BoatSLRHtKNngkdXEeobR76b53LETtpyT')).toBe(true);
    expect(validateBitcoinAddress('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy')).toBe(true);
    expect(validateBitcoinAddress('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080')).toBe(true);
    expect(validateBitcoinAddress('not-a-btc-address')).toBe(false);
  });
});
