import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import axios from 'axios';
import { SocketProvider, useSocket } from '@/providers/SocketProvider';

jest.mock('axios');

jest.mock('socket.io-client', () => {
  const listeners: Record<string, (...args: any[]) => void> = {};
  const socket = {
    on: jest.fn((event: string, handler: (...args: any[]) => void) => {
      listeners[event] = handler;
      return socket;
    }),
    disconnect: jest.fn(),
  };

  return {
    io: jest.fn(() => socket),
    __listeners: listeners,
    __socket: socket,
  };
});

const socketModule = jest.requireMock('socket.io-client') as {
  io: jest.Mock;
  __listeners: Record<string, (...args: any[]) => void>;
  __socket: { on: jest.Mock; disconnect: jest.Mock };
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SocketProvider>{children}</SocketProvider>
);

describe('SocketProvider', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(socketModule.__listeners).forEach((key) => delete socketModule.__listeners[key]);

    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('logs error and does not connect when device fetch fails', async () => {
    const error = new Error('fetch failed');
    (axios.get as jest.Mock).mockRejectedValue(error);

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useSocket(), { wrapper });

    await waitFor(() => expect(axios.get).toHaveBeenCalled());
    await waitFor(() =>
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error listing imprinted devices:', error)
    );

    expect(result.current.devices).toBeNull();
    expect(socketModule.io).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('fetches devices and updates connection state', async () => {
    const device = { mac: 'abc' } as any;
    (axios.get as jest.Mock).mockResolvedValue({
      data: { data: [device], message: 'ok' },
    });

    const { result, unmount } = renderHook(() => useSocket(), { wrapper });

    await waitFor(() => expect(result.current.devices).toEqual([device]));
    await waitFor(() => expect(socketModule.io).toHaveBeenCalled());

    act(() => {
      socketModule.__listeners.connect?.();
    });
    expect(result.current.isConnected).toBe(true);
    expect(consoleLogSpy).toHaveBeenCalledWith('Connected to WebSocket');

    act(() => {
      socketModule.__listeners.disconnect?.('bye');
    });
    expect(result.current.isConnected).toBe(false);
    expect(consoleWarnSpy).toHaveBeenCalledWith('Disconnected from WebSocket:', 'bye');

    unmount();
    expect(socketModule.__socket.disconnect).toHaveBeenCalled();
  });

  it('logs connect_error event', async () => {
    const device = { mac: 'abc' } as any;
    (axios.get as jest.Mock).mockResolvedValue({
      data: { data: [device], message: 'ok' },
    });

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useSocket(), { wrapper });

    await waitFor(() => expect(result.current.devices).toEqual([device]));
    await waitFor(() => expect(socketModule.io).toHaveBeenCalled());

    const error = new Error('connect error');
    act(() => {
      socketModule.__listeners.connect_error?.(error);
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Connection error:', error);
    expect(result.current.isConnected).toBe(false);

    consoleErrorSpy.mockRestore();
  });

  it('throws when useSocket is used outside of the provider', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useSocket())).toThrow(
      'useSocket must be used within a SocketProvider'
    );

    consoleErrorSpy.mockRestore();
  });
});
