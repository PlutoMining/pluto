import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import PresetsClient from '@/app/(static)/presets/PresetsClient';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
  },
}));

jest.mock('@/components/ProgressBar/CircularProgressWithDots', () => ({
  __esModule: true,
  CircularProgressWithDots: () => <div data-testid="loading" />,
}));

jest.mock('@/components/Button/Button', () => ({
  __esModule: true,
  default: ({ onClick, label }: any) => (
    <button type="button" onClick={onClick}>
      {label}
    </button>
  ),
}));

jest.mock('@/components/Alert/Alert', () => ({
  __esModule: true,
  default: ({ content }: any) => (
    <div data-testid="alert">
      <div>{content.title}</div>
      <div>{content.message}</div>
    </div>
  ),
}));

jest.mock('@/components/Accordion', () => ({
  __esModule: true,
  PresetAccordion: ({ preset, onDelete, onDuplicate }: any) => (
    <div data-testid="preset" data-uuid={preset.uuid}>
      <div>{preset.name}</div>
      <button
        type="button"
        onClick={() =>
          onDuplicate(preset.uuid)({
            preventDefault: () => {},
          })
        }
      >
        duplicate
      </button>
      <button type="button" onClick={() => onDelete(preset.uuid)}>
        delete
      </button>
    </div>
  ),
}));

jest.mock('@/components/Modal', () => ({
  __esModule: true,
  AddNewPresetModal: ({ isOpen, presetId, onCloseSuccessfully }: any) =>
    isOpen ? (
      <div data-testid="new-preset-modal">
        <div data-testid="preset-id">{presetId || 'new'}</div>
        <button type="button" onClick={onCloseSuccessfully}>
          save-success
        </button>
      </div>
    ) : null,
  BasicModal: ({ isOpen, primaryAction }: any) => (
    <div data-testid="delete-modal" data-open={isOpen ? 'true' : 'false'}>
      <button type="button" onClick={primaryAction}>
        delete-proceed
      </button>
    </div>
  ),
}));

const axios = jest.requireMock('axios').default as {
  get: jest.Mock;
  delete: jest.Mock;
  patch: jest.Mock;
};

describe('PresetsClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads, renders empty state, and opens the new preset modal', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });

    render(<PresetsClient />);

    expect(screen.getByTestId('loading')).toBeInTheDocument();
    expect(await screen.findByText("Looks like you haven't added a preset pool yet!")).toBeInTheDocument();

    fireEvent.click(screen.getByText('Add a Pool Preset'));
    expect(screen.getByTestId('new-preset-modal')).toBeInTheDocument();
    expect(screen.getByTestId('preset-id')).toHaveTextContent('new');
  });

  it('renders presets, duplicates, and deletes (with device patch)', async () => {
    const preset = { uuid: 'p1', name: 'Preset 1' };
    const device = { mac: 'aa', presetUuid: 'p1' };

    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [preset] }),
    });

    axios.get.mockResolvedValue({ data: { data: [device] } });
    axios.delete.mockResolvedValue({});
    axios.patch.mockResolvedValue({});

    render(<PresetsClient />);

    expect(await screen.findByTestId('preset')).toHaveAttribute('data-uuid', 'p1');

    fireEvent.click(screen.getByText('Add a New Preset'));
    expect(screen.getByTestId('new-preset-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByText('save-success'));
    expect(await screen.findByTestId('alert')).toHaveTextContent('Preset Saved Successfully!');

    fireEvent.click(screen.getByText('duplicate'));
    expect(screen.getByTestId('new-preset-modal')).toBeInTheDocument();
    expect(screen.getByTestId('preset-id')).toHaveTextContent('p1');

    fireEvent.click(screen.getByText('delete'));
    expect(screen.getByTestId('delete-modal')).toHaveAttribute('data-open', 'true');

    fireEvent.click(screen.getByText('delete-proceed'));
    await waitFor(() => {
      expect(axios.delete).toHaveBeenCalledWith('/api/presets/p1');
      expect(axios.patch).toHaveBeenCalledWith('/api/devices/imprint/aa', {
        device: { ...device, presetUuid: null },
      });
    });

    expect(await screen.findByTestId('alert')).toHaveTextContent('Preset Deleted Successfully!');
  });

  it('handles failed preset deletion and no-selection delete safely', async () => {
    const preset = { uuid: 'p1', name: 'Preset 1' };

    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [preset] }),
    });

    axios.get.mockResolvedValue({ data: { data: undefined } });
    axios.delete.mockRejectedValueOnce(new Error('nope'));

    render(<PresetsClient />);

    expect(await screen.findByTestId('preset')).toBeInTheDocument();

    // Covers the "no selected preset" branch.
    fireEvent.click(screen.getByText('delete-proceed'));
    expect(axios.delete).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('delete'));
    fireEvent.click(screen.getByText('delete-proceed'));
    expect(await screen.findByTestId('alert')).toHaveTextContent('Error deleting preset');
  });

  it('continues when preset device lookup fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const preset = { uuid: 'p1', name: 'Preset 1' };

    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [preset] }),
    });

    axios.get.mockRejectedValueOnce(new Error('devices-fail'));

    render(<PresetsClient />);

    expect(await screen.findByTestId('preset')).toBeInTheDocument();
    expect(consoleSpy).toHaveBeenCalledWith('Error discovering preset devices:', expect.any(Error));

    consoleSpy.mockRestore();
  });

  it('covers fetchPresets ok:false, fetchPresets catch, and update catch', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // ok:false branch
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: false });
    const first = render(<PresetsClient />);
    expect(await screen.findByText("Looks like you haven't added a preset pool yet!")).toBeInTheDocument();
    expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch presets');
    first.unmount();

    // catch branch inside fetchPresets
    (global as any).fetch = jest.fn().mockRejectedValue(new Error('fetch-fail'));
    const second = render(<PresetsClient />);
    expect(await screen.findByText("Looks like you haven't added a preset pool yet!")).toBeInTheDocument();
    expect(consoleSpy).toHaveBeenCalledWith('Error fetching presets', expect.any(Error));
    second.unmount();

    // catch branch inside fetchPresetsWithAssociatedDevices
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { map: () => { throw new Error('map-fail'); } } }),
    });
    const third = render(<PresetsClient />);
    expect(await screen.findByText("Looks like you haven't added a preset pool yet!")).toBeInTheDocument();
    expect(consoleSpy).toHaveBeenCalledWith("Error during presets' update:", expect.any(Error));
    third.unmount();

    consoleSpy.mockRestore();
  });
});
