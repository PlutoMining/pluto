import type { MaterialSymbolName } from "@/components/Icon";

export type AppNavItem = {
  key: string;
  href: string;
  label: string;
  icon: MaterialSymbolName;
  match: (pathname: string) => boolean;
};

export const APP_NAV: AppNavItem[] = [
  { key: "overview", href: "/", label: "Overview", icon: "speed", match: (p) => p === "/" },
  {
    key: "monitoring",
    href: "/monitoring",
    label: "Monitoring",
    icon: "signal_cellular_alt",
    match: (p) => p === "/monitoring" || p.startsWith("/monitoring/"),
  },
  {
    key: "device-settings",
    href: "/device-settings",
    label: "Device Settings",
    icon: "tune",
    match: (p) => p === "/device-settings" || p.startsWith("/device-settings/"),
  },
  {
    key: "presets",
    href: "/presets",
    label: "Pool Presets",
    icon: "grid_view",
    match: (p) => p === "/presets" || p.startsWith("/presets/"),
  },
  {
    key: "devices",
    href: "/devices",
    label: "Your Devices",
    icon: "content_copy",
    match: (p) => p === "/devices" || p.startsWith("/devices/"),
  },
];

export const SETTINGS_NAV: AppNavItem = {
  key: "settings",
  href: "/settings",
  label: "Settings",
  icon: "settings",
  match: (p) => p === "/settings" || p.startsWith("/settings/"),
};

export function getPageTitle(pathname: string) {
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
