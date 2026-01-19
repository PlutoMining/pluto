"use client";

import * as React from "react";
import NextLink from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDifficulty } from "@/utils/formatDifficulty";
import { formatDetailedTime } from "@/utils/formatTime";
import type { Device } from "@pluto/interfaces";

function clamp01(n: number) {
  if (n <= 0) return 0;
  if (n >= 1) return 1;
  return n;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function temperatureToColor(tempC: number | null | undefined) {
  if (tempC == null || !Number.isFinite(tempC)) return "hsl(var(--muted))";

  // Map 30°C (green) → 85°C (red)
  // Use an easing curve so low temps stay greener for longer.
  const linear = clamp01((tempC - 30) / (85 - 30));
  const t = Math.pow(linear, 2);
  const hue = lerp(120, 0, t);
  const sat = 85;
  const light = lerp(32, 42, 1 - t);
  return `hsl(${hue} ${sat}% ${light}%)`;
}

function formatMaybeNumber(value: unknown, digits = 1) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "-";
  return n.toFixed(digits);
}

export function DeviceHeatmapCard({
  title = "Devices",
  devices,
}: {
  title?: string;
  devices: Device[];
}) {
  const items = React.useMemo(() => {
    return [...devices]
      .filter((d) => d?.info?.hostname)
      .sort((a, b) => String(a.info.hostname).localeCompare(String(b.info.hostname)))
      .map((device) => {
        const hashrate = device.info.hashRate_10m ?? device.info.hashRate ?? 0;
        const currentDiff = (device.info as any).currentDiff ?? device.info.bestSessionDiff;
        const temp = device.info.temp;
        const vrTemp = device.info.vrTemp;
        const effectiveTemp =
          typeof temp === "number" && Number.isFinite(temp)
            ? typeof vrTemp === "number" && Number.isFinite(vrTemp)
              ? Math.max(temp, vrTemp)
              : temp
            : typeof vrTemp === "number" && Number.isFinite(vrTemp)
            ? vrTemp
            : undefined;
        const power = device.info.power;

        return {
          hostname: device.info.hostname,
          online: Boolean(device.tracing),
          hashrate,
          temp,
          vrTemp,
          effectiveTemp,
          power,
          uptimeSeconds: device.info.uptimeSeconds,
          bestDiff: device.info.bestDiff,
          currentDiff,
        };
      });
  }, [devices]);

  return (
    <Card className="rounded-none">
      <CardHeader className="flex flex-col gap-2 tablet:flex-row tablet:items-center tablet:justify-between">
        <CardTitle>{title}</CardTitle>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 border border-border" style={{ background: "hsl(var(--muted))" }} />
            <span>Offline / Unknown</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-16 border border-border"
              style={{
                background:
                  "linear-gradient(90deg, hsl(120 85% 38%) 0%, hsl(60 90% 42%) 50%, hsl(0 85% 42%) 100%)",
              }}
            />
            <span>Temp (30°C → 85°C)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 border border-border ring-2 ring-destructive ring-inset" />
            <span>Hot (≥ 75°C)</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 mobileL:grid-cols-3 tablet:grid-cols-4 desktop:grid-cols-6">
          {items.map((item) => {
            const bg = item.online ? temperatureToColor(item.effectiveTemp) : "hsl(var(--muted))";
            const isHot =
              item.online &&
              typeof item.effectiveTemp === "number" &&
              Number.isFinite(item.effectiveTemp) &&
              item.effectiveTemp >= 75;

            const title = [
              item.hostname,
              `Status: ${item.online ? "online" : "offline"}`,
              `Hashrate: ${formatMaybeNumber(item.hashrate, 2)} GH/s`,
              `Power: ${formatMaybeNumber(item.power, 2)} W`,
              `Temp: ${formatMaybeNumber(item.temp, 1)} °C`,
              `VR Temp: ${formatMaybeNumber(item.vrTemp, 1)} °C`,
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
                  isHot ? "ring-2 ring-destructive ring-inset" : "",
                ].join(" ")}
                style={{ backgroundColor: bg }}
              >
                <div
                  className="absolute right-2 top-2 h-2 w-2 rounded-full"
                  style={{ backgroundColor: item.online ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}
                  aria-hidden
                />
                <div
                  className="text-sm font-semibold text-white"
                  style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.35)", strokeWidth: 3 }}
                >
                  {item.hostname}
                </div>
                <div
                  className="mt-1 font-accent text-xs text-white"
                  style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.35)", strokeWidth: 3 }}
                >
                  {formatMaybeNumber(item.hashrate, 2)} GH/s
                </div>
                <div
                  className="mt-1 flex items-center justify-between gap-2 text-xs text-white"
                  style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.35)", strokeWidth: 3 }}
                >
                  <span>
                    {formatMaybeNumber(item.temp, 1)}°C
                    <span className="opacity-90"> / </span>
                    {formatMaybeNumber(item.vrTemp, 1)}°C
                  </span>
                  <span className="opacity-90">{formatMaybeNumber(item.power, 0)}W</span>
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
