jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

const createLogger = jest.fn((cfg) => cfg);
const printf = jest.fn((fn) => fn);
const timestamp = jest.fn(() => ({ kind: 'timestamp' }));
const combine = jest.fn((...args) => ({ kind: 'combine', args }));

const ConsoleTransport = jest.fn(() => ({ kind: 'console' }));
const FileTransport = jest.fn((opts) => ({ kind: 'file', opts }));

jest.mock('winston', () => ({
  __esModule: true,
  default: {
    createLogger,
    format: {
      combine,
      timestamp,
      printf,
    },
    transports: {
      Console: ConsoleTransport,
      File: FileTransport,
    },
  },
}));

describe('common/logger', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('creates logs dir when missing', async () => {
    const fs = await import('fs');
    (fs.existsSync as any).mockReturnValue(false);

    await import('../logger');

    expect(fs.mkdirSync).toHaveBeenCalledWith('logs');
  });

  it('does not create logs dir when present', async () => {
    const fs = await import('fs');
    (fs.existsSync as any).mockReturnValue(true);

    await import('../logger');

    expect(fs.mkdirSync).not.toHaveBeenCalled();
  });

  it('createCustomLogger uses file transport', async () => {
    const fs = await import('fs');
    (fs.existsSync as any).mockReturnValue(true);

    const { createCustomLogger } = await import('../logger');

    const cfg = createCustomLogger('api');

    expect(cfg.transports).toHaveLength(1);
    expect(FileTransport).toHaveBeenCalledWith({ filename: 'logs/api.log' });
  });

  it('formats object messages as pretty JSON', async () => {
    const fs = await import('fs');
    (fs.existsSync as any).mockReturnValue(true);

    await import('../logger');

    const formatFn = (printf as any).mock.calls[0][0];
    const line = formatFn({ timestamp: 't', level: 'info', message: { a: 1 } });

    expect(line).toContain('t [INFO]');
    expect(line).toContain('"a": 1');
  });

  it('formats string messages without JSON', async () => {
    const fs = await import('fs');
    (fs.existsSync as any).mockReturnValue(true);

    await import('../logger');

    const formatFn = (printf as any).mock.calls[0][0];
    const line = formatFn({ timestamp: 't', level: 'info', message: 'hello' });

    expect(line).toContain('t [INFO]');
    expect(line).toContain('hello');
  });

  it('re-exports from index and formats custom logger messages', async () => {
    const fs = await import('fs');
    (fs.existsSync as any).mockReturnValue(true);

    const { createCustomLogger } = await import('../index');
    const cfg = createCustomLogger('api');

    const formatFn = (cfg.format as any).args[1];
    const objLine = formatFn({ timestamp: 't', level: 'info', message: { a: 1 } });
    const strLine = formatFn({ timestamp: 't', level: 'info', message: 'hello' });

    expect(objLine).toContain('t [INFO]');
    expect(objLine).toContain('"a": 1');
    expect(strLine).toContain('t [INFO]');
    expect(strLine).toContain('hello');
  });
});
