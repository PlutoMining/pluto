"use client";

import * as React from "react";
import NextLink from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeLinearBreakpoints, PLUTO_HEAT, steppedColor } from "@/components/charts/chartPalette";
import { formatDifficulty } from "@/utils/formatDifficulty";
import { formatDetailedTime } from "@/utils/formatTime";
import {
  getHostname,
  getHashrateGhs,
  getUptime,
  getBestDifficulty,
  getBestSessionDifficulty,
  getEffectiveTempForHeatmap,
  getMaxChipTempFromHashboards,
  getWattage,
} from "@/utils/minerDataHelpers";
import type { DiscoveredMiner } from "@pluto/interfaces";

const TEMP_MIN_C = 30;
const TEMP_MAX_C = 85;
const HOT_THRESHOLD_C = 75;

const TEMP_BREAKPOINTS = computeLinearBreakpoints(TEMP_MIN_C, TEMP_MAX_C, PLUTO_HEAT.length);

function temperatureToColor(tempC: number | null | undefined) {
  if (tempC == null || !Number.isFinite(tempC)) return "hsl(var(--muted))";
  return steppedColor(tempC, TEMP_BREAKPOINTS, PLUTO_HEAT);
}

function formatMaybeNumber(value: unknown, digits = 1) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "-";
  return n.toFixed(digits);
}

function contrastTextForHeat(bg: string) {
  // The HEAT ramp is always bright in both themes, so default to dark text.
  // We'll still switch to white for the darkest reds/oranges.
  if (!bg.startsWith("#")) {
    return {
      color: "hsl(var(--foreground))",
      shadow: "none",
    };
  }

  const hex = bg.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  const color = lum > 0.62 ? "#000000" : "#FFFFFF";
  const shadow = color === "#FFFFFF" ? "0 1px 2px rgba(0,0,0,0.35)" : "0 1px 2px rgba(255,255,255,0.25)";
  return { color, shadow };
}
export function DeviceHeatmapCard({
  title = "Devices",
  devices,
}: {
  title?: string;
  devices: DiscoveredMiner[];
}) {
  const items = React.useMemo(() => {
    return [...devices]
      .filter((d) => getHostname(d?.minerData) !== "unknown")
      .sort((a, b) => getHostname(a.minerData).localeCompare(getHostname(b.minerData)))
      .map((device) => {
        const m = device.minerData;
        const hashrate = getHashrateGhs(m);
        const currentDiff = getBestSessionDifficulty(m);
        const effectiveTemp = getEffectiveTempForHeatmap(m);
        const chipTemp = getMaxChipTempFromHashboards(m);
        const power = getWattage(m);

        return {
          hostname: getHostname(m),
          online: Boolean(device.tracing),
          hashrate,
          effectiveTemp,
          chipTemp,
          power,
          uptimeSeconds: getUptime(m),
          bestDiff: getBestDifficulty(m),
          currentDiff,
        };
      });
  }, [devices]);

  return (
    <Card className="rounded-none">
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <CardTitle>{title}</CardTitle>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 border border-border" style={{ background: "hsl(var(--muted))" }} />
            <span>Offline / Unknown</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex flex-wrap items-center gap-1">
              {PLUTO_HEAT.map((c, idx) => (
                <span
                  key={`${c}-${idx}`}
                  className="h-3 w-3 border border-border"
                  style={{ background: c }}
                />
              ))}
            </div>
            <span>
              Temp ({TEMP_MIN_C}°C → {TEMP_MAX_C}°C)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 border border-border ring-2 ring-inset"
              style={{ "--tw-ring-color": PLUTO_HEAT[PLUTO_HEAT.length - 1] } as React.CSSProperties}
            />
            <span>Hot (≥ {HOT_THRESHOLD_C}°C)</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-6">
          {items.map((item) => {
            const bg = item.online ? temperatureToColor(item.effectiveTemp) : "hsl(var(--muted))";
            const textStyle = item.online
              ? contrastTextForHeat(bg)
              : { color: "hsl(var(--muted-foreground))", shadow: "none" };
            const isHot =
              item.online &&
              typeof item.effectiveTemp === "number" &&
              Number.isFinite(item.effectiveTemp) &&
              item.effectiveTemp >= HOT_THRESHOLD_C;

            const title = [
              item.hostname,
              `Status: ${item.online ? "online" : "offline"}`,
              `Hashrate: ${formatMaybeNumber(item.hashrate, 2)} GH/s`,
              `Power: ${formatMaybeNumber(item.power, 2)} W`,
              `Temp: ${formatMaybeNumber(item.effectiveTemp, 1)} °C`,
              `Chip temp: ${formatMaybeNumber(item.chipTemp, 1)} °C`,
              `Current diff: ${formatDifficulty(item.currentDiff)}`,
              `Best diff: ${formatDifficulty(item.bestDiff)}`,
              `Uptime: ${formatDetailedTime(item.uptimeSeconds)}`,
            ].join("\n");

            return (
              <NextLink
                key={item.hostname}
                href={`/monitoring/${encodeURIComponent(item.hostname)}`}
                title={title}
                className={[
                  "group relative block min-h-[86px] border border-border p-3 transition-colors hover:border-foreground",
                  isHot ? "ring-2 ring-inset" : "",
                ].join(" ")}
                style={{
                  backgroundColor: bg,
                  ...(isHot ? ({ "--tw-ring-color": PLUTO_HEAT[PLUTO_HEAT.length - 1] } as React.CSSProperties) : {}),
                }}
              >
                <div
                  className="absolute right-2 top-2 h-2 w-2 rounded-full"
                  style={{ backgroundColor: item.online ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}
                  aria-hidden
                />
                <div
                  className="min-w-0 truncate text-sm font-semibold"
                  style={{ color: textStyle.color, textShadow: textStyle.shadow }}
                >
                  {item.hostname}
                </div>
                <div
                  className="mt-1 font-accent text-xs"
                  style={{ color: textStyle.color, textShadow: textStyle.shadow }}
                >
                  {formatMaybeNumber(item.hashrate, 2)} GH/s
                </div>
                <div
                  className="mt-1 flex min-w-0 items-center justify-between gap-2 text-xs"
                  style={{ color: textStyle.color, textShadow: textStyle.shadow }}
                >
                  <span>
                    {formatMaybeNumber(item.effectiveTemp, 1)}°C
                    {item.chipTemp != null ? (
                      <>
                        <span className="opacity-90"> / </span>
                        {formatMaybeNumber(item.chipTemp, 1)}°C chip
                      </>
                    ) : null}
                  </span>
                  <span className="shrink-0 opacity-90">{formatMaybeNumber(item.power, 0)}W</span>
                </div>
                <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100" />
              </NextLink>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
