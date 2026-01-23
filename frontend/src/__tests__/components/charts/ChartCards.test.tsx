import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('recharts');

import { LineChartCard } from '@/components/charts/LineChartCard';
import { MultiLineChartCard } from '@/components/charts/MultiLineChartCard';
import { TreemapChartCard } from '@/components/charts/TreemapChartCard';

describe('Chart cards', () => {
  it('renders LineChartCard title', () => {
    render(<LineChartCard title="Fan speed" points={[{ t: 1, v: 10 }]} unit="RPM" />);
    expect(screen.getByText('Fan speed')).toBeInTheDocument();
  });

  it('renders MultiLineChartCard legend labels', () => {
    render(
      <MultiLineChartCard
        title="Temperatures"
        unit="°C"
        series={[
          { key: 'asic', label: 'ASIC', color: 'red', points: [{ t: 1, v: 50 }] },
          { key: 'vr', label: 'VR', color: 'blue', points: [{ t: 1, v: 55 }] },
        ]}
      />
    );

    expect(screen.getByText('Temperatures')).toBeInTheDocument();
    expect(screen.getByText('ASIC')).toBeInTheDocument();
    expect(screen.getByText('VR')).toBeInTheDocument();
  });

  it('renders TreemapChartCard title', () => {
    render(<TreemapChartCard title="Firmware distribution" data={[{ version: 'v1', count: 2 }]} nameKey="version" valueKey="count" />);
    expect(screen.getByText('Firmware distribution')).toBeInTheDocument();
  });
});

