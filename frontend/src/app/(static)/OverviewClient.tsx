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
import { TimeRangeSelect } from "@/components/charts/TimeRangeSelect";
import {
  TIME_RANGES,
  matrixToSeries,
  promQuery,
  promQueryRange,
  rangeToQueryParams,
  vectorToNumber,
  type TimeRangeKey,
} from "@/lib/prometheus";
import type { Device } from "@pluto/interfaces";
import axios from "axios";

function formatNumber(value: number, digits = 2) {
  if (!Number.isFinite(value)) return "-";
  return value.toFixed(digits);
}

export default function OverviewClient() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [range, setRange] = useState<TimeRangeKey>("1h");

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

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await axios.get("/api/devices/imprint");
        const imprintedDevices: Device[] = response.data.data;
        if (imprintedDevices) setDevices(imprintedDevices);
      } catch (error) {
        console.error("Error discovering devices:", error);
      }
    };

    fetchDevices();
  }, []);

  useEffect(() => {
    const load = async () => {
      const { start, end, step } = rangeToQueryParams(rangeSeconds);

      const [total, online, offline, totalHashrate, totalPower, totalEfficiency] = await Promise.all([
        promQuery("total_hardware"),
        promQuery("hardware_online"),
        promQuery("hardware_offline"),
        promQuery("total_hashrate"),
        promQuery("total_power_watts"),
        promQuery("total_efficiency"),
      ]);

      setKpis({
        total: vectorToNumber((total as any).data.result),
        online: vectorToNumber((online as any).data.result),
        offline: vectorToNumber((offline as any).data.result),
        totalHashrate: vectorToNumber((totalHashrate as any).data.result),
        totalPower: vectorToNumber((totalPower as any).data.result),
        totalEfficiency: vectorToNumber((totalEfficiency as any).data.result),
      });

      const [hashrate, power, efficiency] = await Promise.all([
        promQueryRange("total_hashrate", start, end, step),
        promQueryRange("total_power_watts", start, end, step),
        promQueryRange("total_efficiency", start, end, step),
      ]);

      const hashrateSeries = matrixToSeries((hashrate as any).data.result)[0]?.points ?? [];
      const powerSeries = matrixToSeries((power as any).data.result)[0]?.points ?? [];
      const effSeries = matrixToSeries((efficiency as any).data.result)[0]?.points ?? [];

      setHashrateSeries(hashrateSeries);
      setPowerSeries(powerSeries);
      setEffSeries(effSeries);

      const firmware = await promQuery("sum by (version) (firmware_version_distribution)");
      const firmwareResult = (firmware as any).data.result as any[];
      setFirmwareData(
        firmwareResult
          .map((r) => ({ version: r.metric.version ?? "unknown", count: Number(r.value[1]) }))
          .filter((r) => Number.isFinite(r.count))
          .sort((a, b) => b.count - a.count)
      );

      const [accepted, rejected] = await Promise.all([
        promQuery('sum by (pool) (shares_by_pool_accepted{pool!=""})'),
        promQuery('sum by (pool) (shares_by_pool_rejected{pool!=""})'),
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

    load().catch((e) => console.error(e));
  }, [rangeSeconds, range]);

  const firmwareTreemapData = useMemo(() => {
    const data = firmwareData.filter((r) => Number.isFinite(r.count) && r.count > 0);
    const MAX_TILES = 12;
    if (data.length <= MAX_TILES) return data;

    const top = data.slice(0, MAX_TILES - 1);
    const rest = data.slice(MAX_TILES - 1);
    const otherCount = rest.reduce((acc, r) => acc + r.count, 0);
    return [...top, { version: "Other", count: otherCount }];
  }, [firmwareData]);

  const firmwareTotal = useMemo(
    () => firmwareData.reduce((acc, r) => acc + (Number.isFinite(r.count) ? r.count : 0), 0),
    [firmwareData]
  );

  if (devices.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[1440px] px-4 py-4 tablet:px-8">
        <h1 className="mb-4 font-heading text-3xl font-bold uppercase text-foreground">Overview Dashboard</h1>
        <NoDeviceAddedSection />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-4 tablet:px-8">
      <div className="mb-4 flex flex-col gap-3 tablet:flex-row tablet:items-center tablet:justify-between">
        <h1 className="font-heading text-3xl font-bold uppercase text-foreground">Overview Dashboard</h1>
        <TimeRangeSelect value={range} onChange={setRange} />
      </div>

      <div className="grid gap-4 tablet:grid-cols-3">
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
      </div>

      <div className="mt-4 grid gap-4 tablet:grid-cols-2">
        <LineChartCard title="Total hashrate" points={hashrateSeries} unit="GH/s" />
        <LineChartCard title="Total power" points={powerSeries} unit="W" curve="step" />
      </div>

      <div className="mt-4 grid gap-4 tablet:grid-cols-2">
        <LineChartCard title="Total efficiency" points={effSeries} unit="W/TH" />
        <TreemapChartCard
          title="Firmware distribution"
          data={firmwareTreemapData}
          nameKey="version"
          valueKey="count"
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

      <div className="mt-4 grid gap-4">
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

                if (donutData.length === 0) return null;

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
