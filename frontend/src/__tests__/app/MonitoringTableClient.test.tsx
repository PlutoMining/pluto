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
  useSocket: jest.fn(),
}));

const axios = jest.requireMock('axios').default as { get: jest.Mock };
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

describe('MonitoringTableClient', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    socketProvider.useSocket.mockReturnValue({ isConnected: false, socket: { on: jest.fn(), off: jest.fn() } });
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

    expect(await screen.findByLabelText('Search device')).toBeInTheDocument();
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

  it('updates devices from socket events and unregisters on cleanup', async () => {
    const socket = createSocket();
    socketProvider.useSocket.mockReturnValue({ isConnected: true, socket });

    axios.get.mockResolvedValueOnce({
      data: {
        data: [
          {
            mac: 'aa',
            ip: '1.1.1.1',
            type: 'rig',
            tracing: false,
            info: {
              hostname: 'rig-1',
              hashRate_10m: 10,
              hashRate: 5,
              sharesAccepted: 1,
              sharesRejected: 0,
              power: 100,
              temp: 50.25,
              vrTemp: null,
              currentDiff: '10',
              bestDiff: '1',
              bestSessionDiff: '2',
              uptimeSeconds: 60,
            },
          },
        ],
      },
    });

    const view = render(<MonitoringTableClient />);

    expect(await screen.findByText('rig-1')).toBeInTheDocument();
    expect(screen.getByText(/50\.3/)).toBeInTheDocument();
    expect(screen.getByText(/N\/A/)).toBeInTheDocument();
    expect(screen.getByTestId('device-status')).toHaveTextContent('offline');

    act(() => {
      socket.emit('stat_update', { mac: 'aa', tracing: true, info: { hostname: 'rig-1-updated', power: 200 } });
    });

    expect(await screen.findByText('rig-1-updated')).toBeInTheDocument();
    expect(screen.getByTestId('device-status')).toHaveTextContent('online');

    act(() => {
      socket.emit('stat_update', { mac: 'bb', info: { hostname: 'ignored' } });
    });
    expect(screen.queryByText('ignored')).not.toBeInTheDocument();

    view.unmount();
    expect(socket.off).toHaveBeenCalledWith('stat_update', expect.any(Function));
    expect(socket.off).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('handles non-finite temperatures and undefined initial device lists', async () => {
    axios.get.mockResolvedValueOnce({ data: { data: undefined } });
    render(<MonitoringTableClient />);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/devices/imprint');
    });

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
              hashRate: 10,
              sharesAccepted: 1,
              sharesRejected: 0,
              power: 100,
              temp: Number.NaN,
              vrTemp: Number.POSITIVE_INFINITY,
              bestDiff: '1',
              bestSessionDiff: '1',
              uptimeSeconds: 60,
            },
          },
        ],
      },
    });

    render(<MonitoringTableClient />);
    expect(await screen.findByText('rig-1')).toBeInTheDocument();
    expect(screen.getAllByText(/N\/A/).length).toBeGreaterThan(0);
  });

  it('covers search empty results and abort branches', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Search returning undefined data -> fallback to []
    axios.get
      .mockResolvedValueOnce({ data: { data: [] } })
      .mockResolvedValueOnce({ data: { data: undefined } });

    const view = render(<MonitoringTableClient />);
    const input = await screen.findByLabelText('Search device');
    fireEvent.change(input, { target: { value: 'rig' } });

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    view.unmount();

    // Abort during an in-flight successful request
    let resolveSearch: any;
    axios.get
      .mockResolvedValueOnce({ data: { data: [] } })
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveSearch = resolve;
        })
      );

    const view2 = render(<MonitoringTableClient />);
    const input2 = await screen.findByLabelText('Search device');
    fireEvent.change(input2, { target: { value: 'rig' } });

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    view2.unmount();
    await act(async () => {
      resolveSearch({ data: { data: [{ mac: 'aa' }] } });
    });

    // Abort during an in-flight failing request
    let rejectSearch: any;
    axios.get
      .mockResolvedValueOnce({ data: { data: [] } })
      .mockReturnValueOnce(
        new Promise((_resolve, reject) => {
          rejectSearch = reject;
        })
      );

    const view3 = render(<MonitoringTableClient />);
    const input3 = await screen.findByLabelText('Search device');
    fireEvent.change(input3, { target: { value: 'rig' } });

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    view3.unmount();
    await act(async () => {
      rejectSearch(new Error('search-fail'));
    });

    expect(consoleSpy).not.toHaveBeenCalledWith('Error searching devices:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('ignores socket updates before devices are loaded', async () => {
    const socket = createSocket();
    socketProvider.useSocket.mockReturnValue({ isConnected: true, socket });
    axios.get.mockReturnValue(new Promise(() => {}));

    render(<MonitoringTableClient />);

    await waitFor(() => {
      expect(socket.on).toHaveBeenCalled();
    });

    act(() => {
      socket.emit('stat_update', { mac: 'aa', info: { hostname: 'ignored' } });
    });
  });

  it('logs fetch and search errors', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    axios.get.mockRejectedValueOnce(new Error('fetch-fail'));

    const first = render(<MonitoringTableClient />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error discovering devices:', expect.any(Error));
    });

    first.unmount();

    axios.get
      .mockResolvedValueOnce({ data: { data: [] } })
      .mockRejectedValueOnce(new Error('search-fail'));

    render(<MonitoringTableClient />);
    const input = await screen.findByLabelText('Search device');
    fireEvent.change(input, { target: { value: 'rig' } });

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error searching devices:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });
});
