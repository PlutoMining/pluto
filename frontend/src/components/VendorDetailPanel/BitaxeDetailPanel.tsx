"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChartCard } from "@/components/charts/LineChartCard";
import { MultiLineChartCard } from "@/components/charts/MultiLineChartCard";
import {
  getBitaxeFrequency,
  getBitaxeFreeHeapBytes,
  getBitaxeCoreVoltageVolts,
} from "@/utils/minerDataHelpers";
import {
  TIME_RANGES,
  matrixToSeries,
  promQueryRange,
  rangeToQueryParams,
  resolvePollingMs,
} from "@/lib/prometheus";
import type { VendorDetailPanelProps } from "./VendorDetailPanelRegistry";

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

export const BitaxeStatCards: React.FC<Pick<VendorDetailPanelProps, "device">> = ({ device }) => {
  const m = device?.minerData;

  const psramAvailable = useMemo(
    () => (m?.bitaxe?.isPSRAMAvailable ?? 0) === 1,
    [m]
  );

  const coreVoltageConfig = useMemo(() => getBitaxeCoreVoltageVolts(m), [m]);
  const freeHeapCurrentMb = useMemo(() => bytesToMb(getBitaxeFreeHeapBytes(m)), [m]);
  const freeHeapInternalCurrentMb = useMemo(() => bytesToMb(m?.bitaxe?.freeHeapInternal), [m]);
  const freeHeapSpiramCurrentMb = useMemo(() => bytesToMb(m?.bitaxe?.freeHeapSpiram), [m]);

  const hasFrequency = getBitaxeFrequency(m) != null;
  const hasFreeHeap =
    getBitaxeFreeHeapBytes(m) != null ||
    freeHeapInternalCurrentMb != null ||
    freeHeapSpiramCurrentMb != null;

  if (!hasFrequency && coreVoltageConfig == null && !hasFreeHeap) return null;

  return (
    <>
      {hasFrequency && (
        <Card className="rounded-none">
          <CardHeader>
            <CardTitle>Frequency</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-accent text-xl text-foreground">
              {formatNumber(getBitaxeFrequency(m), 0)} MHz
            </p>
          </CardContent>
        </Card>
      )}
      {coreVoltageConfig != null && (
        <Card className="rounded-none">
          <CardHeader>
            <CardTitle>Core voltage</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-accent text-xl text-foreground">
              {formatNumber(coreVoltageConfig, 3)} V
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
              {freeHeapCurrentMb != null ? (
                <>{formatNumber(freeHeapCurrentMb, 2)} MB</>
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
    </>
  );
};

export const BitaxeCharts: React.FC<VendorDetailPanelProps> = ({
  device,
  deviceId,
  range,
  polling,
  autoRefreshMs,
}) => {
  const m = device?.minerData;

  const [frequency, setFrequency] = useState<Array<{ t: number; v: number }>>([]);
  const [freeHeapMb, setFreeHeapMb] = useState<Array<{ t: number; v: number }>>([]);
  const [freeHeapInternalMb, setFreeHeapInternalMb] = useState<Array<{ t: number; v: number }>>([]);
  const [freeHeapSpiramMb, setFreeHeapSpiramMb] = useState<Array<{ t: number; v: number }>>([]);

  const rangeSeconds = useMemo(
    () => TIME_RANGES.find((r) => r.key === range)?.seconds ?? 3600,
    [range]
  );
  const refreshMs = useMemo(() => resolvePollingMs(polling, autoRefreshMs), [polling, autoRefreshMs]);

  const psramAvailable = useMemo(
    () => (m?.bitaxe?.isPSRAMAvailable ?? 0) === 1,
    [m]
  );

  const hasFrequency = getBitaxeFrequency(m) != null;
  const hasFreeHeap =
    getBitaxeFreeHeapBytes(m) != null ||
    (m?.bitaxe?.freeHeapInternal != null) ||
    (m?.bitaxe?.freeHeapSpiram != null);

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

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const load = async () => {
      try {
        const { start, end, step } = rangeToQueryParams(rangeSeconds);
        const sel = `{device_id="${deviceId}"}`;
        const options = { signal: controller.signal };

        const [freqRes, freeHeapRes, freeHeapInternalRes, freeHeapSpiramRes] = await Promise.all([
          promQueryRange(`pluto_device_frequency_mhz${sel}`, start, end, step, options),
          promQueryRange(`pluto_device_free_heap_bytes${sel}`, start, end, step, options),
          promQueryRange(`pluto_device_free_heap_internal_bytes${sel}`, start, end, step, options),
          promQueryRange(`pluto_device_free_heap_spiram_bytes${sel}`, start, end, step, options),
        ]);

        if (cancelled || controller.signal.aborted) return;

        setFrequency(matrixToSeries((freqRes as any).data.result)[0]?.points ?? []);

        const freeHeapPoints = matrixToSeries((freeHeapRes as any).data.result)[0]?.points ?? [];
        setFreeHeapMb(freeHeapPoints.map((p) => ({ t: p.t, v: p.v / (1024 * 1024) })));

        const freeHeapInternalPoints = matrixToSeries((freeHeapInternalRes as any).data.result)[0]?.points ?? [];
        setFreeHeapInternalMb(freeHeapInternalPoints.map((p) => ({ t: p.t, v: p.v / (1024 * 1024) })));

        const freeHeapSpiramPoints = matrixToSeries((freeHeapSpiramRes as any).data.result)[0]?.points ?? [];
        setFreeHeapSpiramMb(freeHeapSpiramPoints.map((p) => ({ t: p.t, v: p.v / (1024 * 1024) })));
      } catch (error: any) {
        if (controller.signal.aborted || error?.name === "AbortError") return;
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

  if (!hasFrequency && !hasFreeHeap) return null;

  return (
    <>
      {hasFrequency && (
        <LineChartCard title="Frequency" points={frequency} unit="MHz" curve="step" />
      )}
      {hasFreeHeap && (
        <MultiLineChartCard
          title="Free heap"
          unit="MB"
          valueDigits={2}
          series={heapSeries}
        />
      )}
    </>
  );
};
