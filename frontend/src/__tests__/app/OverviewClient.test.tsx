import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

import OverviewClient from '@/app/(static)/OverviewClient';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

jest.mock('@/components/charts/DeviceHeatmapCard', () => ({
  __esModule: true,
  DeviceHeatmapCard: ({ title }: any) => <div data-testid="device-heatmap">{title}</div>,
}));

jest.mock('@/components/charts/LineChartCard', () => ({
  __esModule: true,
  LineChartCard: ({ title, unit }: any) => (
    <div data-testid="line-chart" data-title={title} data-unit={unit}>
      {title}
    </div>
  ),
}));

jest.mock('@/components/charts/PieChartCard', () => ({
  __esModule: true,
  PieChartCard: ({ title, centerLabelTitle, centerLabel }: any) => (
    <div data-testid="pie-chart" data-title={title}>
      <div>{centerLabelTitle}</div>
      <div>{centerLabel}</div>
    </div>
  ),
}));

jest.mock('@/components/charts/TreemapChartCard', () => ({
  __esModule: true,
  TreemapChartCard: ({ title }: any) => <div data-testid="treemap">{title}</div>,
}));

jest.mock('@/components/charts/TimeRangeSelect', () => ({
  __esModule: true,
  TimeRangeSelect: ({ value }: any) => <div data-testid="time-range">{value}</div>,
}));

jest.mock('@/lib/prometheus', () => {
  const actual = jest.requireActual('@/lib/prometheus');
  return {
    ...actual,
    promQuery: jest.fn(),
    promQueryRange: jest.fn(),
    rangeToQueryParams: jest.fn(() => ({ start: 1, end: 2, step: '15s' })),
  };
});

const axios = jest.requireMock('axios').default as { get: jest.Mock };
const prom = jest.requireMock('@/lib/prometheus') as {
  promQuery: jest.Mock;
  promQueryRange: jest.Mock;
};

function vector(value: number) {
  return { status: 'success', data: { resultType: 'vector', result: [{ metric: {}, value: [1, String(value)] }] } };
}

function matrix(points: Array<[number, number]>) {
  return {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: [
        {
          metric: {},
          values: points.map(([t, v]) => [t, String(v)]),
        },
      ],
    },
  };
}

describe('OverviewClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders NoDeviceAddedSection when no devices are present', async () => {
    axios.get.mockResolvedValue({ data: { data: [] } });

    prom.promQuery.mockResolvedValue(vector(0));
    prom.promQueryRange.mockResolvedValue(matrix([]));

    render(<OverviewClient />);

    expect(await screen.findByText('Overview Dashboard')).toBeInTheDocument();
    expect(await screen.findByText('Start using Pluto adding your first device')).toBeInTheDocument();
  });

  it('renders KPIs and uses J/TH for efficiency charts', async () => {
    axios.get.mockResolvedValue({
      data: {
        data: [
          {
            mac: 'aa',
            ip: '1.1.1.1',
            type: 'rig',
            tracing: true,
            info: { hostname: 'rig-1', bestDiff: '1', bestSessionDiff: '1', power: 1 },
          },
          {
            mac: 'bb',
            ip: '1.1.1.2',
            type: 'rig',
            tracing: false,
            info: { hostname: 'rig-2', bestDiff: '2', bestSessionDiff: '2', power: 1 },
          },
        ],
      },
    });

    prom.promQuery.mockImplementation((query: string) => {
      switch (query) {
        case 'total_hardware':
          return Promise.resolve(vector(2));
        case 'hardware_online':
          return Promise.resolve(vector(1));
        case 'hardware_offline':
          return Promise.resolve(vector(1));
        case 'total_hashrate':
          return Promise.resolve(vector(123));
        case 'total_power_watts':
          return Promise.resolve(vector(456));
        case 'total_efficiency':
          return Promise.resolve(vector(18));
        case 'sum by (version) (firmware_version_distribution)':
          return Promise.resolve({
            status: 'success',
            data: {
              resultType: 'vector',
              result: [{ metric: { version: 'v1' }, value: [1, '2'] }],
            },
          });
        case 'sum by (pool) (shares_by_pool_accepted{pool!=""})':
          return Promise.resolve({
            status: 'success',
            data: {
              resultType: 'vector',
              result: [{ metric: { pool: 'Ocean Main' }, value: [1, '10'] }],
            },
          });
        case 'sum by (pool) (shares_by_pool_rejected{pool!=""})':
          return Promise.resolve({
            status: 'success',
            data: {
              resultType: 'vector',
              result: [{ metric: { pool: 'Ocean Main' }, value: [1, '1'] }],
            },
          });
        default:
          return Promise.resolve(vector(0));
      }
    });

    prom.promQueryRange.mockResolvedValue(matrix([[1, 1]]));

    render(<OverviewClient />);

    expect(await screen.findByText('Total hardware')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByTestId('line-chart').length).toBeGreaterThan(0);
    });

    const efficiencyChart = screen
      .getAllByTestId('line-chart')
      .find((el) => el.getAttribute('data-title') === 'Total efficiency');
    expect(efficiencyChart).toBeTruthy();
    expect(efficiencyChart?.getAttribute('data-unit')).toBe('J/TH');

    expect(screen.getByText('Shares by pool')).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart')).toHaveTextContent('Pool');
    expect(screen.getByTestId('pie-chart')).toHaveTextContent('Ocean Main');
  });
});

