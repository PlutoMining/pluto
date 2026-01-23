import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import SettingsClient from '@/app/(static)/settings/SettingsClient';

jest.mock('next-themes', () => ({
  __esModule: true,
  useTheme: jest.fn(),
}));

jest.mock('@/components/Select', () => ({
  __esModule: true,
  Select: ({ label, value, onChange, optionValues }: any) => (
    <label>
      {label}
      <select data-testid="select" value={value} onChange={onChange}>
        {optionValues.map((o: any) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
        <option value="invalid">Invalid</option>
      </select>
    </label>
  ),
}));

const themes = jest.requireMock('next-themes') as { useTheme: jest.Mock };

describe('SettingsClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('syncs state from a valid theme', async () => {
    const setTheme = jest.fn();
    themes.useTheme.mockReturnValue({ theme: 'dark', setTheme });

    render(<SettingsClient />);

    await waitFor(() => {
      expect((screen.getByTestId('select') as HTMLSelectElement).value).toBe('dark');
    });
  });

  it('falls back to system for unknown themes and unknown selects', async () => {
    const setTheme = jest.fn();
    themes.useTheme.mockReturnValue({ theme: 'unknown', setTheme });

    render(<SettingsClient />);

    expect((screen.getByTestId('select') as HTMLSelectElement).value).toBe('system');

    fireEvent.change(screen.getByTestId('select'), { target: { value: 'light' } });
    expect(setTheme).toHaveBeenCalledWith('light');

    fireEvent.change(screen.getByTestId('select'), { target: { value: 'invalid' } });
    expect(setTheme).toHaveBeenCalledWith('system');
  });
});
