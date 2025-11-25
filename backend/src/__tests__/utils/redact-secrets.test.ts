import { redactSecrets } from '@/utils/redact-secrets';

describe('redactSecrets', () => {
  it('removes sensitive fields from nested objects', () => {
    const payload = {
      stratumPassword: 'top-secret',
      wifiPassword: 'another-secret',
      nested: {
        deeper: {
          wifiPassword: 'hidden',
        },
      },
      arrayPayload: [
        {
          stratumPassword: 'array-secret',
        },
        'leave-me',
      ],
    };

    redactSecrets(payload);

    expect(payload).toEqual({
      nested: {
        deeper: {},
      },
      arrayPayload: [{}, 'leave-me'],
    });
  });

  it('does not modify primitives or nullish values', () => {
    const payload = {
      count: 2,
      enabled: true,
      nothing: null,
      list: [null, undefined],
    };

    redactSecrets(payload);

    expect(payload).toEqual({
      count: 2,
      enabled: true,
      nothing: null,
      list: [null, undefined],
    });
  });
});

