import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import DevicesClient from '@/app/(realtime)/devices/DevicesClient';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('@/providers/SocketProvider', () => ({
  __esModule: true,
  useSocket: jest.fn(),
}));

jest.mock('@/components/ProgressBar/CircularProgressWithDots', () => ({
  __esModule: true,
  CircularProgressWithDots: () => <div data-testid="loading" />,
}));

jest.mock('@/components/Button/Button', () => ({
  __esModule: true,
  default: ({ onClick, label, disabled }: any) => (
    <button type="button" disabled={disabled} onClick={onClick}>
      {label}
    </button>
  ),
}));

jest.mock('@/components/icons/AddIcon', () => ({
  __esModule: true,
  AddIcon: () => <span data-testid="add-icon" />,
}));

jest.mock('@/components/Table/DeviceTable', () => ({
  __esModule: true,
  DeviceTable: ({ devices, removeDeviceFunction }: any) => (
    <div data-testid="device-table">
      {devices.map((d: any) => (
        <div key={d.mac}>
          <span>{d.info?.hostname || d.mac}</span>
          <button type="button" onClick={() => removeDeviceFunction(d.mac)}>
            remove-{d.mac}
          </button>
        </div>
      ))}
    </div>
  ),
}));

jest.mock('@/components/Accordion/DeviceAccordion', () => ({
  __esModule: true,
  DeviceAccordion: () => <div data-testid="device-accordion" />,
}));

jest.mock('@/components/Alert/Alert', () => ({
  __esModule: true,
  default: ({ content, onClose }: any) => (
    <div data-testid="alert">
      <div>{content.title}</div>
      <div>{content.message}</div>
      <button type="button" onClick={onClose}>
        close-alert
      </button>
    </div>
  ),
}));

jest.mock('@/components/Modal/RegisterDevicesModal', () => ({
  __esModule: true,
  RegisterDevicesModal: ({ isOpen, onDevicesChanged }: any) =>
    isOpen ? (
      <div data-testid="register-modal">
        <button type="button" onClick={onDevicesChanged}>
          devices-changed
        </button>
      </div>
    ) : null,
}));

jest.mock('@/components/Modal/BasicModal', () => ({
  __esModule: true,
  BasicModal: ({ isOpen, primaryAction, secondaryAction }: any) =>
    (
      <div data-testid="confirm-modal" data-open={isOpen ? 'true' : 'false'}>
        <button type="button" onClick={primaryAction}>
          proceed
        </button>
        <button type="button" onClick={secondaryAction}>
          cancel
        </button>
      </div>
    ),
}));

const axios = jest.requireMock('axios').default as {
  get: jest.Mock;
  put: jest.Mock;
  delete: jest.Mock;
};

const socketProvider = jest.requireMock('@/providers/SocketProvider') as {
  useSocket: jest.Mock;
};

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

describe('DevicesClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axios.put.mockResolvedValue({});
    axios.delete.mockResolvedValue({});
  });

  it('shows a loader while devices are null and ignores socket updates', async () => {
    const socket = createSocket();
    socketProvider.useSocket.mockReturnValue({ isConnected: true, socket });

    axios.get.mockReturnValue(new Promise(() => {}));

    render(<DevicesClient />);

    expect(screen.getByTestId('loading')).toBeInTheDocument();

    act(() => {
      socket.emit('stat_update', { mac: 'aa' });
    });
  });

  it('renders empty state and opens register modal', async () => {
    socketProvider.useSocket.mockReturnValue({ isConnected: false, socket: createSocket() });
    axios.get.mockResolvedValue({ data: { data: [] } });

    render(<DevicesClient />);

    expect(await screen.findByText(/Looks like you haven/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Add a new device'));
    expect(screen.getByTestId('register-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByText('devices-changed'));
    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith('/api/devices/listen', { macs: [] });
    });
  });

  it('logs fetch/put errors without crashing', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    socketProvider.useSocket.mockReturnValue({ isConnected: false, socket: createSocket() });

    axios.get.mockRejectedValueOnce(new Error('fetch-fail'));
    const first = render(<DevicesClient />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error discovering devices:', expect.any(Error));
    });

    first.unmount();

    axios.get.mockResolvedValue({ data: { data: [] } });
    axios.put.mockRejectedValueOnce(new Error('put-fail'));

    render(<DevicesClient />);
    expect(await screen.findByText(/Looks like you haven/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Add a new device'));
    fireEvent.click(screen.getByText('devices-changed'));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error updating devices to listen:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('renders devices and supports socket updates + removal success', async () => {
    const socket = createSocket();
    socketProvider.useSocket.mockReturnValue({ isConnected: true, socket });

    const device = { mac: 'aa', info: { hostname: 'rig-1' } };
    axios.get
      .mockResolvedValueOnce({ data: { data: [device] } })
      .mockResolvedValueOnce({ data: { data: [device] } });

    render(<DevicesClient />);

    expect(await screen.findByText('Your devices')).toBeInTheDocument();
    expect(await screen.findByText('rig-1')).toBeInTheDocument();

    act(() => {
      socket.emit('stat_update', { mac: 'aa', info: { hostname: 'rig-1-updated' } });
    });
    expect(await screen.findByText('rig-1-updated')).toBeInTheDocument();

    act(() => {
      socket.emit('stat_update', { mac: 'bb', info: { hostname: 'ignored' } });
    });
    expect(screen.queryByText('ignored')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('remove-aa'));
    expect(screen.getByTestId('confirm-modal')).toHaveAttribute('data-open', 'true');

    fireEvent.click(screen.getByText('proceed'));

    await waitFor(() => {
      expect(axios.delete).toHaveBeenCalledWith('/api/devices/imprint/aa');
    });

    expect(await screen.findByTestId('alert')).toHaveTextContent('Save Successful');

    fireEvent.click(screen.getByText('close-alert'));
    await waitFor(() => {
      expect(screen.queryByTestId('alert')).not.toBeInTheDocument();
    });

    expect(await screen.findByText(/Looks like you haven/i)).toBeInTheDocument();
  });

  it('shows an error alert when deletion fails and does nothing without selection', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    socketProvider.useSocket.mockReturnValue({ isConnected: false, socket: createSocket() });
    const device = { mac: 'aa', info: { hostname: 'rig-1' } };

    axios.get.mockResolvedValue({ data: { data: [device] } });
    axios.delete.mockRejectedValueOnce(new Error('boom'));

    render(<DevicesClient />);

    // Cover the "no selected device" branch.
    fireEvent.click(screen.getByText('proceed'));
    expect(axios.delete).not.toHaveBeenCalled();

    expect(await screen.findByText('rig-1')).toBeInTheDocument();

    fireEvent.click(screen.getByText('remove-aa'));
    fireEvent.click(screen.getByText('proceed'));

    expect(await screen.findByTestId('alert')).toHaveTextContent('Remove failed.');

    fireEvent.click(screen.getByText('cancel'));

    consoleSpy.mockRestore();
  });
});
