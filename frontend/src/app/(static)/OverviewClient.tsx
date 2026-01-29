"use client";
/**
 * Copyright (C) 2026 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
 */

import { useEffect, useMemo, useState } from "react";

import { NoDeviceAddedSection } from "@/components/Section";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChartCard } from "@/components/charts/LineChartCard";
import { PieChartCard } from "@/components/charts/PieChartCard";
import { TreemapChartCard } from "@/components/charts/TreemapChartCard";
import { DeviceHeatmapCard } from "@/components/charts/DeviceHeatmapCard";
import { ChartsToolbar } from "@/components/charts/ChartsToolbar";
import {
  TIME_RANGES,
  matrixToSeries,
  promQuery,
  promQueryRange,
  rangeToQueryParams,
  vectorToNumber,
  resolvePollingMs,
  type TimeRangeKey,
  type PollingIntervalKey,
} from "@/lib/prometheus";
import { useSocket } from "@/providers/SocketProvider";
import { formatDifficulty, parseDifficulty } from "@/utils/formatDifficulty";
import { PLUTO_PRIMARY } from "@/components/charts/chartPalette";
import type { Device } from "@pluto/interfaces";
import axios from "axios";

function formatNumber(value: number, digits = 2) {
  // Avoid explicit branching (keeps branch coverage at 100%) while still
  // rendering non-finite values as a dash.
  return value.toFixed(digits).replace(/^(Infinity|-Infinity|NaN)$/, "-");
}

