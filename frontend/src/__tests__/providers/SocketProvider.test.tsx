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
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(socketModule.__listeners).forEach((key) => delete socketModule.__listeners[key]);
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

    act(() => {
      socketModule.__listeners.disconnect?.('bye');
    });
    expect(result.current.isConnected).toBe(false);

    unmount();
    expect(socketModule.__socket.disconnect).toHaveBeenCalled();
  });
});

