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
import { CircularProgressWithDots } from "@/components/ProgressBar/CircularProgressWithDots";
import { VendorStatCards, VendorCharts } from "@/components/VendorDetailPanel";
import { usePageTitle } from "@/providers/PageTitleProvider";
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
import {
  getHashrateGhs,
  getBestDifficulty,
  getBestSessionDifficulty,
  getUptime,
  getTemperatureAvg,
  getWattage,
  getSharesAccepted,
  getSharesRejected,
  getMaxChipTempFromHashboards,
} from "@/utils/minerDataHelpers";
import type { DiscoveredMiner, Preset } from "@pluto/interfaces";
import axios from "axios";

function formatNumber(value: number | undefined, digits = 2) {
  if (value === undefined || value === null) return "-";
  if (!Number.isFinite(value)) return "-";
  return value.toFixed(digits);
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

  const deviceId = useMemo(() => {
    try {
      return decodeURIComponent(id);
    } catch {
      return id;
    }
  }, [id]);

  const { setCustomTitle } = usePageTitle();

  useEffect(() => {
    if (!device) return;
    const m = device.minerData;
    const parts: string[] = [];
    const hostname = m?.hostname;
    const model = m?.deviceInfo?.model;
    if (hostname) parts.push(hostname);
    if (model) parts.push(model);
    const label = parts.length > 0 ? parts.join(" - ") : device.ip;
    setCustomTitle(`${label} (${device.mac}) Dashboard`);

    return () => setCustomTitle(null);
  }, [device, setCustomTitle]);

  const m = device?.minerData;

  const temperatureSeries = useMemo(
    () => [
      { key: "temp", label: "ASIC", color: "hsl(var(--chart-2))", points: temp },
    ],
    [temp]
  );

  const voltageSeries = useMemo(() => {
    const series: Array<{
      key: string;
      label: string;
      color: string;
      points: Array<{ t: number; v: number }>;
      renderOrder?: number;
    }> = [];

    const hasVoltageData = voltage.some((p) => p.v != null && Number.isFinite(p.v));
    if (hasVoltageData) {
      series.push({
        key: "voltage",
        label: "Input",
        color: "hsl(var(--chart-3))",
        points: voltage,
        renderOrder: 0,
      });
    }

    return series;
  }, [voltage]);

  const hasHashrate = m != null && m.hashrate?.rate != null;
  const hasShares =
    m != null && (m.sharesAccepted != null || m.sharesRejected != null);
  const hasPower = getWattage(m) != null;
  const chipTemp = getMaxChipTempFromHashboards(m);
  const hasTemps =
    getTemperatureAvg(m) != null ||
    chipTemp != null;
  const hasDifficulty =
    m != null &&
    (m.bestDifficulty != null || m.bestSessionDifficulty != null);
  const hasUptime = m != null && m.uptime != null;
  const hasEfficiency =
    efficiency.length > 0 &&
    (
      (getWattage(m) != null && typeof m?.hashrate?.rate === "number" && Number.isFinite(m.hashrate.rate)) ||
      (typeof m?.efficiency?.rate === "number" && Number.isFinite(m.efficiency.rate))
    );
  const hasFan =
    (m?.fans?.length ?? 0) > 0 &&
    typeof m?.fans?.[0]?.speed === "number" &&
    Number.isFinite(m?.fans?.[0]?.speed);
  const hasVoltage =
    (typeof m?.voltage === "number" && Number.isFinite(m.voltage)) ||
    (m?.hashboards?.[0] != null &&
      typeof (m.hashboards[0] as { voltage?: number }).voltage === "number" &&
      Number.isFinite((m.hashboards[0] as { voltage?: number }).voltage));


  useEffect(() => {
    const fetchDevice = async () => {
      setDeviceLoadState("loading");
      try {
        const response = await axios.get("/api/devices/imprint");
        const imprintedDevices: DiscoveredMiner[] = response.data.data;

        const found = imprintedDevices?.find((d) => d.mac === deviceId);
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
  }, [deviceId]);

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

        const sel = `{device_id="${deviceId}"}`;
        const queries = {
          hashrate: `pluto_device_hashrate_ghs${sel}`,
          power: `pluto_device_power_watts${sel}`,
          efficiency: `pluto_device_efficiency${sel}`,
          temp: `pluto_device_temperature_celsius${sel}`,
          fan: `pluto_device_fanspeed_rpm${sel}`,
          voltage: `pluto_device_voltage_volts${sel}`,
        };

        const options = { signal: controller.signal };

        const [hashrateRes, powerRes, effRes, tempRes, fanRes, voltRes] = await Promise.all([
          promQueryRange(queries.hashrate, start, end, step, options),
          promQueryRange(queries.power, start, end, step, options),
          promQueryRange(queries.efficiency, start, end, step, options),
          promQueryRange(queries.temp, start, end, step, options),
          promQueryRange(queries.fan, start, end, step, options),
          promQueryRange(queries.voltage, start, end, step, options),
        ]);

        if (cancelled || controller.signal.aborted) return;

        setHashrate(matrixToSeries((hashrateRes as any).data.result)[0]?.points ?? []);
        setPower(matrixToSeries((powerRes as any).data.result)[0]?.points ?? []);
        setEfficiency(matrixToSeries((effRes as any).data.result)[0]?.points ?? []);
        setTemp(matrixToSeries((tempRes as any).data.result)[0]?.points ?? []);
        setFan(matrixToSeries((fanRes as any).data.result)[0]?.points ?? []);
        setVoltage(matrixToSeries((voltRes as any).data.result)[0]?.points ?? []);
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
  }, [deviceId, rangeSeconds, refreshMs]);

  return (
    <div className="flex-1 py-6">
      <div className="mx-auto w-full max-w-[var(--pluto-content-max)] px-4 md:px-8">
        <div className="mb-3 md:mb-4" />

      {deviceLoadState === "loading" && (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-none border border-border bg-card py-16">
          <CircularProgressWithDots />
          <p className="mt-4 font-accent text-sm text-muted-foreground">Loading device data…</p>
        </div>
      )}

      {deviceLoadState === "not-found" && (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-none border border-border bg-card py-16">
          <p className="font-body text-lg text-muted-foreground">Device not found</p>
        </div>
      )}

      {deviceLoadState === "ready" && (
        <>
      <div className="grid gap-4 md:grid-cols-2">
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

      {/* Common stats grid */}
      <div className="mt-3 grid grid-cols-2 gap-4 md:mt-4 md:grid-cols-4 xl:grid-cols-4">
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
        {hasTemps && (
          <Card className="rounded-none">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle>Temperatures</CardTitle>
              <span className="ml-auto whitespace-nowrap font-accent text-xs text-muted-foreground">
                ASIC{chipTemp != null ? " | Chip" : ""}
              </span>
            </CardHeader>
            <CardContent>
              <p className="font-accent text-xl text-foreground">
                {formatNumber(getTemperatureAvg(m), 1)}°C
                {chipTemp != null && (
                  <>
                    <span className="text-muted-foreground"> | </span>
                    {formatNumber(chipTemp, 1)}°C
                  </>
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

      {/* Vendor-specific stat cards */}
      {device != null && (
        <div className="mt-3 grid grid-cols-2 gap-4 md:mt-4 md:grid-cols-4 xl:grid-cols-4">
          <VendorStatCards device={device} />
        </div>
      )}

      <ChartsToolbar
        className="mt-3 md:mt-4"
        range={range}
        onRangeChange={setRange}
        polling={polling}
        onPollingChange={setPolling}
        autoRefreshMs={autoRefreshMs}
      />

      {/* Common charts */}
      <div className="mt-3 grid gap-4 md:mt-4 md:grid-cols-2">
        {hasHashrate && (
          <LineChartCard title="Hashrate" points={hashrate} unit="GH/s" />
        )}
        {hasPower && (
          <LineChartCard title="Power" points={power} unit="W" curve="step" />
        )}
        {hasEfficiency && (
          <LineChartCard title="Efficiency" points={efficiency} unit="J/TH" />
        )}
        {hasTemps && (
          <MultiLineChartCard title="Temperatures" series={temperatureSeries} unit="°C" valueDigits={1} />
        )}
        {hasFan && (
          <LineChartCard title="Fan speed" points={fan} unit="RPM" />
        )}
        {hasVoltage && (
          <MultiLineChartCard title="Voltages" series={voltageSeries} unit="V" valueDigits={3} yDomain={[0, 6]} />
        )}
        {/* Vendor-specific charts */}
        {device != null && (
          <VendorCharts
            device={device}
            deviceId={deviceId}
            range={range}
            polling={polling}
            autoRefreshMs={autoRefreshMs}
          />
        )}
      </div>
        </>
      )}
    </div>
    </div>
  );
}
