import type { DiscoveredMiner } from "@pluto/interfaces";
import type { TimeRangeKey, PollingIntervalKey } from "@/lib/prometheus";
import React from "react";
import { BitaxeStatCards, BitaxeCharts } from "./BitaxeDetailPanel";

export interface VendorDetailPanelProps {
  device: DiscoveredMiner;
  deviceId: string;
  range: TimeRangeKey;
  polling: PollingIntervalKey;
  autoRefreshMs: number;
}

const statCardsRegistry = new Map<
  string,
  React.ComponentType<Pick<VendorDetailPanelProps, "device">>
>();

const chartsRegistry = new Map<
  string,
  React.ComponentType<VendorDetailPanelProps>
>();

statCardsRegistry.set("bitaxe", BitaxeStatCards);
statCardsRegistry.set("espminer", BitaxeStatCards);

chartsRegistry.set("bitaxe", BitaxeCharts);
chartsRegistry.set("espminer", BitaxeCharts);

function resolveVendorKey(device: DiscoveredMiner): string | null {
  const candidates = [device.type, device.minerData?.deviceInfo?.make, device.minerData?.deviceInfo?.model]
    .filter((v): v is string => typeof v === "string" && v.length > 0)
    .map((v) => v.toLowerCase());

  for (const [key] of statCardsRegistry) {
    if (candidates.some((c) => c.startsWith(key))) return key;
  }
  return null;
}

export const VendorStatCards: React.FC<Pick<VendorDetailPanelProps, "device">> = ({ device }) => {
  const key = resolveVendorKey(device);
  if (!key) return null;
  const Panel = statCardsRegistry.get(key);
  if (!Panel) return null;
  return <Panel device={device} />;
};

export const VendorCharts: React.FC<VendorDetailPanelProps> = (props) => {
  const key = resolveVendorKey(props.device);
  if (!key) return null;
  const Panel = chartsRegistry.get(key);
  if (!Panel) return null;
  return <Panel {...props} />;
};
