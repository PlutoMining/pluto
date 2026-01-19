import React from 'react';
import { render, screen } from '@testing-library/react';

import { DeviceHeatmapCard } from '@/components/charts/DeviceHeatmapCard';

describe('DeviceHeatmapCard', () => {
  it('renders device tiles with links to monitoring pages', () => {
    render(
      <DeviceHeatmapCard
        title="Device map"
        devices={[
          {
            mac: 'aa',
            ip: '1.1.1.1',
            type: 'rig',
            tracing: true,
            info: {
              hostname: 'rig-1',
              hashRate_10m: 10,
              hashRate: 10,
              power: 100,
              temp: 50,
              vrTemp: 55,
              bestDiff: '1',
              bestSessionDiff: '1',
              uptimeSeconds: 60,
            },
          } as any,
          {
            mac: 'bb',
            ip: '1.1.1.2',
            type: 'rig',
            tracing: false,
            info: {
              hostname: 'rig-2',
              hashRate_10m: 0,
              hashRate: 0,
              power: 0,
              temp: 0,
              vrTemp: 0,
              bestDiff: '0',
              bestSessionDiff: '0',
              uptimeSeconds: 0,
            },
          } as any,
        ]}
      />
    );

    expect(screen.getByText('Device map')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /rig-1/i }) as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/monitoring/rig-1');
  });
});
