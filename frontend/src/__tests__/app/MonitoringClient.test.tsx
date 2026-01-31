import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';

import MonitoringClient from '@/app/(realtime)/monitoring/[id]/MonitoringClient';
import { createPyasicMinerInfoFixture } from '../fixtures/pyasic-miner-info.fixture';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

jest.mock('@/providers/SocketProvider', () => ({
  __esModule: true,
  useSocket: jest.fn(),
}));

jest.mock('@/components/charts/LineChartCard', () => ({
  __esModule: true,
  LineChartCard: ({ title, unit, points }: any) => (
    <div data-testid="line-chart" data-title={title} data-unit={unit} data-points={points?.length ?? 0}>
      {title}
    </div>
  ),
}));

jest.mock('@/components/charts/MultiLineChartCard', () => ({
  __esModule: true,
  MultiLineChartCard: ({ title, series }: any) => (
    <div data-testid="multi-line" data-title={title} data-series={series?.length ?? 0}>
      {title}
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
    promQueryRange: jest.fn(),
    rangeToQueryParams: jest.fn(() => ({ start: 1, end: 2, step: '15s' })),
    matrixToSeries: jest.fn(() => [{ metric: {}, points: [{ t: 1, v: 1 }] }]),
  };
});

const axios = jest.requireMock('axios').default as { get: jest.Mock };
const prom = jest.requireMock('@/lib/prometheus') as {
  promQueryRange: jest.Mock;
  matrixToSeries: jest.Mock;
  rangeToQueryParams: jest.Mock;
};
const socketProvider = jest.requireMock('@/providers/SocketProvider') as { useSocket: jest.Mock };

function createSocket() {
  type SocketListener = (payload: any) => void;
  const listeners = new Map<string, SocketListener>();
  return {
    on: jest.fn((event: string, cb: SocketListener) => {
      listeners.set(event, cb);
    }),
    off: jest.fn((event: string) => {
      listeners.delete(event);
    }),
    emit: (event: string, payload: any) => {
      listeners.get(event)?.(payload);
    },
  };
}

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
  });
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: any) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('MonitoringClient', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    socketProvider.useSocket.mockReturnValue({ isConnected: false, socket: { on: jest.fn(), off: jest.fn() } });
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: false });
    // Default: keep Prometheus polling pending to avoid un-awaited state updates.
    prom.promQueryRange.mockImplementation(() => new Promise(() => {}));
  });

  it('renders placeholders before device data is loaded', async () => {
    const socket = createSocket();
    socketProvider.useSocket.mockReturnValueOnce({ isConnected: true, socket });
    axios.get.mockReturnValue(new Promise(() => {}));

    const view = render(<MonitoringClient id="rig-1" />);

    await flushEffects();

    expect(screen.getByText('rig-1 Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Pool preset')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();

    // Hashrate placeholder is a bare dash before data loads.
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);

    act(() => {
      screen.getByTestId('time-range').click();
    });
    expect(screen.getByTestId('time-range')).toHaveTextContent('not-a-range');

    await waitFor(() => {
      expect(socket.on).toHaveBeenCalled();
    });

    act(() => {
      socket.emit('stat_update', { mac: 'aa', tracing: true });
    });

    view.unmount();
    expect(socket.off).toHaveBeenCalled();
  });

  it('loads preset data and updates the device from socket events', async () => {
    const socket = createSocket();
    socketProvider.useSocket.mockReturnValue({ isConnected: true, socket });

    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ uuid: 'p1', name: 'Preset 1' }] }),
    });

    axios.get.mockResolvedValue({
      data: {
        data: [
          {
            mac: 'aa',
            ip: '1.1.1.1',
            type: 'rig',
            tracing: false,
            presetUuid: 'p1',
            info: {
              ...createPyasicMinerInfoFixture(),
              hostname: 'rig-1',
              hashrate: { unit: { value: 1000000000, suffix: 'Gh/s' }, rate: 11 },
              shares_accepted: 1,
              shares_rejected: 2,
              best_difficulty: '1',
              best_session_difficulty: '1',
              uptime: 60,
              wattage: 100,
              temperature_avg: 50,
              hashboards: [{ slot: 0, hashrate: { unit: { value: 1000000000, suffix: 'Gh/s' }, rate: 0 }, temp: 55, chip_temp: null, chips: 1, expected_chips: 1, serial_number: null, missing: false, tuned: null, active: true, voltage: null, inlet_temp: null, outlet_temp: null }],
            },
          },
        ],
      },
    });

    const view = render(<MonitoringClient id="rig-1" />);

    await flushEffects();

    expect(await screen.findByText('Preset 1')).toBeInTheDocument();
    expect(screen.getByText('offline')).toBeInTheDocument();

    act(() => {
      socket.emit('stat_update', { mac: 'bb', tracing: true });
    });
    expect(screen.getByText('offline')).toBeInTheDocument();

    act(() => {
      socket.emit('stat_update', { mac: 'aa', tracing: true, info: { hostname: 'rig-1' } });
    });
    expect(await screen.findByText('online')).toBeInTheDocument();

    await flushEffects();

    view.unmount();
    expect(socket.off).toHaveBeenCalledWith('stat_update', expect.any(Function));
    expect(socket.off).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('falls back to Custom when preset fetch fails', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: false });

    axios.get.mockResolvedValue({
      data: {
        data: [
          {
            mac: 'aa',
            ip: '1.1.1.1',
            type: 'rig',
            tracing: true,
            presetUuid: 'p1',
            info: { hostname: 'rig-1', bestDiff: '1', bestSessionDiff: '1', sharesAccepted: 0, sharesRejected: 0 },
          },
        ],
      },
    });

    render(<MonitoringClient id="rig-1" />);

    await flushEffects();
    expect(await screen.findByText('Custom')).toBeInTheDocument();
  });

  it('formats non-finite numbers as dashes', async () => {
    axios.get.mockResolvedValue({
      data: {
        data: [
          {
            mac: 'aa',
            ip: '1.1.1.1',
            type: 'rig',
            tracing: true,
            presetUuid: null,
            info: {
              hostname: 'rig-1',
              hashRate: Number.NaN,
              sharesAccepted: 0,
              sharesRejected: 0,
              bestDiff: '1',
              bestSessionDiff: '1',
              power: Number.POSITIVE_INFINITY,
              temp: Number.NaN,
              vrTemp: Number.NaN,
            },
          },
        ],
      },
    });

    render(<MonitoringClient id="rig-1" />);

    await flushEffects();

    expect(await screen.findByText('online')).toBeInTheDocument();
    // Hashrate shows a bare dash when no numeric value is available.
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
    expect(screen.getByText(/- W/)).toBeInTheDocument();
  });

  it('updates auto refresh interval when time range changes', async () => {
    axios.get.mockResolvedValue({ data: { data: [] } });

    render(<MonitoringClient id="rig-1" />);

    await flushEffects();

    expect(screen.getByRole('button', { name: 'Auto (15s)' })).toBeInTheDocument();

    act(() => {
      screen.getByTestId('range-6h').click();
    });
    expect(screen.getByRole('button', { name: 'Auto (30s)' })).toBeInTheDocument();

    act(() => {
      screen.getByTestId('range-24h').click();
    });
    expect(screen.getByRole('button', { name: 'Auto (60s)' })).toBeInTheDocument();

    act(() => {
      screen.getByTestId('range-7d').click();
    });
    expect(screen.getByRole('button', { name: 'Auto (5m)' })).toBeInTheDocument();
  });

  it('renders PSRAM heap values and skips polling when hidden', async () => {
    const originalVisibilityState = document.visibilityState;
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });

    try {
      axios.get.mockResolvedValue({
        data: {
          data: [
            {
              mac: 'aa',
              ip: '1.1.1.1',
              type: 'rig',
              tracing: true,
              presetUuid: null,
              info: {
                hostname: 'rig-1',
                hashRate: 10,
                sharesAccepted: 0,
                sharesRejected: 0,
                bestDiff: '1',
                bestSessionDiff: '1',
                isPSRAMAvailable: 1,
                freeHeapInternal: Number.POSITIVE_INFINITY,
                freeHeapSpiram: 2 * 1024 * 1024,
                config: { extra_config: { free_heap: 1 }, pools: { groups: [] } },
              },
            },
          ],
        },
      });

      render(<MonitoringClient id="rig-1" />);

      await flushEffects();

      expect(await screen.findByText('online')).toBeInTheDocument();
      expect(screen.getByText('Internal | PSRAM')).toBeInTheDocument();

      const heapValue = screen.getByText((content, element) => {
        return element?.tagName === 'P' && content.includes('2.00') && content.includes('MB');
      });
      expect(heapValue).toHaveTextContent(/-\s*MB/);
      expect(heapValue).toHaveTextContent(/2\.00\s*MB/);

      expect(prom.promQueryRange).not.toHaveBeenCalled();

      // Restore visibility and let the polling loop run once.
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
      await act(async () => {
        jest.advanceTimersByTime(15_000);
      });

      await waitFor(() => {
        expect(prom.promQueryRange).toHaveBeenCalled();
      });

      await flushEffects();
    } finally {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: originalVisibilityState });
    }
  });

  it('handles empty Prometheus series results', async () => {
    const deferred = createDeferred<{ status: string; data: any }>();
    prom.promQueryRange.mockImplementation(() => deferred.promise);

    prom.matrixToSeries.mockReturnValue([]);

    axios.get.mockResolvedValue({
      data: {
        data: [
          {
            mac: 'aa',
            ip: '1.1.1.1',
            type: 'rig',
            tracing: true,
            presetUuid: null,
            info: { hostname: 'rig-1', bestDiff: '1', bestSessionDiff: '1', sharesAccepted: 0, sharesRejected: 0 },
          },
        ],
      },
    });

    render(<MonitoringClient id="rig-1" />);

    await act(async () => {
      deferred.resolve({ status: 'success', data: { resultType: 'matrix', result: [] } });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(await screen.findByText('rig-1 Dashboard')).toBeInTheDocument();
    await waitFor(() => {
      expect(prom.matrixToSeries).toHaveBeenCalled();
    });
    expect(screen.getAllByTestId('line-chart').length).toBeGreaterThan(0);

    prom.matrixToSeries.mockReturnValue([{ metric: {}, points: [{ t: 1, v: 1 }] }]);
  });

  it('updates chart points when Prometheus resolves', async () => {
    const deferred = createDeferred<{ status: string; data: any }>();
    prom.promQueryRange.mockImplementation(() => deferred.promise);

    axios.get.mockResolvedValue({
      data: {
        data: [
          {
            mac: 'aa',
            ip: '1.1.1.1',
            type: 'rig',
            tracing: true,
            presetUuid: null,
            info: {
              hostname: 'rig-1',
              bestDiff: '1',
              bestSessionDiff: '1',
              sharesAccepted: 0,
              sharesRejected: 0,
              isPSRAMAvailable: 1,
              freeHeapInternal: 1024 * 1024,
              freeHeapSpiram: 2 * 1024 * 1024,
              config: { extra_config: { free_heap: 1 }, pools: { groups: [] } },
            },
          },
        ],
      },
    });

    render(<MonitoringClient id="rig-1" />);

    // Resolve all query_range calls in one go.
    await act(async () => {
      deferred.resolve({ status: 'success', data: { resultType: 'matrix', result: [] } });
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => {
      const charts = screen.getAllByTestId('line-chart');
      expect(Math.max(...charts.map((c) => Number(c.getAttribute('data-points') ?? '0')))).toBeGreaterThan(0);
    });

    await waitFor(() => {
      const heapChart = screen
        .getAllByTestId('multi-line')
        .find((el) => el.getAttribute('data-title') === 'Free heap');
      expect(heapChart).toBeTruthy();
      expect(heapChart).toHaveAttribute('data-series', '3');
    });
  });

  it('skips setting state when unmounted before Prometheus resolves', async () => {
    axios.get.mockResolvedValue({
      data: {
        data: [
          {
            mac: 'aa',
            ip: '1.1.1.1',
            type: 'rig',
            tracing: true,
            presetUuid: null,
            info: { hostname: 'rig-1', bestDiff: '1', bestSessionDiff: '1', sharesAccepted: 0, sharesRejected: 0 },
          },
        ],
      },
    });

    prom.matrixToSeries.mockClear();
    prom.promQueryRange.mockImplementation(() =>
      new Promise((resolve) => setTimeout(() => resolve({ status: 'success', data: { resultType: 'matrix', result: [] } }), 50))
    );

    const view = render(<MonitoringClient id="rig-1" />);
    view.unmount();

    await act(async () => {
      jest.advanceTimersByTime(60);
      await Promise.resolve();
    });

    expect(prom.matrixToSeries).not.toHaveBeenCalled();
  });

  it('ignores AbortError even when the signal is not aborted', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    axios.get.mockResolvedValue({
      data: {
        data: [
          {
            mac: 'aa',
            ip: '1.1.1.1',
            type: 'rig',
            tracing: true,
            presetUuid: null,
            info: { hostname: 'rig-1', bestDiff: '1', bestSessionDiff: '1', sharesAccepted: 0, sharesRejected: 0 },
          },
        ],
      },
    });

    prom.promQueryRange.mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'));

    render(<MonitoringClient id="rig-1" />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('logs errors from device discovery and Prometheus queries', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    axios.get.mockRejectedValueOnce(new Error('device-fail'));
    prom.promQueryRange.mockRejectedValueOnce(new Error('prom-fail'));

    render(<MonitoringClient id="rig-1" />);

    await flushEffects();

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error discovering devices:', expect.any(Error));
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('aborts in-flight Prometheus requests when navigating between devices', async () => {
    const abortedSignals: AbortSignal[] = [];

    prom.promQueryRange.mockImplementation((_query: string, _start: number, _end: number, _step: string, options?: any) => {
      const signal = options?.signal as AbortSignal | undefined;
      if (signal) abortedSignals.push(signal);

      return new Promise((resolve, reject) => {
        if (signal?.aborted) {
          reject(new DOMException('Aborted', 'AbortError'));
          return;
        }
        signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
        // Keep these promises in the error path so we don't trigger state updates while asserting abort behavior.
        setTimeout(() => reject(new DOMException('Aborted', 'AbortError')), 50);
      });
    });

    axios.get.mockResolvedValue({
      data: {
        data: [
          {
            mac: 'aa',
            ip: '1.1.1.1',
            type: 'rig',
            tracing: true,
            presetUuid: null,
            info: { hostname: 'rig-1', bestDiff: '1', bestSessionDiff: '1', sharesAccepted: 0, sharesRejected: 0 },
          },
        ],
      },
    });

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const view = render(<MonitoringClient id="rig-1" />);

    await act(async () => {
      jest.advanceTimersByTime(1);
      await Promise.resolve();
    });

    view.rerender(<MonitoringClient id="rig-2" />);

    await act(async () => {
      jest.advanceTimersByTime(1);
      await Promise.resolve();
    });

    expect(abortedSignals.length).toBeGreaterThan(0);
    expect(abortedSignals.some((s) => s.aborted)).toBe(true);

    await act(async () => {
      jest.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(consoleErrorSpy).not.toHaveBeenCalled();

    const efficiencyChart = screen
      .getAllByTestId('line-chart')
      .find((el) => el.getAttribute('data-title') === 'Efficiency');
    expect(efficiencyChart?.getAttribute('data-unit')).toBe('J/TH');

    consoleErrorSpy.mockRestore();
  });
});
