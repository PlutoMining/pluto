import type { NextFunction, Request, Response } from 'express';
import { removeSecretsMiddleware } from '@/middleware/remove-secrets.middleware';

describe('removeSecretsMiddleware', () => {
  it('strips secrets before delegating to original send', () => {
    const req = {} as Request;
    const originalSend = jest.fn(function (this: Response, body: unknown) {
      return body;
    });
    const res = {
      send: originalSend,
    } as unknown as Response;
    const next = jest.fn() as NextFunction;

    removeSecretsMiddleware(req, res, next);

    const payload = JSON.stringify({
      stratumPassword: 'secret',
      child: {
        wifiPassword: 'wifi',
      },
    });

    res.send(payload);

    expect(next).toHaveBeenCalled();
    expect(originalSend).toHaveBeenCalledWith(
      JSON.stringify({
        child: {},
      }),
    );
  });

  it('leaves non-JSON payloads untouched', () => {
    const req = {} as Request;
    const originalSend = jest.fn(function (this: Response, body: unknown) {
      return body;
    });
    const res = {
      send: originalSend,
    } as unknown as Response;

    removeSecretsMiddleware(req, res, jest.fn());

    const payload = '<html></html>';
    res.send(payload);

    expect(originalSend).toHaveBeenCalledWith(payload);
  });
});

