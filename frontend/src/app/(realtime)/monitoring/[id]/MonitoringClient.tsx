"use client";
/**
 * Copyright (C) 2026 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
 */

import { useEffect, useMemo, useState } from "react";

import { LineChartCard } from "@/components/charts/LineChartCard";
import { MultiLineChartCard } from "@/components/charts/MultiLineChartCard";
import { ChartsToolbar } from "@/components/charts/ChartsToolbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CircularProgressWithDots } from "@/components/ProgressBar/CircularProgressWithDots";
import { useSocket } from "@/providers/SocketProvider";
import { formatDifficulty } from "@/utils/formatDifficulty";
import { formatDetailedTime, formatTime } from "@/utils/formatTime";
import {
  TIME_RANGES,
  matrixToSeries,
  promQueryRange,
  rangeToQueryParams,
  resolvePollingMs,
  type TimeRangeKey,
  type PollingIntervalKey,
} from "@/lib/prometheus";
import { sanitizeHostname } from "@pluto/utils";
import {
  getHostname,
  getHashrateGhs,
  getBestDifficulty,
  getBestSessionDifficulty,
  getUptime,
  getTemperatureAvg,
  getWattage,
  getSharesAccepted,
  getSharesRejected,
  getExtraConfigFrequency,
  getExtraConfigFreeHeapBytes,
  getMaxChipTempFromHashboards,
  getExtraConfigCoreVoltageVolts,
} from "@/utils/minerDataHelpers";
import type { DiscoveredMiner, Preset } from "@pluto/interfaces";
import axios from "axios";

function formatNumber(value: number | undefined, digits = 2) {
  if (value === undefined || value === null) return "-";
  if (!Number.isFinite(value)) return "-";
  return value.toFixed(digits);
}

function bytesToMb(value: number | undefined) {
  if (value === undefined || value === null) return undefined;
  if (!Number.isFinite(value)) return undefined;
  return value / (1024 * 1024);
}

type DeviceLoadState = "loading" | "ready" | "not-found";

