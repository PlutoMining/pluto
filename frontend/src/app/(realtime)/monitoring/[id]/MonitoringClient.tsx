"use client";
/**
 * Copyright (C) 2026 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
 */

import NextLink from "next/link";
import { useEffect, useMemo, useState } from "react";

import { LineChartCard } from "@/components/charts/LineChartCard";
import { MultiLineChartCard } from "@/components/charts/MultiLineChartCard";
import { TimeRangeSelect } from "@/components/charts/TimeRangeSelect";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSocket } from "@/providers/SocketProvider";
import { formatDifficulty } from "@/utils/formatDifficulty";
import { formatDetailedTime, formatTime } from "@/utils/formatTime";
import {
  TIME_RANGES,
  matrixToSeries,
  promQueryRange,
  rangeToQueryParams,
  type TimeRangeKey,
} from "@/lib/prometheus";
import { sanitizeHostname } from "@pluto/utils";
import type { Device, Preset } from "@pluto/interfaces";
import axios from "axios";

function formatNumber(value: number | undefined, digits = 2) {
  if (value === undefined || value === null) return "-";
  if (!Number.isFinite(value)) return "-";
  return value.toFixed(digits);
}

export default function MonitoringClient({ id }: { id: string }) {
  const [device, setDevice] = useState<Device | undefined>(undefined);
  const [preset, setPreset] = useState<Partial<Preset> | undefined>(undefined);

  const [range, setRange] = useState<TimeRangeKey>("1h");

  const [hashrate, setHashrate] = useState<Array<{ t: number; v: number }>>([]);
  const [power, setPower] = useState<Array<{ t: number; v: number }>>([]);
  const [efficiency, setEfficiency] = useState<Array<{ t: number; v: number }>>([]);
  const [temp, setTemp] = useState<Array<{ t: number; v: number }>>([]);
  const [vrTemp, setVrTemp] = useState<Array<{ t: number; v: number }>>([]);
  const [fan, setFan] = useState<Array<{ t: number; v: number }>>([]);
  const [coreVActual, setCoreVActual] = useState<Array<{ t: number; v: number }>>([]);
  const [coreV, setCoreV] = useState<Array<{ t: number; v: number }>>([]);
  const [voltage, setVoltage] = useState<Array<{ t: number; v: number }>>([]);

  const rangeSeconds = useMemo(
    () => TIME_RANGES.find((r) => r.key === range)?.seconds ?? 3600,
    [range]
  );

  const host = useMemo(() => sanitizeHostname(id), [id]);

  const temperatureSeries = useMemo(
    () => [
      { key: "temp", label: "ASIC", color: "hsl(var(--chart-2))", points: temp },
      { key: "vr", label: "VR", color: "hsl(var(--chart-4))", points: vrTemp },
    ],
    [temp, vrTemp]
  );

  const voltageSeries = useMemo(
    () => [
      { key: "voltage", label: "Input", color: "hsl(var(--chart-3))", points: voltage },
      { key: "coreActual", label: "Core (actual)", color: "hsl(var(--chart-2))", points: coreVActual },
      { key: "coreTarget", label: "Core (target)", color: "hsl(var(--chart-5))", points: coreV },
    ],
    [voltage, coreVActual, coreV]
  );

  useEffect(() => {
    const fetchDevice = async () => {
      try {
        const response = await axios.get("/api/devices/imprint");
        const imprintedDevices: Device[] = response.data.data;

        const found = imprintedDevices?.find((d) => d.info.hostname === id);
        setDevice(found);

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
      }
    };

    fetchDevice();
  }, [id]);

  const { isConnected, socket } = useSocket();

  useEffect(() => {
    const listener = (e: Device) => {
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

    const load = async () => {
      try {
        const { start, end, step } = rangeToQueryParams(rangeSeconds);

        const queries = {
          hashrate: `${host}_hashrate_ghs`,
          power: `${host}_power_watts`,
          efficiency: `${host}_efficiency`,
          temp: `${host}_temperature_celsius`,
          vrTemp: `${host}_vr_temperature_celsius`,
          fan: `${host}_fanspeed_rpm`,
          coreVActual: `${host}_core_voltage_actual_volts`,
          coreV: `${host}_core_voltage_volts`,
          voltage: `${host}_voltage_volts`,
        };

        const options = { signal: controller.signal };

        const [hashrateRes, powerRes, effRes, tempRes, vrTempRes, fanRes, coreVaRes, coreVRes, voltRes] =
          await Promise.all([
            promQueryRange(queries.hashrate, start, end, step, options),
            promQueryRange(queries.power, start, end, step, options),
            promQueryRange(queries.efficiency, start, end, step, options),
            promQueryRange(queries.temp, start, end, step, options),
            promQueryRange(queries.vrTemp, start, end, step, options),
            promQueryRange(queries.fan, start, end, step, options),
            promQueryRange(queries.coreVActual, start, end, step, options),
            promQueryRange(queries.coreV, start, end, step, options),
            promQueryRange(queries.voltage, start, end, step, options),
          ]);

        if (cancelled || controller.signal.aborted) return;

        setHashrate(matrixToSeries((hashrateRes as any).data.result)[0]?.points ?? []);
        setPower(matrixToSeries((powerRes as any).data.result)[0]?.points ?? []);
        setEfficiency(matrixToSeries((effRes as any).data.result)[0]?.points ?? []);
        setTemp(matrixToSeries((tempRes as any).data.result)[0]?.points ?? []);
        setVrTemp(matrixToSeries((vrTempRes as any).data.result)[0]?.points ?? []);
        setFan(matrixToSeries((fanRes as any).data.result)[0]?.points ?? []);
        setCoreVActual(matrixToSeries((coreVaRes as any).data.result)[0]?.points ?? []);
        setCoreV(matrixToSeries((coreVRes as any).data.result)[0]?.points ?? []);
        setVoltage(matrixToSeries((voltRes as any).data.result)[0]?.points ?? []);
      } catch (error: any) {
        if (controller.signal.aborted) return;
        if (error?.name === "AbortError") return;
        console.error(error);
      }
    };

    void load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [host, rangeSeconds]);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-4 tablet:px-8">
      <div className="mb-4 flex flex-col gap-3 tablet:flex-row tablet:items-center tablet:justify-between">
        <div className="flex items-center gap-3">
          <NextLink href="/monitoring">
            <Button variant="outlined">Go back</Button>
          </NextLink>
          <h1 className="font-heading text-3xl font-bold uppercase text-foreground">{id} Dashboard</h1>
        </div>
        <TimeRangeSelect value={range} onChange={setRange} />
      </div>

      <div className="grid gap-4 tablet:grid-cols-2">
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

        <Card className="rounded-none">
          <CardHeader>
            <CardTitle>Pool preset</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-accent text-sm text-foreground">{preset ? preset.name : "Custom"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 tablet:grid-cols-3 desktop:grid-cols-6">
        <Card className="rounded-none">
          <CardHeader>
            <CardTitle>Hashrate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-accent text-xl text-foreground">
              {formatNumber(device?.info.hashRate_10m || device?.info.hashRate, 2)} GH/s
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-none">
          <CardHeader>
            <CardTitle>Shares</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-accent text-xl text-foreground">
              {device?.info.sharesAccepted ?? "-"} <span className="text-muted-foreground">|</span>{" "}
              <span className="text-destructive">{device?.info.sharesRejected ?? "-"}</span>
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-none">
          <CardHeader>
            <CardTitle>Power</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-accent text-xl text-foreground">{formatNumber(device?.info.power, 2)} W</p>
          </CardContent>
        </Card>
        <Card className="rounded-none">
          <CardHeader>
            <CardTitle>Temperatures</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-1">
              <p className="font-accent text-xl text-foreground">
                {formatNumber(device?.info.temp, 1)}°C{" "}
                <span className="text-muted-foreground">/</span> {formatNumber(device?.info.vrTemp, 1)}°C
              </p>
              <p className="font-accent text-xs text-muted-foreground">ASIC / VR</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-none">
          <CardHeader>
            <CardTitle>Difficulty</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-1">
              <p className="font-accent text-xl text-foreground">
                {formatDifficulty((device?.info as any)?.currentDiff ?? device?.info.bestSessionDiff)}
                <span className="text-muted-foreground"> / </span>
                {formatDifficulty(device?.info.bestDiff)}
              </p>
              <p className="font-accent text-xs text-muted-foreground">Current / Best</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-none">
          <CardHeader>
            <CardTitle>Uptime</CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className="font-accent text-xl text-foreground"
              title={device?.info.uptimeSeconds ? formatDetailedTime(device.info.uptimeSeconds) : "-"}
            >
              {device?.info.uptimeSeconds ? formatTime(device.info.uptimeSeconds) : "-"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 tablet:grid-cols-2">
        <LineChartCard title="Hashrate" points={hashrate} unit="GH/s" />
        <LineChartCard title="Power" points={power} unit="W" curve="step" />
      </div>

      <div className="mt-4 grid gap-4 tablet:grid-cols-2">
        <LineChartCard title="Efficiency" points={efficiency} unit="J/TH" />
        <MultiLineChartCard title="Temperatures" series={temperatureSeries} unit="°C" valueDigits={1} />
      </div>

      <div className="mt-4 grid gap-4 tablet:grid-cols-2">
        <LineChartCard title="Fan speed" points={fan} unit="RPM" />
        <MultiLineChartCard title="Voltages" series={voltageSeries} unit="V" valueDigits={3} />
      </div>
    </div>
  );
}
