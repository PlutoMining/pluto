"use client";

import * as React from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CHART_PALETTE } from "@/components/charts/chartPalette";

type Point = { t: number; v: number };

type Series = {
  key: string;
  label: string;
  color?: string;
  points: Point[];
  strokeWidth?: number;
  strokeDasharray?: string;
  strokeOpacity?: number;
  strokeLinecap?: "butt" | "round" | "square";
  renderOrder?: number;
};

function formatTime(t: number) {
  const d = new Date(t * 1000);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function mergeSeries(series: Series[]) {
  const byTime = new Map<number, Record<string, number | undefined>>();

  for (const s of series) {
    for (const p of s.points) {
      const row = byTime.get(p.t) ?? { t: p.t };
      row[s.key] = p.v;
      byTime.set(p.t, row);
    }
  }

  return Array.from(byTime.values()).sort((a, b) => Number(a.t) - Number(b.t));
}

export function MultiLineChartCard({
  title,
  series,
  unit,
  valueDigits = 2,
  colors = CHART_PALETTE,
  yDomain,
  allowDataOverflow = false,
}: {
  title: string;
  series: Series[];
  unit?: string;
  valueDigits?: number;
  colors?: string[];
  yDomain?: [number | "auto" | "dataMin" | "dataMax", number | "auto" | "dataMin" | "dataMax"];
  allowDataOverflow?: boolean;
}) {
  const palette = React.useMemo(() => {
    return colors.length > 0 ? colors : ["hsl(var(--chart-1))"];
  }, [colors]);

  const seriesWithColors = React.useMemo(() => {
    return series.map((s, idx) => ({
      ...s,
      color: s.color ?? palette[idx % palette.length],
    }));
  }, [series, palette]);

  const renderSeries = React.useMemo(() => {
    return [...seriesWithColors].sort((a, b) => (a.renderOrder ?? 0) - (b.renderOrder ?? 0));
  }, [seriesWithColors]);

  const data = React.useMemo(() => mergeSeries(seriesWithColors), [seriesWithColors]);

  const tooltipContentStyle: React.CSSProperties = {
    backgroundColor: "hsl(var(--secondary))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 0,
    color: "hsl(var(--secondary-foreground))",
  };

  return (
    <Card className="rounded-none">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>{title}</CardTitle>
        <div className="flex flex-wrap items-center gap-3">
          {seriesWithColors.map((s) => (
            <div key={s.key} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span
                className="w-6 border-t"
                style={{
                  borderTopColor: s.color,
                  borderTopWidth: `${s.strokeWidth ?? 2}px`,
                  borderTopStyle: s.strokeDasharray ? "dashed" : "solid",
                  opacity: s.strokeOpacity ?? 1,
                }}
              />
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" opacity={0.25} />
              <XAxis
                dataKey="t"
                tickFormatter={formatTime}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickLine={{ stroke: "hsl(var(--border))" }}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <YAxis
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickLine={{ stroke: "hsl(var(--border))" }}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                domain={yDomain}
                allowDataOverflow={allowDataOverflow}
              />
              <Tooltip
                contentStyle={tooltipContentStyle}
                labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                cursor={{ stroke: "hsl(var(--foreground))", opacity: 0.2 }}
                labelFormatter={(l) => formatTime(Number(l))}
                formatter={(value: any, name: any) => {
                  const label = seriesWithColors.find((s) => s.key === name)?.label ?? String(name);
                  const num = Number(value);
                  if (!Number.isFinite(num)) return [String(value), label];
                  return [`${num.toFixed(valueDigits)}${unit ? ` ${unit}` : ""}`, label];
                }}
              />
              {renderSeries.map((s) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  stroke={s.color}
                  dot={false}
                  strokeWidth={s.strokeWidth ?? 2}
                  strokeDasharray={s.strokeDasharray}
                  strokeOpacity={s.strokeOpacity}
                  strokeLinecap={s.strokeLinecap}
                  connectNulls
                  animateNewValues={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