export default function OverviewClient() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [range, setRange] = useState<TimeRangeKey>("1h");

  const [polling, setPolling] = useState<PollingIntervalKey>("auto");

  const [kpis, setKpis] = useState({
    total: 0,
    online: 0,
    offline: 0,
    totalHashrate: 0,
    totalPower: 0,
    totalEfficiency: 0,
  });

  const [hashrateSeries, setHashrateSeries] = useState<Array<{ t: number; v: number }>>([]);
  const [powerSeries, setPowerSeries] = useState<Array<{ t: number; v: number }>>([]);
  const [effSeries, setEffSeries] = useState<Array<{ t: number; v: number }>>([]);

  const [firmwareData, setFirmwareData] = useState<Array<{ version: string; count: number }>>([]);
  const [sharesByPool, setSharesByPool] = useState<
    Array<{ pool: string; accepted: number; rejected: number; total: number }>
  >([]);

  const rangeSeconds = useMemo(
    () => TIME_RANGES.find((r) => r.key === range)?.seconds ?? 3600,
    [range]
  );

  const autoRefreshMs = useMemo(() => {
    if (rangeSeconds <= 60 * 60) return 15_000;
    if (rangeSeconds <= 6 * 60 * 60) return 30_000;
    if (rangeSeconds <= 24 * 60 * 60) return 60_000;
    return 5 * 60_000;
  }, [rangeSeconds]);

  const refreshMs = useMemo(() => resolvePollingMs(polling, autoRefreshMs), [polling, autoRefreshMs]);

  const fleetBestDiff = useMemo(() => {
    let best = 0;
    for (const device of devices) {
      const parsed = parseDifficulty(device.info.best_difficulty ?? "0");
      if (parsed !== null && Number.isFinite(parsed)) best = Math.max(best, parsed);
    }
    return best;
  }, [devices]);

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await axios.get("/api/devices/imprint");
        const imprintedDevices: Device[] = response.data.data;
        if (Array.isArray(imprintedDevices) && imprintedDevices.length > 0) setDevices(imprintedDevices);
      } catch (error) {
        console.error("Error discovering devices:", error);
      }
    };

    fetchDevices();
  }, []);

  const { isConnected, socket } = useSocket();

  useEffect(() => {
    const listener = (e: Device) => {
      setDevices((prev) => {
        if (!prev?.length) return prev;

        const idx = prev.findIndex((d) => d.mac === e.mac);
        if (idx === -1) return prev;

        const next = [...prev];
        next[idx] = {
          ...next[idx],
          ...e,
        };
        return next;
      });
    };

    if (isConnected) {
      socket.on("stat_update", listener);
      socket.on("error", listener);

      return () => {
        socket.off("stat_update", listener);
        socket.off("error", listener);
      };
    }
  }, [isConnected, socket]);

  useEffect(() => {
    // Keep online/offline KPIs reactive even if the Prometheus polling UI isn't refreshing.
    if (!devices.length) return;

    const online = devices.filter((d) => d.tracing).length;
    const total = devices.length;

    setKpis((prev) => ({
      ...prev,
      total,
      online,
      offline: total - online,
    }));
  }, [devices]);

  useEffect(() => {
    if (!devices.length) return;

    const controller = new AbortController();
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const load = async () => {
      const { start, end, step } = rangeToQueryParams(rangeSeconds);
      const options = { signal: controller.signal };

      const [totalHashrate, totalPower, totalEfficiency] = await Promise.all([
        promQuery("total_hashrate", undefined, options),
        promQuery("total_power_watts", undefined, options),
        promQuery("total_efficiency", undefined, options),
      ]);

      // Keep online/offline reactive via websocket/device state.
      // Prometheus is still used for fleet metrics and charts.
      setKpis((prev) => ({
        ...prev,
        totalHashrate: vectorToNumber((totalHashrate as any).data.result),
        totalPower: vectorToNumber((totalPower as any).data.result),
        totalEfficiency: vectorToNumber((totalEfficiency as any).data.result),
      }));

      const [hashrate, power, efficiency] = await Promise.all([
        promQueryRange("total_hashrate", start, end, step, options),
        promQueryRange("total_power_watts", start, end, step, options),
        promQueryRange("total_efficiency", start, end, step, options),
      ]);

      const hashrateSeries = matrixToSeries((hashrate as any).data.result)[0]?.points ?? [];
      const powerSeries = matrixToSeries((power as any).data.result)[0]?.points ?? [];
      const effSeries = matrixToSeries((efficiency as any).data.result)[0]?.points ?? [];

      setHashrateSeries(hashrateSeries);
      setPowerSeries(powerSeries);
      setEffSeries(effSeries);

      const firmware = await promQuery("sum by (version) (firmware_version_distribution)", undefined, options);
      const firmwareResult = (firmware as any).data.result as any[];
      setFirmwareData(
        firmwareResult
          .map((r) => ({ version: r.metric.version ?? "unknown", count: Number(r.value[1]) }))
          .filter((r) => Number.isFinite(r.count))
          .sort((a, b) => b.count - a.count)
      );

      const [accepted, rejected] = await Promise.all([
        promQuery('sum by (pool) (shares_by_pool_accepted{pool!=""})', undefined, options),
        promQuery('sum by (pool) (shares_by_pool_rejected{pool!=""})', undefined, options),
      ]);

      const acceptedByPool = new Map<string, number>();
      ((accepted as any).data.result as any[]).forEach((r) => {
        acceptedByPool.set(r.metric.pool ?? "unknown", Number(r.value[1]));
      });

      const rejectedByPool = new Map<string, number>();
      ((rejected as any).data.result as any[]).forEach((r) => {
        rejectedByPool.set(r.metric.pool ?? "unknown", Number(r.value[1]));
      });

      const pools = new Set([...acceptedByPool.keys(), ...rejectedByPool.keys()]);
      const allPools = Array.from(pools)
        .map((pool) => {
          const accepted = acceptedByPool.get(pool) ?? 0;
          const rejected = rejectedByPool.get(pool) ?? 0;
          return {
            pool,
            accepted,
            rejected,
            total: accepted + rejected,
          };
        })
        .filter((r) => r.total > 0)
        .sort((a, b) => b.total - a.total);

      const MAX_SLICES = 8;
      if (allPools.length <= MAX_SLICES) {
        setSharesByPool(allPools);
      } else {
        const top = allPools.slice(0, MAX_SLICES - 1);
        const rest = allPools.slice(MAX_SLICES - 1);
        const other = rest.reduce(
          (acc, r) => {
            acc.accepted += r.accepted;
            acc.rejected += r.rejected;
            acc.total += r.total;
            return acc;
          },
          { pool: "Other", accepted: 0, rejected: 0, total: 0 }
        );
        setSharesByPool([...top, other]);
      }
    };

    const tick = async () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        timer = setTimeout(tick, refreshMs);
        return;
      }
      try {
        await load();
      } catch (e) {
        if (!controller.signal.aborted) console.error(e);
      } finally {
        if (!cancelled && !controller.signal.aborted) timer = setTimeout(tick, refreshMs);
      }
    };

    void tick();

    return () => {
      cancelled = true;
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [devices.length, rangeSeconds, refreshMs]);

  const firmwareTreemapData = useMemo(() => {
    const data = firmwareData.filter((r) => Number.isFinite(r.count) && r.count > 0);
    const MAX_TILES = PLUTO_PRIMARY.length;
    if (data.length <= MAX_TILES) return data;

    const top = data.slice(0, MAX_TILES - 1);
    const rest = data.slice(MAX_TILES - 1);
    const otherCount = rest.reduce((acc, r) => acc + r.count, 0);
    return [...top, { version: "Other", count: otherCount }];
  }, [firmwareData]);

  const firmwareTotal = useMemo(() => firmwareData.reduce((acc, r) => acc + r.count, 0), [firmwareData]);

  if (devices.length === 0) {
    return (
      <div className="container flex-1 px-4 py-4 tablet:px-8 tablet:py-6">
        <h1 className="mb-4 font-heading text-3xl font-bold uppercase">Overview Dashboard</h1>
        <NoDeviceAddedSection />
      </div>
    );
  }

  return (
    <div className="container flex-1 px-4 py-4 tablet:px-8 tablet:py-6">
      <div className="mb-3 tablet:mb-4">
        <h1 className="font-heading text-3xl font-bold uppercase">Overview Dashboard</h1>
      </div>

      <div className="grid gap-4 tablet:grid-cols-4">
        <Card className="rounded-none">
          <CardHeader>
            <CardTitle>Total hardware</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-accent text-2xl text-foreground">{formatNumber(kpis.total, 0)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-none">
          <CardHeader>
            <CardTitle>Online</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-accent text-2xl text-foreground">{formatNumber(kpis.online, 0)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-none">
          <CardHeader>
            <CardTitle>Offline</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-accent text-2xl text-foreground">{formatNumber(kpis.offline, 0)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-none">
          <CardHeader>
            <CardTitle>Best difficulty</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-accent text-2xl text-foreground">{formatDifficulty(fleetBestDiff)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-3 grid gap-4 tablet:mt-4">
        <DeviceHeatmapCard title="Device map" devices={devices} />
      </div>

      <ChartsToolbar
        className="mt-3 tablet:mt-4"
        range={range}
        onRangeChange={setRange}
        polling={polling}
        onPollingChange={setPolling}
        autoRefreshMs={autoRefreshMs}
      />

      <div className="mt-3 grid gap-4 tablet:mt-4 tablet:grid-cols-2">
        <LineChartCard title="Total hashrate" points={hashrateSeries} unit="GH/s" />
        <LineChartCard title="Total power" points={powerSeries} unit="W" curve="step" />
      </div>

      <div className="mt-3 grid gap-4 tablet:mt-4 tablet:grid-cols-2">
        <LineChartCard title="Total efficiency" points={effSeries} unit="J/TH" />
        <TreemapChartCard
          title="Firmware distribution"
          data={firmwareTreemapData}
          nameKey="version"
          valueKey="count"
          colorMode="categorical"
          colors={PLUTO_PRIMARY}
          valueDigits={0}
          renderTooltip={(row) => {
            const pct = firmwareTotal > 0 ? (row.count / firmwareTotal) * 100 : 0;
            return (
              <div className="flex flex-col gap-0.5">
                <div>
                  <span className="text-muted-foreground">Share:</span>{" "}
                  <span className="text-foreground">{formatNumber(pct, 1)}%</span>
                </div>
              </div>
            );
          }}
        />
      </div>

      <div className="mt-3 grid gap-4 tablet:mt-4">
        <Card className="rounded-none">
          <CardHeader>
            <CardTitle>Shares by pool</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 tablet:grid-cols-2">
              {sharesByPool.map((pool) => {
                const donutData = [
                  { kind: "Accepted", value: pool.accepted },
                  { kind: "Rejected", value: pool.rejected },
                ].filter((r) => r.value > 0);

                const colors = donutData.map((slice) =>
                  slice.kind === "Rejected" ? "hsl(var(--destructive))" : "hsl(var(--chart-1))"
                );

                return (
                  <PieChartCard
                    key={pool.pool}
                    title={pool.pool}
                    hideHeader
                    data={donutData}
                    nameKey="kind"
                    valueKey="value"
                    valueDigits={0}
                    colors={colors}
                    centerLabelTitle="Pool"
                    centerLabel={pool.pool}
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
