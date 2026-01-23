import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import DeviceSettingsClient from '@/app/(realtime)/device-settings/DeviceSettingsClient';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    isAxiosError: jest.fn(),
  },
}));

jest.mock('@/components/Accordion', () => ({
  __esModule: true,
  DeviceSettingsAccordion: ({ fetchedDevices }: any) => (
    <div data-testid="accordion">{fetchedDevices.map((d: any) => d.mac).join(',')}</div>
  ),
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

jest.mock('@/components/Button/Button', () => ({
  __esModule: true,
  default: ({ label, onClick, disabled, type }: any) => (
    <button type={type || 'button'} disabled={disabled} onClick={onClick}>
      {label}
    </button>
  ),
}));

jest.mock('@/components/Input', () => ({
  __esModule: true,
  SearchInput: ({ onChange }: any) => <input data-testid="search" onChange={onChange} />, 
}));

jest.mock('@/components/ProgressBar/CircularProgressWithDots', () => ({
  __esModule: true,
  CircularProgressWithDots: () => <div data-testid="loading" />,
}));

jest.mock('@/components/ui/modal', () => ({
  __esModule: true,
  Modal: ({ open, children }: any) => (open ? <div data-testid="modal">{children}</div> : null),
}));

jest.mock('@/components/icons/RestartIcon', () => ({
  __esModule: true,
  RestartAllIcon: () => <span data-testid="restart-icon" />,
}));

const axios = jest.requireMock('axios').default as {
  get: jest.Mock;
  post: jest.Mock;
  isAxiosError: jest.Mock;
};

describe('DeviceSettingsClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axios.isAxiosError.mockImplementation((e: any) => Boolean(e && e.isAxiosError));
  });

  it('shows loader then restarts all devices successfully', async () => {
    axios.get.mockResolvedValueOnce({ data: { data: [{ mac: 'aa' }, { mac: 'bb' }] } });
    axios.post.mockResolvedValue({});

    render(<DeviceSettingsClient />);

    expect(screen.getByTestId('loading')).toBeInTheDocument();
    expect(await screen.findByTestId('accordion')).toHaveTextContent('aa,bb');

    fireEvent.click(screen.getByText('Restart all'));
    expect(screen.getByTestId('modal')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Restart'));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/api/devices/aa/system/restart');
      expect(axios.post).toHaveBeenCalledWith('/api/devices/bb/system/restart');
    });

    expect(await screen.findByTestId('alert')).toHaveTextContent('Restart Successful');

    fireEvent.click(screen.getByText('close-alert'));
    await waitFor(() => {
      expect(screen.queryByTestId('alert')).not.toBeInTheDocument();
    });
  });

  it('debounces search, uses latest request, and warns when no devices are available', async () => {
    jest.useFakeTimers();

    axios.get
      .mockResolvedValueOnce({ data: { data: [{ mac: 'aa' }] } })
      .mockResolvedValueOnce({ data: { data: undefined } })
      .mockResolvedValueOnce({ data: { data: [{ mac: 'aa' }] } });

    render(<DeviceSettingsClient />);
    expect(await screen.findByTestId('accordion')).toHaveTextContent('aa');

    fireEvent.click(screen.getByText('Restart all'));
    expect(screen.getByTestId('modal')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('search'), { target: { value: 'a' } });
    fireEvent.change(screen.getByTestId('search'), { target: { value: 'ab' } });

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(await screen.findByText('Your Devices')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Restart'));
    expect(await screen.findByTestId('alert')).toHaveTextContent('No Devices Available');

    fireEvent.change(screen.getByTestId('search'), { target: { value: '' } });
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(3);
      expect(axios.get).toHaveBeenNthCalledWith(3, '/api/devices/imprint');
    });

    jest.useRealTimers();
  });

  it('shows a detailed error message for axios errors, and a generic one otherwise', async () => {
    axios.get.mockResolvedValueOnce({ data: { data: [{ mac: 'aa' }] } });

    axios.post.mockRejectedValueOnce({
      isAxiosError: true,
      message: 'boom',
      response: { data: { message: 'backend says no' } },
    });

    render(<DeviceSettingsClient />);
    expect(await screen.findByTestId('accordion')).toHaveTextContent('aa');

    fireEvent.click(screen.getByText('Restart all'));
    fireEvent.click(screen.getByText('Restart'));

    expect(await screen.findByTestId('alert')).toHaveTextContent('backend says no');

    axios.post.mockRejectedValueOnce(new Error('non-axios'));
    fireEvent.click(screen.getByText('Restart all'));
    fireEvent.click(screen.getByText('Restart'));

    await waitFor(() => {
      expect(screen.getByTestId('alert')).toHaveTextContent(
        'An error occurred while attempting to restart the devices.'
      );
    });
  });

  it('falls back to axios error.message when response has no message', async () => {
    axios.get.mockResolvedValueOnce({ data: { data: [{ mac: 'aa' }] } });

    axios.post.mockRejectedValueOnce({
      isAxiosError: true,
      message: 'plain axios error',
      response: { data: {} },
    });

    render(<DeviceSettingsClient />);
    expect(await screen.findByTestId('accordion')).toHaveTextContent('aa');

    fireEvent.click(screen.getByText('Restart all'));
    fireEvent.click(screen.getByText('Restart'));

    expect(await screen.findByTestId('alert')).toHaveTextContent('plain axios error');
  });

  it('does not log search errors once aborted', async () => {
    jest.useFakeTimers();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    let rejectSearch: any;
    axios.get
      .mockResolvedValueOnce({ data: { data: [{ mac: 'aa' }] } })
      .mockReturnValueOnce(
        new Promise((_resolve, reject) => {
          rejectSearch = reject;
        })
      );

    const view = render(<DeviceSettingsClient />);
    expect(await screen.findByTestId('accordion')).toHaveTextContent('aa');

    fireEvent.change(screen.getByTestId('search'), { target: { value: 'x' } });

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    view.unmount();
    await act(async () => {
      rejectSearch(new Error('aborted-search-fail'));
    });

    expect(consoleSpy).not.toHaveBeenCalledWith('Error searching devices:', expect.any(Error));

    consoleSpy.mockRestore();
    jest.useRealTimers();
  });

  it('logs fetch/search errors and respects aborts', async () => {
    jest.useFakeTimers();

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    axios.get.mockRejectedValueOnce(new Error('fetch-fail'));
    const { unmount } = render(<DeviceSettingsClient />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error discovering devices:', expect.any(Error));
    });

    unmount();

    axios.get.mockResolvedValueOnce({ data: { data: [{ mac: 'aa' }] } });
    axios.get.mockImplementationOnce(
      () =>
        new Promise((resolve, reject) => {
          setTimeout(() => reject(new Error('search-fail')), 0);
        })
    );

    const mounted = render(<DeviceSettingsClient />);
    expect(await screen.findByTestId('accordion')).toHaveTextContent('aa');

    fireEvent.change(screen.getByTestId('search'), { target: { value: 'x' } });

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error searching devices:', expect.any(Error));
    });

    mounted.unmount();

    axios.get.mockResolvedValueOnce({ data: { data: [{ mac: 'aa' }] } });
    let resolveSearch: any;
    const searchPromise = new Promise((resolve) => {
      resolveSearch = resolve;
    });
    axios.get.mockReturnValueOnce(searchPromise);

    const pending = render(<DeviceSettingsClient />);
    expect(await screen.findByTestId('accordion')).toHaveTextContent('aa');

    fireEvent.change(screen.getByTestId('search'), { target: { value: 'y' } });
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    pending.unmount();
    await act(async () => {
      resolveSearch({ data: { data: [{ mac: 'zz' }] } });
    });

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
    jest.useRealTimers();
  });
});
