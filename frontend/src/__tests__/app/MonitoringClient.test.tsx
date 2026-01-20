import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';

import MonitoringClient from '@/app/(realtime)/monitoring/[id]/MonitoringClient';

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
  LineChartCard: ({ title, unit }: any) => (
    <div data-testid="line-chart" data-title={title} data-unit={unit}>
      {title}
    </div>
  ),
}));

jest.mock('@/components/charts/MultiLineChartCard', () => ({
  __esModule: true,
  MultiLineChartCard: ({ title }: any) => <div data-testid="multi-line">{title}</div>,
}));

jest.mock('@/components/charts/TimeRangeSelect', () => ({
  __esModule: true,
  TimeRangeSelect: ({ value, onChange }: any) => (
    <button type="button" data-testid="time-range" onClick={() => onChange('not-a-range')}>
      {value}
    </button>
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
    prom.promQueryRange.mockResolvedValue({ status: 'success', data: { resultType: 'matrix', result: [] } });
  });

  it('renders placeholders before device data is loaded', async () => {
    const socket = createSocket();
    socketProvider.useSocket.mockReturnValueOnce({ isConnected: true, socket });
    axios.get.mockReturnValue(new Promise(() => {}));

    const view = render(<MonitoringClient id="rig-1" />);

    expect(screen.getByText('rig-1 Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Pool preset')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();

    expect(screen.getByText(/- GH\/s/)).toBeInTheDocument();

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
              hostname: 'rig-1',
              hashRate: 10,
              hashRate_10m: 11,
              sharesAccepted: 1,
              sharesRejected: 2,
              bestDiff: '1',
              bestSessionDiff: '1',
              uptimeSeconds: 60,
              power: 100,
              temp: 50,
              vrTemp: 55,
            },
          },
        ],
      },
    });

    const view = render(<MonitoringClient id="rig-1" />);

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

    expect(await screen.findByText('online')).toBeInTheDocument();
    expect(screen.getByText(/- GH\/s/)).toBeInTheDocument();
    expect(screen.getByText(/- W/)).toBeInTheDocument();
  });

  it('handles empty Prometheus series results', async () => {
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
    expect(await screen.findByText('rig-1 Dashboard')).toBeInTheDocument();
    expect(screen.getAllByTestId('line-chart').length).toBeGreaterThan(0);

    prom.matrixToSeries.mockReturnValue([{ metric: {}, points: [{ t: 1, v: 1 }] }]);
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
        setTimeout(() => resolve({ status: 'success', data: { resultType: 'matrix', result: [] } }), 50);
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
