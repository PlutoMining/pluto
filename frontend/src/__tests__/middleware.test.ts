const nextResponse = {
  next: jest.fn(() => ({ type: 'next' })),
  rewrite: jest.fn((url: URL) => ({ type: 'rewrite', url })),
  json: jest.fn((body: any, init: any) => ({ type: 'json', body, init })),
};

jest.mock('next/server', () => ({
  __esModule: true,
  NextResponse: nextResponse,
}));

let middleware: (req: any) => any;
let config: any;

function makeReq(pathname: string, search = '') {
  const url = { pathname, search };
  return {
    nextUrl: {
      ...url,
      clone: () => ({ ...url }),
    },
  } as any;
}

describe('middleware', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();
    delete process.env.BACKEND_DESTINATION_HOST;

    ({ middleware, config } = await import('@/middleware'));
  });

  it('exposes the expected matcher config', () => {
    expect(config.matcher).toEqual(['/api/:path*']);
    expect(config.dynamic).toBe('force-dynamic');
  });

  it('passes through internal api routes', () => {
    const res = middleware(makeReq('/api/app-version'));
    expect(res).toEqual({ type: 'next' });
    expect(nextResponse.next).toHaveBeenCalledTimes(1);
    expect(nextResponse.rewrite).not.toHaveBeenCalled();
    expect(nextResponse.json).not.toHaveBeenCalled();

    middleware(makeReq('/api/socket/io'));
    expect(nextResponse.next).toHaveBeenCalledTimes(2);
  });

  it('rewrites external api routes to backend host', () => {
    process.env.BACKEND_DESTINATION_HOST = 'https://backend.example.com';
    const res = middleware(makeReq('/api/devices', '?q=1')) as any;

    expect(res.type).toBe('rewrite');
    expect(res.url.href).toBe('https://backend.example.com/devices?q=1');
    expect(nextResponse.rewrite).toHaveBeenCalledTimes(1);
    expect(nextResponse.next).not.toHaveBeenCalled();
  });

  it('returns 500 when backend host is missing', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = middleware(makeReq('/api/devices')) as any;

    expect(res.type).toBe('json');
    expect(res.body).toEqual({ error: 'BACKEND_DESTINATION_HOST is not defined' });
    expect(res.init.status).toBe(500);
    expect(res.init.headers['cache-control']).toBe('no-store');
    expect(nextResponse.json).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error: BACKEND_DESTINATION_HOST is not defined');

    consoleErrorSpy.mockRestore();
  });
});
