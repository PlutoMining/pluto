import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import OverviewClient from '@/app/(static)/OverviewClient';

jest.mock('@/providers/SocketProvider', () => ({
  __esModule: true,
  useSocket: jest.fn(),
}));
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
  LineChartCard: ({ title, unit, points }: any) => (
    <div data-testid="line-chart" data-title={title} data-unit={unit} data-points={points?.length ?? 0}>
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
  TreemapChartCard: ({ title, data, renderTooltip }: any) => (
    <div data-testid="treemap">
      <div>{title}</div>
      <div data-testid="treemap-versions">{(data || []).map((d: any) => d.version).join(',')}</div>
      {renderTooltip ? <div data-testid="treemap-tooltip">{renderTooltip({ version: 'v1', count: 1 })}</div> : null}
    </div>
  ),
}));

jest.mock('@/components/charts/TimeRangeSelect', () => ({
  __esModule: true,
  TimeRangeSelect: ({ value, onChange }: any) => (
    <div>
      <button type="button" data-testid="time-range" onClick={() => onChange('not-a-range')}>
        {value}
      </button>
      <button type="button" data-testid="range-6h" onClick={() => onChange('6h')}>
        6h
      </button>
      <button type="button" data-testid="range-24h" onClick={() => onChange('24h')}>
        24h
      </button>
      <button type="button" data-testid="range-7d" onClick={() => onChange('7d')}>
        7d
      </button>
    </div>
  ),
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
const socketProvider = jest.requireMock('@/providers/SocketProvider') as { useSocket: jest.Mock };
const prom = jest.requireMock('@/lib/prometheus') as {
  promQuery: jest.Mock;
  promQueryRange: jest.Mock;
  rangeToQueryParams: jest.Mock;
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

function matrixNoSeries() {
  return {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: [],
    },
  };
}

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
  });
  await act(async () => {
    await Promise.resolve();
  });
}

async function waitForAnyLineChartPoints() {
  await waitFor(() => {
    const charts = screen.getAllByTestId('line-chart');
    expect(Math.max(...charts.map((c) => Number(c.getAttribute('data-points') ?? '0')))).toBeGreaterThan(0);
  });
}