export default function MonitoringClient({ id }: { id: string }) {
  const [device, setDevice] = useState<DiscoveredMiner | undefined>(undefined);
  const [deviceLoadState, setDeviceLoadState] = useState<DeviceLoadState>("loading");
  const [preset, setPreset] = useState<Partial<Preset> | undefined>(undefined);

  const [range, setRange] = useState<TimeRangeKey>("1h");

  const [polling, setPolling] = useState<PollingIntervalKey>("auto");

  const [hashrate, setHashrate] = useState<Array<{ t: number; v: number }>>([]);
  const [power, setPower] = useState<Array<{ t: number; v: number }>>([]);
  const [efficiency, setEfficiency] = useState<Array<{ t: number; v: number }>>([]);
  const [temp, setTemp] = useState<Array<{ t: number; v: number }>>([]);
  const [fan, setFan] = useState<Array<{ t: number; v: number }>>([]);
  const [voltage, setVoltage] = useState<Array<{ t: number; v: number }>>([]);
  const [frequency, setFrequency] = useState<Array<{ t: number; v: number }>>([]);
  const [freeHeapMb, setFreeHeapMb] = useState<Array<{ t: number; v: number }>>([]);
  const [freeHeapInternalMb, setFreeHeapInternalMb] = useState<Array<{ t: number; v: number }>>([]);
  const [freeHeapSpiramMb, setFreeHeapSpiramMb] = useState<Array<{ t: number; v: number }>>([]);

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

  const host = useMemo(() => sanitizeHostname(id), [id]);

  const temperatureSeries = useMemo(
    () => [
      { key: "temp", label: "ASIC", color: "hsl(var(--chart-2))", points: temp },
    ],
    [temp]
  );

  const m = device?.minerData;

  const coreVoltageConfig = useMemo(() => getExtraConfigCoreVoltageVolts(m), [m]);

  const voltageSeries = useMemo(() => {
    const series: Array<{
      key: string;
      label: string;
      color: string;
      points: Array<{ t: number; v: number }>;
      strokeDasharray?: string;
      strokeLinecap?: "butt" | "round" | "square";
      strokeOpacity?: number;
      renderOrder?: number;
    }> = [];

    const hasVoltage = voltage.some((p) => p.v != null && Number.isFinite(p.v));
    if (hasVoltage) {
      series.push({
        key: "voltage",
        label: "Input",
        color: "hsl(var(--chart-3))",
        points: voltage,
        renderOrder: 0,
      });
    }

    if (coreVoltageConfig != null && hasVoltage) {
      const corePoints = voltage.map((p) => ({ t: p.t, v: coreVoltageConfig }));
      series.push({
        key: "coreConfig",
        label: "Core (actual)",
        color: "hsl(var(--chart-2))",
        points: corePoints,
        strokeOpacity: 1,
        renderOrder: 1,
      });
    }

    return series;
  }, [voltage, coreVoltageConfig]);

  const psramAvailable = useMemo(
    () => Number((m as Record<string, unknown>)?.isPSRAMAvailable) === 1,
    [m]
  );

  const heapSeries = useMemo(() => {
    const series: Array<{
      key: string;
      label: string;
      color: string;
      points: Array<{ t: number; v: number }>;
      strokeWidth?: number;
      strokeDasharray?: string;
      strokeLinecap?: "butt" | "round" | "square";
      renderOrder?: number;
    }> = [
      {
        key: "total",
        label: "Total",
        color: "hsl(var(--chart-1))",
        points: freeHeapMb,
        strokeWidth: 2,
        renderOrder: 0,
      },
    ];

    if (psramAvailable && freeHeapSpiramMb.length > 0) {
      series.push({
        key: "psram",
        label: "PSRAM",
        color: "hsl(var(--chart-2))",
        points: freeHeapSpiramMb,
        strokeDasharray: "5 7",
        strokeLinecap: "butt" as const,
        strokeWidth: 2,
        renderOrder: 1,
      });
    }

    if (psramAvailable && freeHeapInternalMb.length > 0) {
      series.push({
        key: "internal",
        label: "Internal",
        color: "hsl(var(--chart-5))",
        points: freeHeapInternalMb,
        strokeDasharray: "2 4",
        strokeLinecap: "butt" as const,
        strokeWidth: 2,
        renderOrder: 2,
      });
    }

    return series;
  }, [freeHeapInternalMb, freeHeapMb, freeHeapSpiramMb, psramAvailable]);

  const freeHeapFromExtraConfigMb = useMemo(
    () => bytesToMb(getExtraConfigFreeHeapBytes(m)),
    [m]
  );
  const freeHeapInternalCurrentMb = useMemo(
    () => bytesToMb((m as Record<string, unknown>)?.freeHeapInternal as number | undefined),
    [m]
  );
  const freeHeapSpiramCurrentMb = useMemo(
    () => bytesToMb((m as Record<string, unknown>)?.freeHeapSpiram as number | undefined),
    [m]
  );

  const hasHashrate = m != null && m.hashrate?.rate != null;
  const hasShares =
    m != null && (m.shares_accepted != null || m.shares_rejected != null);
  const hasPower = getWattage(m) != null;
  const hasFrequency = getExtraConfigFrequency(m) != null;
  const hasTemps =
    getTemperatureAvg(m) != null ||
    getMaxChipTempFromHashboards(m) != null;
  const hasFreeHeap =
    getExtraConfigFreeHeapBytes(m) != null ||
    freeHeapInternalCurrentMb != null ||
    freeHeapSpiramCurrentMb != null;
  const hasDifficulty =
    m != null &&
    (m.best_difficulty != null || m.best_session_difficulty != null);
  const hasUptime = m != null && m.uptime != null;

  useEffect(() => {
    const fetchDevice = async () => {
      setDeviceLoadState("loading");
      try {
        const response = await axios.get("/api/devices/imprint");
        const imprintedDevices: DiscoveredMiner[] = response.data.data;

        const found = imprintedDevices?.find((d) => getHostname(d.minerData) === id);
        setDevice(found);
        setDeviceLoadState(found != null ? "ready" : "not-found");

        if (found?.presetUuid) {
          const presetResponse = await fetch("/api/presets");
          if (presetResponse.ok) {
            const data: { data: Preset[] } = await presetResponse.json();
            const newData = data.data.find((p) => p.uuid === found.presetUuid);
            if (newData) {
              setPreset(newData);
            }
          }
        }
      } catch (error) {
        console.error("Error discovering devices:", error);
        setDeviceLoadState("not-found");
      }
    };

    fetchDevice();
  }, [id]);

  const { isConnected, socket } = useSocket();

  useEffect(() => {
    const listener = (e: DiscoveredMiner) => {
      if (e.mac !== device?.mac) return;
      setDevice(e);
    };

    if (isConnected) {
      socket.on("stat_update", listener);
      socket.on("error", listener);

      return () => {
        socket.off("stat_update", listener);
        socket.off("error", listener);
      };
    }
  }, [isConnected, socket, device]);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const load = async () => {
      try {
        const { start, end, step } = rangeToQueryParams(rangeSeconds);

        const queries = {
          hashrate: `${host}_hashrate_ghs`,
          power: `${host}_power_watts`,
          efficiency: `${host}_efficiency`,
          temp: `${host}_temperature_celsius`,
          fan: `${host}_fanspeed_rpm`,
          voltage: `${host}_voltage_volts`,
          frequency: `${host}_frequency_mhz`,
          freeHeap: `${host}_free_heap_bytes`,
          freeHeapInternal: `${host}_free_heap_internal_bytes`,
          freeHeapSpiram: `${host}_free_heap_spiram_bytes`,
        };

        const options = { signal: controller.signal };

        const [
          hashrateRes,
          powerRes,
          effRes,
          tempRes,
          fanRes,
          voltRes,
          freqRes,
          freeHeapRes,
          freeHeapInternalRes,
          freeHeapSpiramRes,
        ] = await Promise.all([
          promQueryRange(queries.hashrate, start, end, step, options),
          promQueryRange(queries.power, start, end, step, options),
          promQueryRange(queries.efficiency, start, end, step, options),
          promQueryRange(queries.temp, start, end, step, options),
          promQueryRange(queries.fan, start, end, step, options),
          promQueryRange(queries.voltage, start, end, step, options),
          promQueryRange(queries.frequency, start, end, step, options),
          promQueryRange(queries.freeHeap, start, end, step, options),
          promQueryRange(queries.freeHeapInternal, start, end, step, options),
          promQueryRange(queries.freeHeapSpiram, start, end, step, options),
        ]);

        if (cancelled || controller.signal.aborted) return;

        setHashrate(matrixToSeries((hashrateRes as any).data.result)[0]?.points ?? []);
        setPower(matrixToSeries((powerRes as any).data.result)[0]?.points ?? []);
        setEfficiency(matrixToSeries((effRes as any).data.result)[0]?.points ?? []);
        setTemp(matrixToSeries((tempRes as any).data.result)[0]?.points ?? []);
        setFan(matrixToSeries((fanRes as any).data.result)[0]?.points ?? []);
        setVoltage(matrixToSeries((voltRes as any).data.result)[0]?.points ?? []);
        setFrequency(matrixToSeries((freqRes as any).data.result)[0]?.points ?? []);

        const freeHeapPoints = matrixToSeries((freeHeapRes as any).data.result)[0]?.points ?? [];
        setFreeHeapMb(
          freeHeapPoints.map((p) => ({
            t: p.t,
            v: p.v / (1024 * 1024),
          }))
        );

        const freeHeapInternalPoints = matrixToSeries((freeHeapInternalRes as any).data.result)[0]?.points ?? [];
        setFreeHeapInternalMb(
          freeHeapInternalPoints.map((p) => ({
            t: p.t,
            v: p.v / (1024 * 1024),
          }))
        );

        const freeHeapSpiramPoints = matrixToSeries((freeHeapSpiramRes as any).data.result)[0]?.points ?? [];
        setFreeHeapSpiramMb(
          freeHeapSpiramPoints.map((p) => ({
            t: p.t,
            v: p.v / (1024 * 1024),
          }))
        );
      } catch (error: any) {
        if (controller.signal.aborted) return;
        if (error?.name === "AbortError") return;
        console.error(error);
      }
    };

    const tick = async () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        timer = setTimeout(tick, refreshMs);
        return;
      }
      try {
        await load();
      } finally {
        if (!cancelled && !controller.signal.aborted) timer = setTimeout(tick, refreshMs);
      }
    };

    void tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      controller.abort();
    };
  }, [host, rangeSeconds, refreshMs]);

  return (
    <div className="container flex-1 px-4 py-4 tablet:px-8 tablet:py-6">
      <div className="mb-3 flex flex-col gap-4 tablet:mb-4 tablet:flex-row tablet:items-center tablet:justify-between">
        <div className="flex items-center gap-3">
          <NextLink href="/monitoring">
            <Button variant="outlined">Go back</Button>
          </NextLink>
          <h1 className="font-heading text-3xl font-bold uppercase">{id} Dashboard</h1>
        </div>
      </div>

      {deviceLoadState === "loading" && (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-none border border-border bg-card py-16">
          <CircularProgressWithDots />
          <p className="mt-4 font-accent text-sm text-muted-foreground">Loading device data…</p>
        </div>
      )}

      {deviceLoadState === "not-found" && (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-none border border-border bg-card py-16">
          <p className="font-body text-lg text-muted-foreground">Device not found</p>
          <NextLink href="/monitoring" className="mt-4">
            <Button variant="outlined">Back to monitoring</Button>
          </NextLink>
        </div>
      )}

      {deviceLoadState === "ready" && (
        <>
      <div className="grid gap-4 tablet:grid-cols-2">
        {device != null && (
          <Card className="rounded-none">
            <CardHeader>
              <CardTitle>Device status</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-accent text-sm">
                <span className={device?.tracing ? "text-primary" : "text-muted-foreground"}>
                  {device?.tracing ? "online" : "offline"}
                </span>
              </p>
            </CardContent>
          </Card>
        )}

        {device != null && (
          <Card className="rounded-none">
            <CardHeader>
              <CardTitle>Pool preset</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-accent text-sm text-foreground">{preset ? preset.name : "Custom"}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-4 tablet:mt-4 tablet:grid-cols-4 desktop:grid-cols-4">
        {hasHashrate && (
          <Card className="rounded-none">
            <CardHeader>
              <CardTitle>Hashrate</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-accent text-xl text-foreground">
                {formatNumber(getHashrateGhs(m), 2)} GH/s
              </p>
            </CardContent>
          </Card>
        )}
        {hasShares && (
          <Card className="rounded-none">
            <CardHeader>
              <CardTitle>Shares</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-accent text-xl text-foreground">
                {getSharesAccepted(m)} <span className="text-muted-foreground">|</span>{" "}
                <span className="text-destructive">{getSharesRejected(m)}</span>
              </p>
            </CardContent>
          </Card>
        )}
        {hasPower && (
          <Card className="rounded-none">
            <CardHeader>
              <CardTitle>Power</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-accent text-xl text-foreground">{formatNumber(getWattage(m), 2)} W</p>
            </CardContent>
          </Card>
        )}
        {hasFrequency && (
          <Card className="rounded-none">
            <CardHeader>
              <CardTitle>Frequency</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-accent text-xl text-foreground">
                {formatNumber(getExtraConfigFrequency(m), 0)} MHz
              </p>
            </CardContent>
          </Card>
        )}
        {hasTemps && (
          <Card className="rounded-none">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle>Temperatures</CardTitle>
              <span className="ml-auto whitespace-nowrap font-accent text-xs text-muted-foreground">
                ASIC | Chip
              </span>
            </CardHeader>
            <CardContent>
              <p className="font-accent text-xl text-foreground">
                {formatNumber(getTemperatureAvg(m), 1)}°C
                <span className="text-muted-foreground"> | </span>
                {formatNumber(getMaxChipTempFromHashboards(m), 1)}°C
              </p>
            </CardContent>
          </Card>
        )}
        {hasFreeHeap && (
          <Card className="rounded-none">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle>Free heap</CardTitle>
              <span className="ml-auto whitespace-nowrap font-accent text-xs text-muted-foreground">
                {psramAvailable ? "Internal | PSRAM" : "Internal"}
              </span>
            </CardHeader>
            <CardContent>
              <p className="font-accent text-xl text-foreground">
                {freeHeapFromExtraConfigMb != null ? (
                  <>{formatNumber(freeHeapFromExtraConfigMb, 2)} MB</>
                ) : psramAvailable ? (
                  <>
                    {formatNumber(freeHeapInternalCurrentMb, 2)} MB <span className="text-muted-foreground">|</span>{" "}
                    {formatNumber(freeHeapSpiramCurrentMb, 2)} MB
                  </>
                ) : (
                  <>{formatNumber(freeHeapInternalCurrentMb, 2)} MB</>
                )}
              </p>
            </CardContent>
          </Card>
        )}
        {hasDifficulty && (
          <Card className="rounded-none">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle>Difficulty</CardTitle>
              <span className="ml-auto whitespace-nowrap font-accent text-xs text-muted-foreground">Current | Best</span>
            </CardHeader>
            <CardContent>
              <p className="font-accent text-xl text-foreground">
                {formatDifficulty(getBestSessionDifficulty(m))}
                <span className="text-muted-foreground"> | </span>
                {formatDifficulty(getBestDifficulty(m))}
              </p>
            </CardContent>
          </Card>
        )}
        {hasUptime && (
          <Card className="rounded-none">
            <CardHeader>
              <CardTitle>Uptime</CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className="font-accent text-xl text-foreground"
                title={getUptime(m) ? formatDetailedTime(getUptime(m)) : "-"}
              >
                {getUptime(m) ? formatTime(getUptime(m)) : "-"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <ChartsToolbar
        className="mt-3 md:mt-4"
        range={range}
        onRangeChange={setRange}
        polling={polling}
        onPollingChange={setPolling}
        autoRefreshMs={autoRefreshMs}
      />

      <div className="mt-3 grid gap-4 md:mt-4 md:grid-cols-2">
        <LineChartCard title="Hashrate" points={hashrate} unit="GH/s" />
        <LineChartCard title="Power" points={power} unit="W" curve="step" />
      </div>

      <div className="mt-3 grid gap-4 md:mt-4 md:grid-cols-2">
        <LineChartCard title="Efficiency" points={efficiency} unit="J/TH" />
        <MultiLineChartCard title="Temperatures" series={temperatureSeries} unit="°C" valueDigits={1} />
      </div>

      <div className="mt-3 grid gap-4 md:mt-4 md:grid-cols-2">
        <LineChartCard title="Fan speed" points={fan} unit="RPM" />
        <MultiLineChartCard title="Voltages" series={voltageSeries} unit="V" valueDigits={3} yDomain={[0, 6]} />
      </div>

      <div className="mt-3 grid gap-4 md:mt-4 md:grid-cols-2">
        <LineChartCard title="Frequency" points={frequency} unit="MHz" curve="step" />
        <MultiLineChartCard
          title="Free heap"
          unit="MB"
          valueDigits={2}
          series={heapSeries}
        />
      </div>
        </>
      )}
    </div>
  );
}
