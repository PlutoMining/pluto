import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { LogStreamProvider, useLogStream } from '@/providers/LogStreamProvider';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <LogStreamProvider>{children}</LogStreamProvider>
);

describe('LogStreamProvider', () => {
  it('exposes controls to toggle state', () => {
    const { result } = renderHook(() => useLogStream(), { wrapper });

    expect(result.current.isLogStreamActive).toBe(false);
    expect(result.current.shouldReconnect).toBe(false);

    act(() => {
      result.current.startLogStream();
    });
    expect(result.current.isLogStreamActive).toBe(true);
    expect(result.current.shouldReconnect).toBe(false);

    act(() => {
      result.current.requestReconnect();
    });
    expect(result.current.shouldReconnect).toBe(true);

    act(() => {
      result.current.stopLogStream();
    });
    expect(result.current.isLogStreamActive).toBe(false);
  });

  it('throws when hook used outside provider', () => {
    const { result } = renderHook(() => {
      try {
        return useLogStream();
      } catch (error) {
        return error;
      }
    });
    expect(result.current).toBeInstanceOf(Error);
  });
});