describe('OverviewClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    socketProvider.useSocket.mockReturnValue({
      isConnected: false,
      socket: { on: jest.fn(), off: jest.fn() },
    });
  });

  it('renders NoDeviceAddedSection when no devices are present', async () => {
    axios.get.mockResolvedValue({ data: { data: [] } });

    prom.promQuery.mockResolvedValue(vector(0));
    prom.promQueryRange.mockResolvedValue(matrix([]));

    render(<OverviewClient />);

    await flushEffects();

    expect(screen.getByText('Overview Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Start using Pluto adding your first device')).toBeInTheDocument();
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

    await waitForAnyLineChartPoints();

    const efficiencyChart = screen
      .getAllByTestId('line-chart')
      .find((el) => el.getAttribute('data-title') === 'Total efficiency');
    expect(efficiencyChart).toBeTruthy();
    expect(efficiencyChart?.getAttribute('data-unit')).toBe('J/TH');

    expect(screen.getByText('Shares by pool')).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart')).toHaveTextContent('Pool');
    expect(screen.getByTestId('pie-chart')).toHaveTextContent('Ocean Main');
  });

  it('subscribes to socket updates when connected and updates online/offline KPIs', async () => {
    const socket = {
      on: jest.fn(),
      off: jest.fn(),
    };

    socketProvider.useSocket.mockReturnValue({ isConnected: true, socket });

    let resolveDevices: ((value: any) => void) | undefined;
    axios.get.mockReturnValue(
      new Promise((resolve) => {
        resolveDevices = resolve;
      })
    );

    prom.promQuery.mockImplementation((query: string) => {
      switch (query) {
        case 'total_hardware':
          return Promise.resolve(vector(2));
        case 'hardware_online':
          return Promise.resolve(vector(2));
        case 'hardware_offline':
          return Promise.resolve(vector(0));
        default:
          return Promise.resolve(vector(0));
      }
    });
    prom.promQueryRange.mockResolvedValue(matrix([[1, 1]]));

    const { unmount } = render(<OverviewClient />);

    const listener = socket.on.mock.calls.find((c) => c[0] === 'stat_update')?.[1];
    expect(typeof listener).toBe('function');

    // Covers the "no devices yet" branch in the socket listener.
    await act(async () => {
      listener({ mac: 'xx', tracing: false, info: { hostname: 'x' } });
    });

    expect(resolveDevices).toBeTruthy();
    resolveDevices!({
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
            tracing: true,
            info: { hostname: 'rig-2', bestDiff: '2', bestSessionDiff: '2', power: 1 },
          },
        ],
      },
    });

    await screen.findByText('Total hardware');

    await waitForAnyLineChartPoints();

    const offlineCard = screen.getByText('Offline').closest('.rounded-none');
    expect(offlineCard).toBeTruthy();
    expect(within(offlineCard as HTMLElement).getByText('0')).toBeInTheDocument();

    // Covers idx === -1 branch
    await act(async () => {
      listener({ mac: 'cc', tracing: false, info: { hostname: 'unknown' } });
    });

    // Update one device to offline.
    await act(async () => {
      listener({ mac: 'aa', tracing: false, info: { hostname: 'rig-1' } });
    });

    await waitFor(() => {
      expect(within(offlineCard as HTMLElement).getByText('1')).toBeInTheDocument();
    });

    await flushEffects();

    unmount();
    expect(socket.off).toHaveBeenCalled();
  });
  it('logs when device discovery fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    axios.get.mockRejectedValueOnce(new Error('fail'));
    prom.promQuery.mockResolvedValue(vector(0));
    prom.promQueryRange.mockResolvedValue(matrix([]));

    render(<OverviewClient />);

    await flushEffects();

    expect(screen.getByText('Overview Dashboard')).toBeInTheDocument();

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error discovering devices:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('groups long pool lists and collapses firmware into Other', async () => {
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
        ],
      },
    });

    const firmwareVector = Array.from({ length: 13 }).map((_, i) => ({
      metric: { version: `v${i + 1}` },
      value: [1, '1'],
    }));

    const acceptedPools = Array.from({ length: 9 }).map((_, i) => ({
      metric: { pool: `pool-${i + 1}` },
      value: [1, String(i + 1)],
    }));

    prom.promQuery.mockImplementation((query: string) => {
      switch (query) {
        case 'total_hardware':
        case 'hardware_online':
        case 'hardware_offline':
        case 'total_hashrate':
        case 'total_power_watts':
        case 'total_efficiency':
          return Promise.resolve(vector(1));
        case 'sum by (version) (firmware_version_distribution)':
          return Promise.resolve({ status: 'success', data: { resultType: 'vector', result: firmwareVector } });
        case 'sum by (pool) (shares_by_pool_accepted{pool!=""})':
          return Promise.resolve({ status: 'success', data: { resultType: 'vector', result: acceptedPools } });
        case 'sum by (pool) (shares_by_pool_rejected{pool!=""})':
          return Promise.resolve({
            status: 'success',
            data: {
              resultType: 'vector',
              result: [{ metric: { pool: 'rejected-only' }, value: [1, '2'] }],
            },
          });
        default:
          return Promise.resolve(vector(0));
      }
    });

    prom.promQueryRange.mockResolvedValue(matrix([[1, 1]]));

    render(<OverviewClient />);

    await waitForAnyLineChartPoints();

    expect(await screen.findByText('Shares by pool')).toBeInTheDocument();
    expect(screen.getAllByTestId('pie-chart').length).toBeGreaterThan(1);
    expect(screen.getByText('Other')).toBeInTheDocument();

    const versions = await screen.findByTestId('treemap-versions');
    expect(versions.textContent).toContain('Other');

    expect(await screen.findByTestId('treemap-tooltip')).toHaveTextContent('Share:');
  });

  it('falls back to 3600s for unknown range and formats Infinity as dash', async () => {
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
        ],
      },
    });

    prom.promQuery.mockImplementation((query: string) => {
      switch (query) {
        case 'total_hardware':
          return Promise.resolve(vector(Number.POSITIVE_INFINITY));
        case 'sum by (version) (firmware_version_distribution)':
          return Promise.resolve({
            status: 'success',
            data: {
              resultType: 'vector',
              result: [{ metric: {}, value: [1, '2'] }],
            },
          });
        case 'sum by (pool) (shares_by_pool_accepted{pool!=""})':
        case 'sum by (pool) (shares_by_pool_rejected{pool!=""})':
          return Promise.resolve({ status: 'success', data: { resultType: 'vector', result: [] } });
        default:
          return Promise.resolve(vector(0));
      }
    });

    prom.promQueryRange.mockResolvedValue(matrixNoSeries());

    render(<OverviewClient />);
    expect(await screen.findByText('Total hardware')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('time-range'));

    await waitFor(() => {
      const lastCall = prom.rangeToQueryParams.mock.calls.at(-1);
      expect(lastCall?.[0]).toBe(3600);
    });

    await waitFor(() => {
      expect(screen.getByTestId('treemap-versions')).toHaveTextContent('unknown');
    });
  });

  it('shows 0% firmware share when firmwareTotal is 0', async () => {
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
        ],
      },
    });

    prom.promQuery.mockImplementation((query: string) => {
      switch (query) {
        case 'total_hardware':
        case 'hardware_online':
        case 'hardware_offline':
        case 'total_hashrate':
        case 'total_power_watts':
        case 'total_efficiency':
          return Promise.resolve(vector(1));
        case 'sum by (version) (firmware_version_distribution)':
          return Promise.resolve({
            status: 'success',
            data: {
              resultType: 'vector',
              result: [{ metric: { version: 'bad' }, value: [1, 'NaN'] }],
            },
          });
        case 'sum by (pool) (shares_by_pool_accepted{pool!=""})':
        case 'sum by (pool) (shares_by_pool_rejected{pool!=""})':
          return Promise.resolve({ status: 'success', data: { resultType: 'vector', result: [] } });
        default:
          return Promise.resolve(vector(0));
      }
    });

    prom.promQueryRange.mockResolvedValue(matrix([[1, 1]]));

    render(<OverviewClient />);

    await waitForAnyLineChartPoints();

    const tooltip = await screen.findByTestId('treemap-tooltip');
    expect(tooltip).toHaveTextContent('0.0%');
  });

  it('logs load errors via load().catch', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

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
        ],
      },
    });
    prom.promQuery.mockRejectedValueOnce(new Error('prom-fail'));
    prom.promQueryRange.mockResolvedValue(matrix([[1, 1]]));

    render(<OverviewClient />);

    await screen.findByText('Total hardware');

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('updates auto refresh interval when time range changes', async () => {
    const originalVisibilityState = document.visibilityState;
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });

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
        ],
      },
    });

    prom.promQuery.mockResolvedValue(vector(0));
    prom.promQueryRange.mockResolvedValue(matrixNoSeries());

    try {
      render(<OverviewClient />);
      await screen.findByText('Total hardware');

      expect(screen.getByRole('button', { name: 'Auto (15s)' })).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('range-6h'));
      expect(screen.getByRole('button', { name: 'Auto (30s)' })).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('range-24h'));
      expect(screen.getByRole('button', { name: 'Auto (60s)' })).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('range-7d'));
      expect(screen.getByRole('button', { name: 'Auto (5m)' })).toBeInTheDocument();
    } finally {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: originalVisibilityState });
    }
  });

  it('skips polling when hidden', async () => {
    const originalVisibilityState = document.visibilityState;
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });

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
        ],
      },
    });
    prom.promQuery.mockResolvedValue(vector(0));
    prom.promQueryRange.mockResolvedValue(matrixNoSeries());

    try {
      render(<OverviewClient />);

      await screen.findByText('Total hardware');
      expect(prom.promQuery).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: originalVisibilityState });
    }
  });
});
