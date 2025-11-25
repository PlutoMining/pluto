import type { Request, Response } from 'express';
import * as dashboardsController from '@/controllers/dashboards.controller';

jest.mock('fs/promises', () => ({
  readdir: jest.fn(),
  readFile: jest.fn(),
}));
jest.mock('@/services/grafana.service', () => ({
  publishDashboard: jest.fn(),
}));

const fs = jest.requireMock('fs/promises');
const grafanaService = jest.requireMock('@/services/grafana.service');

type MockResponse = Response & {
  status: jest.Mock;
  json: jest.Mock;
};

const mockRes = () =>
  ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  }) as unknown as MockResponse;

describe('dashboards.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns enriched dashboards', async () => {
    const req = {} as Request;
    const res = mockRes();
    fs.readdir.mockResolvedValue(['a.json', 'ignore.txt']);
    fs.readFile.mockResolvedValue(JSON.stringify({ uid: 'abc' }));
    grafanaService.publishDashboard.mockResolvedValue({ accessToken: 'token' });

    await dashboardsController.getDashboards(req, res);

    expect(grafanaService.publishDashboard).toHaveBeenCalledWith('abc');
    expect(res.status).toHaveBeenCalledWith(200);
    const response = res.json.mock.calls[0][0];
    expect(response[0]).toMatchObject({
      name: 'a',
      uid: 'abc',
      grafanaData: { accessToken: 'token' },
      publicUrl: '/grafana/public-dashboards/token?orgId=1',
    });
  });

  it('skips files that fail to parse and keeps others', async () => {
    const req = {} as Request;
    const res = mockRes();
    fs.readdir.mockResolvedValue(['bad.json']);
    fs.readFile.mockRejectedValue(new Error('bad'));

    grafanaService.publishDashboard.mockResolvedValue({ accessToken: 'token' });

    await dashboardsController.getDashboards(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  it('handles directory read errors', async () => {
    const req = {} as Request;
    const res = mockRes();
    fs.readdir.mockRejectedValue(new Error('fail'));

    await dashboardsController.getDashboards(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to read dashboard files' });
  });
});

