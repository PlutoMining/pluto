import React from 'react';

import RootLayout, { metadata } from '@/app/layout';
import StaticLayout from '@/app/(static)/layout';
import RealtimeLayout from '@/app/(realtime)/layout';

import OverviewPage from '@/app/(static)/page';
import OverviewClient from '@/app/(static)/OverviewClient';

import PresetsPage from '@/app/(static)/presets/page';
import PresetsClient from '@/app/(static)/presets/PresetsClient';

import SettingsPage from '@/app/(static)/settings/page';
import SettingsClient from '@/app/(static)/settings/SettingsClient';

import DevicesPage from '@/app/(realtime)/devices/page';
import DevicesClient from '@/app/(realtime)/devices/DevicesClient';

import DeviceSettingsPage from '@/app/(realtime)/device-settings/page';
import DeviceSettingsClient from '@/app/(realtime)/device-settings/DeviceSettingsClient';

import MonitoringTablePage from '@/app/(realtime)/monitoring/page';
import MonitoringTableClient from '@/app/(realtime)/monitoring/MonitoringTableClient';

import MonitoringPage from '@/app/(realtime)/monitoring/[id]/page';
import MonitoringClient from '@/app/(realtime)/monitoring/[id]/MonitoringClient';

import { SocketProvider } from '@/providers/SocketProvider';

describe('App Router smoke', () => {
  it('defines root layout and metadata', () => {
    expect(metadata.title).toBe('Pluto');
    expect(metadata.description).toBe('WIP');

    const el = RootLayout({ children: <div>child</div> } as any);
    expect(el.type).toBe('html');
  });

  it('returns children from static layout', () => {
    const el = StaticLayout({ children: <div data-testid="static" /> });
    expect(el.type).toBe('div');
  });

  it('wraps children with SocketProvider in realtime layout', () => {
    const el = RealtimeLayout({ children: <div data-testid="rt" /> });
    expect(el.type).toBe(SocketProvider);
  });

  it('wires pages to their client components', () => {
    const overviewEl = OverviewPage();
    expect(overviewEl.type).toBe(SocketProvider);
    expect(React.Children.only(overviewEl.props.children).type).toBe(OverviewClient);
    expect(PresetsPage().type).toBe(PresetsClient);
    expect(SettingsPage().type).toBe(SettingsClient);
    expect(DevicesPage().type).toBe(DevicesClient);
    expect(DeviceSettingsPage().type).toBe(DeviceSettingsClient);
    expect(MonitoringTablePage().type).toBe(MonitoringTableClient);

    const monitoringEl = MonitoringPage({ params: { id: 'abc' } });
    expect(monitoringEl.type).toBe(MonitoringClient);
    expect(monitoringEl.props.id).toBe('abc');
  });
});
