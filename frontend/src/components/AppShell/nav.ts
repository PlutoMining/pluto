import type { ComponentType, SVGProps } from "react";

import {
  IconNavDeviceSettings,
  IconNavMonitoring,
  IconNavOverview,
  IconNavPoolPresets,
  IconNavSettings,
  IconNavYourDevices,
} from "@/components/icons/FigmaIcons";

export type AppNavItem = {
  key: string;
  href: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  match: (pathname: string) => boolean;
};

export const APP_NAV: AppNavItem[] = [
  {
    key: "overview",
    href: "/",
    label: "Overview",
    Icon: IconNavOverview,
    match: (p) => p === "/",
  },
  {
    key: "monitoring",
    href: "/monitoring",
    label: "Monitoring",
    Icon: IconNavMonitoring,
    match: (p) => p === "/monitoring" || p.startsWith("/monitoring/"),
  },
  {
    key: "device-settings",
    href: "/device-settings",
    label: "Device Settings",
    Icon: IconNavDeviceSettings,
    match: (p) => p === "/device-settings" || p.startsWith("/device-settings/"),
  },
  {
    key: "presets",
    href: "/presets",
    label: "Pool Presets",
    Icon: IconNavPoolPresets,
    match: (p) => p === "/presets" || p.startsWith("/presets/"),
  },
  {
    key: "devices",
    href: "/devices",
    label: "Your Devices",
    Icon: IconNavYourDevices,
    match: (p) => p === "/devices" || p.startsWith("/devices/"),
  },
];

export const SETTINGS_NAV: AppNavItem = {
  key: "settings",
  href: "/settings",
  label: "Settings",
  Icon: IconNavSettings,
  match: (p) => p === "/settings" || p.startsWith("/settings/"),
};

export function getPageTitle(pathname: string) {
  if (pathname === "/") {
    return "Overview Dashboard";
  }

  if (pathname.startsWith("/monitoring/")) {
    const id = pathname.replace(/^\/monitoring\//, "").split("/")[0];
    if (id) {
      try {
        return `${decodeURIComponent(id)} Dashboard`;
      } catch {
        return `${id} Dashboard`;
      }
    }
  }

  const match = [...APP_NAV, SETTINGS_NAV].find((i) => i.match(pathname));
  return match?.label ?? "Pluto";
}
