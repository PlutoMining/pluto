import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('recharts');

import { PieChartCard } from '@/components/charts/PieChartCard';

describe('PieChartCard', () => {
  it('renders a stable center label when provided', () => {
    const { rerender } = render(
      <PieChartCard
        title="Pools"
        data={[
          { kind: 'Accepted', value: 10 },
          { kind: 'Rejected', value: 2 },
        ]}
        nameKey="kind"
        valueKey="value"
        centerLabelTitle="Pool"
        centerLabel="Ocean Main"
      />
    );

    expect(screen.getByText('Pools')).toBeInTheDocument();
    expect(screen.getByText('Pool')).toBeInTheDocument();
    expect(screen.getByText('Ocean Main')).toBeInTheDocument();

    rerender(
      <PieChartCard
        title="Pools"
        data={[{ kind: 'Accepted', value: 1 }]}
        nameKey="kind"
        valueKey="value"
        centerLabelTitle="Pool"
        centerLabel="Other"
      />
    );

    expect(screen.getByText('Other')).toBeInTheDocument();
  });
});
