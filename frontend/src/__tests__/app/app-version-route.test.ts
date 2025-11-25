import fs from 'fs';
import yaml from 'js-yaml';
import { GET } from '@/app/api/app-version/route';

jest.mock('next/server', () => {
  const jsonMock = jest.fn((payload) => ({
    json: () => Promise.resolve(payload),
  }));

  return {
    __esModule: true,
    NextResponse: {
      json: jsonMock,
    },
    NextRequest: class {},
    jsonMock,
  };
});

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
  },
}));

jest.mock('js-yaml', () => ({
  load: jest.fn(),
}));

describe('GET /api/app-version', () => {
  it('responds with parsed yaml contents', async () => {
    const mockData = { name: 'pluto', version: '1.0.0' };
    (fs.promises.readFile as jest.Mock).mockResolvedValue('raw');
    (yaml.load as jest.Mock).mockReturnValue(mockData);
    const { jsonMock } = jest.requireMock('next/server');

    const response = await GET({} as any);
    expect(fs.promises.readFile).toHaveBeenCalledWith('/tmp/umbrel-app.yml', 'utf-8');
    expect(yaml.load).toHaveBeenCalledWith('raw');
    expect(jsonMock).toHaveBeenCalledWith(mockData);
    expect(await response.json()).toEqual(mockData);
  });
});

