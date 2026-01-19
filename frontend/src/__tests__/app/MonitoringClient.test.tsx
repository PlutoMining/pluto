import React from 'react';
import { act, render, screen } from '@testing-library/react';

import MonitoringClient from '@/app/(realtime)/monitoring/[id]/MonitoringClient';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

jest.mock('@/providers/SocketProvider', () => ({
  __esModule: true,
  useSocket: () => ({
    isConnected: false,
    socket: { on: jest.fn(), off: jest.fn() },
  }),
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
  TimeRangeSelect: ({ value }: any) => <div data-testid="time-range">{value}</div>,
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
const prom = jest.requireMock('@/lib/prometheus') as { promQueryRange: jest.Mock };

describe('MonitoringClient', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
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
