import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import MonitoringTableClient from '@/app/(realtime)/monitoring/MonitoringTableClient';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

jest.mock('@/components/Accordion', () => ({
  __esModule: true,
  DeviceMonitoringAccordion: () => <div data-testid="device-monitoring-accordion" />,
}));

jest.mock('@/components/Badge', () => ({
  __esModule: true,
  DeviceStatusBadge: ({ status }: any) => <div data-testid="device-status">{status}</div>,
}));

jest.mock('@/components/Input', () => ({
  __esModule: true,
  SearchInput: ({ label, onChange, placeholder }: any) => (
    <label>
      {label}
      <input aria-label={label} placeholder={placeholder} onChange={onChange} />
    </label>
  ),
}));

jest.mock('@/providers/SocketProvider', () => ({
  __esModule: true,
  useSocket: () => ({
    isConnected: false,
    socket: { on: jest.fn(), off: jest.fn() },
  }),
}));

const axios = jest.requireMock('axios').default as { get: jest.Mock };

describe('MonitoringTableClient', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches and renders devices with monitoring links', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        data: [
          {
            mac: 'aa',
            ip: '1.1.1.1',
            type: 'rig',
            tracing: true,
            info: {
              hostname: 'rig-1',
              hashrate_10m: 10,
              hashRate: 10,
              sharesAccepted: 1,
              sharesRejected: 0,
              power: 100,
              temp: 50,
              vrTemp: 55,
              bestDiff: '1',
              bestSessionDiff: '1',
              uptimeSeconds: 60,
            },
          },
        ],
      },
    });

    render(<MonitoringTableClient />);

    expect(await screen.findByText('Monitoring')).toBeInTheDocument();
    expect(await screen.findByText('rig-1')).toBeInTheDocument();

    const link = screen.getByRole('link', { name: /Dashboard/i }) as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/monitoring/rig-1');
  });

  it('debounces search and re-fetches devices when query is cleared', async () => {
    axios.get
      .mockResolvedValueOnce({ data: { data: [] } }) // initial
      .mockResolvedValueOnce({
        data: { data: [{ mac: 'aa', ip: '1.1.1.1', type: 'rig', tracing: true, info: { hostname: 'rig-1', power: 1 } }] },
      }) // search
      .mockResolvedValueOnce({ data: { data: [] } }); // clear

    render(<MonitoringTableClient />);

    const input = await screen.findByLabelText('Search device');

    fireEvent.change(input, { target: { value: 'rig' } });

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        '/api/devices/imprint',
        expect.objectContaining({
          params: { q: 'rig' },
          signal: expect.any(AbortSignal),
        })
      );
    });

    fireEvent.change(input, { target: { value: '' } });

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/devices/imprint');
    });
  });
});
