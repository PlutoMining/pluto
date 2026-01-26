jest.mock('level', () => {
  class FakeLevel {
    static store = new Map<string, any>();
    static getErrors = new Map<string, any>();
    static putErrors = new Map<string, any>();
    static delErrors = new Map<string, any>();

    constructor(..._args: any[]) {}

    async open() {}
    async close() {}

    async get(key: string) {
      if (FakeLevel.getErrors.has(key)) {
        throw FakeLevel.getErrors.get(key);
      }
      if (!FakeLevel.store.has(key)) {
        const err: any = new Error('not found');
        err.code = 'LEVEL_NOT_FOUND';
        throw err;
      }
      return FakeLevel.store.get(key);
    }

    async put(key: string, value: any) {
      if (FakeLevel.putErrors.has(key)) {
        throw FakeLevel.putErrors.get(key);
      }
      FakeLevel.store.set(key, value);
    }

    async del(key: string) {
      if (FakeLevel.delErrors.has(key)) {
        throw FakeLevel.delErrors.get(key);
      }
      FakeLevel.store.delete(key);
    }
  }

  return {
    Level: FakeLevel,
  };
});

describe('common/db', () => {
  let baselineExitListeners = 0;

  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    baselineExitListeners = process.listeners('exit').length;

    const { Level } = jest.requireMock('level');
    Level.store.clear();
    Level.getErrors.clear();
    Level.putErrors.clear();
    Level.delErrors.clear();
  });

  afterEach(() => {
    jest.useRealTimers();

    const listeners = process.listeners('exit');
    const addedListeners = listeners.slice(baselineExitListeners);
    for (const listener of addedListeners) {
      process.removeListener('exit', listener);
    }
  });

  it('exports public API from index.ts', async () => {
    const pkg = await import('../index');

    expect(typeof pkg.findOne).toBe('function');
    expect(typeof pkg.findMany).toBe('function');
    expect(typeof pkg.insertOne).toBe('function');
    expect(typeof pkg.updateOne).toBe('function');
    expect(typeof pkg.deleteOne).toBe('function');
    expect(typeof pkg.closeDatabase).toBe('function');
    expect(typeof pkg.closeAllDatabases).toBe('function');
  });

  it('validates required args', async () => {
    const db = await import('../db');

    await expect(db.findMany('', 'devices:discovered')).rejects.toThrow('Database name must be provided.');
    await expect(db.findOne('pluto_core', '', 'aa')).rejects.toThrow('Prefix and key must be provided.');
    await expect(db.deleteOne('pluto_core', '', 'aa')).rejects.toThrow('List key and object key must be provided.');
  });

  it('registers exit handler and closes all dbs', async () => {
    const db = await import('../db');

    const { Level } = jest.requireMock('level');
    const closeSpy = jest.spyOn(Level.prototype, 'close');

    // Ensure the no-op branch is covered as well.
    await db.closeDatabase('missing');

    await db.insertOne<any>('db1', 'devices:discovered', 'aa', { ip: '1.2.3.4' });
    await db.insertOne<any>('db2', 'devices:discovered', 'bb', { ip: '5.6.7.8' });

    // The module registers an exit handler only once.
    const exitListeners = process.listeners('exit').slice(baselineExitListeners);
    expect(exitListeners).toHaveLength(1);

    await (exitListeners[0] as any)();
    expect(closeSpy).toHaveBeenCalledTimes(2);
  });

  it('insertOne creates list and record with timestamps', async () => {
    const db = await import('../db');

    const record = await db.insertOne<any>('pluto_core', 'devices:discovered', 'aa', { ip: '1.2.3.4' });

    expect(record).toMatchObject({
      ip: '1.2.3.4',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    const { Level } = jest.requireMock('level');
    expect(Level.store.get('devices:discovered')).toEqual(['aa']);
    expect(Level.store.get('devices:discovered:aa')).toMatchObject({ ip: '1.2.3.4' });
  });

  it('updateOne merges and preserves createdAt', async () => {
    const db = await import('../db');

    await db.insertOne<any>('pluto_core', 'devices:discovered', 'aa', { ip: '1.2.3.4' });

    jest.setSystemTime(new Date('2026-01-01T00:10:00.000Z'));

    const updated = await db.updateOne<any>('pluto_core', 'devices:discovered', 'aa', { ip: '5.6.7.8' });

    expect(updated.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(updated.updatedAt).toBe('2026-01-01T00:10:00.000Z');
    expect((updated as any).ip).toBe('5.6.7.8');
  });

  it('findMany returns sorted objects and applies filters', async () => {
    const db = await import('../db');

    // insertOne overwrites createdAt/updatedAt with current time, so we set time between inserts.
    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    await db.insertOne<any>('pluto_core', 'devices:discovered', 'a', { ip: '1.1.1.1' });

    jest.setSystemTime(new Date('2026-01-02T00:00:00.000Z'));
    await db.insertOne<any>('pluto_core', 'devices:discovered', 'b', { ip: '2.2.2.2' });

    const out = await db.findMany('pluto_core', 'devices:discovered');
    expect(out).toHaveLength(2);
    expect(out[0].createdAt).toBe('2026-01-02T00:00:00.000Z');
    expect(out[1].createdAt).toBe('2026-01-01T00:00:00.000Z');

    const filtered = await db.findMany('pluto_core', 'devices:discovered', (r: any) =>
      r.createdAt?.includes('2026-01-02')
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0].createdAt).toBe('2026-01-02T00:00:00.000Z');
  });

  it('findOne returns null on missing record', async () => {
    const db = await import('../db');
    await expect(db.findOne('pluto_core', 'devices:discovered', 'missing')).resolves.toBeNull();
  });

  it('findOne logs and rethrows on unexpected errors', async () => {
    const db = await import('../db');
    const { Level } = jest.requireMock('level');

    const err: any = new Error('boom');
    err.code = 'LEVEL_CORRUPTION';
    Level.getErrors.set('devices:discovered:aa', err);

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(db.findOne('pluto_core', 'devices:discovered', 'aa')).rejects.toThrow('boom');
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('findOne logs and rethrows on non-Error throws', async () => {
    const db = await import('../db');
    const { Level } = jest.requireMock('level');

    Level.getErrors.set('devices:discovered:aa', { code: 'WAT' });

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(db.findOne('pluto_core', 'devices:discovered', 'aa')).rejects.toEqual({ code: 'WAT' });
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('findMany returns [] when list key does not exist', async () => {
    const db = await import('../db');
    await expect(db.findMany('pluto_core', 'missing:list')).resolves.toEqual([]);
  });

  it('findMany warns on missing items and logs on item read errors', async () => {
    const db = await import('../db');
    const { Level } = jest.requireMock('level');

    // List includes one existing item and one missing item.
    Level.store.set('devices:discovered', ['ok', 'missing', 'bad']);
    Level.store.set('devices:discovered:ok', { createdAt: '2026-01-01T00:00:00.000Z' });

    const badErr: any = new Error('bad read');
    badErr.code = 'EIO';
    Level.getErrors.set('devices:discovered:bad', badErr);

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const out = await db.findMany('pluto_core', 'devices:discovered');
    expect(out).toHaveLength(1);

    expect(warnSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('findMany logs and rethrows on list read errors', async () => {
    const db = await import('../db');
    const { Level } = jest.requireMock('level');

    const err: any = new Error('list read failed');
    err.code = 'EACCES';
    Level.getErrors.set('devices:discovered', err);

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(db.findMany('pluto_core', 'devices:discovered')).rejects.toThrow('list read failed');
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('findMany logs and rethrows on non-Error list read throws', async () => {
    const db = await import('../db');
    const { Level } = jest.requireMock('level');

    Level.getErrors.set('devices:discovered', { code: '???' });

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(db.findMany('pluto_core', 'devices:discovered')).rejects.toEqual({ code: '???' });
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('insertOne throws if record already exists', async () => {
    const db = await import('../db');
    await db.insertOne<any>('pluto_core', 'devices:discovered', 'aa', { ip: '1.2.3.4' });
    await expect(
      db.insertOne<any>('pluto_core', 'devices:discovered', 'aa', { ip: '1.2.3.4' })
    ).rejects.toThrow('already exists');
  });

  it('insertOne does not duplicate keys already present in list', async () => {
    const db = await import('../db');
    const { Level } = jest.requireMock('level');

    Level.store.set('devices:discovered', ['aa']);
    await db.insertOne<any>('pluto_core', 'devices:discovered', 'aa', { ip: '1.2.3.4' });
    expect(Level.store.get('devices:discovered')).toEqual(['aa']);
  });

  it('insertOne rethrows list read errors and logs write errors', async () => {
    const db = await import('../db');
    const { Level } = jest.requireMock('level');

    const listErr: any = new Error('list get failed');
    listErr.code = 'EACCES';
    Level.getErrors.set('devices:discovered', listErr);
    await expect(
      db.insertOne<any>('pluto_core', 'devices:discovered', 'aa', { ip: '1.2.3.4' })
    ).rejects.toThrow('list get failed');

    Level.getErrors.delete('devices:discovered');

    const putErr = new Error('put failed');
    Level.putErrors.set('devices:discovered:bb', putErr);

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(
      db.insertOne<any>('pluto_core', 'devices:discovered', 'bb', { ip: '5.6.7.8' })
    ).rejects.toThrow('put failed');
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('updateOne creates list+record when missing and handles findOne errors', async () => {
    const db = await import('../db');
    const { Level } = jest.requireMock('level');

    const created = await db.updateOne<any>('pluto_core', 'devices:discovered', 'aa', { ip: '1.2.3.4' });
    expect(created.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(created.updatedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(Level.store.get('devices:discovered')).toEqual(['aa']);

    // Simulate findOne throwing a non-Error with LEVEL_NOT_FOUND.
    Level.getErrors.set('devices:other:bb', { code: 'LEVEL_NOT_FOUND' });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const created2 = await db.updateOne<any>('pluto_core', 'devices:other', 'bb', { ip: '5.6.7.8' });
    expect(created2.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();

    // Simulate findOne throwing an Error with a non-LEVEL_NOT_FOUND code.
    const badErr: any = new Error('read busted');
    badErr.code = 'EIO';
    Level.getErrors.set('devices:third:cc', badErr);

    const errorSpy2 = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(db.updateOne<any>('pluto_core', 'devices:third', 'cc', { ip: '9.9.9.9' })).rejects.toThrow('read busted');
    errorSpy2.mockRestore();
  });

  it('updateOne rethrows list read errors', async () => {
    const db = await import('../db');
    const { Level } = jest.requireMock('level');

    const listErr: any = new Error('list read denied');
    listErr.code = 'EACCES';
    Level.getErrors.set('devices:discovered', listErr);

    await expect(db.updateOne<any>('pluto_core', 'devices:discovered', 'aa', { ip: '1.2.3.4' })).rejects.toThrow(
      'list read denied'
    );
  });

  it('updateOne logs and rethrows on write errors', async () => {
    const db = await import('../db');
    const { Level } = jest.requireMock('level');

    const putErr = new Error('update put failed');
    Level.putErrors.set('devices:discovered:aa', putErr);

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(
      db.updateOne<any>('pluto_core', 'devices:discovered', 'aa', { ip: '1.2.3.4' })
    ).rejects.toThrow('update put failed');
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('deleteOne deletes record and updates list', async () => {
    const db = await import('../db');
    const { Level } = jest.requireMock('level');

    await db.insertOne<any>('pluto_core', 'devices:discovered', 'aa', { ip: '1.2.3.4' });
    await db.insertOne<any>('pluto_core', 'devices:discovered', 'bb', { ip: '5.6.7.8' });

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const deleted = await db.deleteOne<any>('pluto_core', 'devices:discovered', 'aa');
    expect(deleted).toMatchObject({ ip: '1.2.3.4' });
    expect(Level.store.get('devices:discovered')).toEqual(['bb']);
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('deleteOne returns null when record does not exist', async () => {
    const db = await import('../db');
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(db.deleteOne('pluto_core', 'devices:discovered', 'missing')).resolves.toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('deleteOne returns record even if list is missing', async () => {
    const db = await import('../db');
    const { Level } = jest.requireMock('level');

    // Create the record but not the list key.
    Level.store.set('devices:discovered:aa', { ip: '1.2.3.4' });

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const deleted = await db.deleteOne<any>('pluto_core', 'devices:discovered', 'aa');
    expect(deleted).toEqual({ ip: '1.2.3.4' });
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('deleteOne rethrows list get errors and logs unexpected delete errors', async () => {
    const db = await import('../db');
    const { Level } = jest.requireMock('level');

    Level.store.set('devices:discovered:aa', { ip: '1.2.3.4' });

    const listErr: any = new Error('list get denied');
    listErr.code = 'EACCES';
    Level.getErrors.set('devices:discovered', listErr);

    const errorSpy0 = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(db.deleteOne<any>('pluto_core', 'devices:discovered', 'aa')).rejects.toThrow('list get denied');
    errorSpy0.mockRestore();

    Level.getErrors.delete('devices:discovered');
    Level.store.set('devices:discovered:bb', { ip: '5.6.7.8' });
    Level.store.set('devices:discovered', ['bb']);

    const delErr = new Error('del failed');
    Level.delErrors.set('devices:discovered:bb', delErr);

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(db.deleteOne<any>('pluto_core', 'devices:discovered', 'bb')).rejects.toThrow('del failed');
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('stub methods throw not implemented', async () => {
    const db = await import('../db');

    await expect(db.insertMany('pluto_core', [])).rejects.toThrow('not implemented');
    await expect(db.updateMany('pluto_core', {}, {})).rejects.toThrow('not implemented');
    await expect(db.deleteMany('pluto_core', {})).rejects.toThrow('not implemented');
    await expect(db.countDocuments('pluto_core', {})).rejects.toThrow('not implemented');
    await expect(db.distinct('pluto_core', 'createdAt')).rejects.toThrow('not implemented');
  });
});
