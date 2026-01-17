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

type Point = { t: number; v: number };

type Series = {
  key: string;
  label: string;
  color: string;
  points: Point[];
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
}: {
  title: string;
  series: Series[];
  unit?: string;
  valueDigits?: number;
}) {
  const data = React.useMemo(() => mergeSeries(series), [series]);

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
          {series.map((s) => (
            <div key={s.key} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-2 w-2" style={{ backgroundColor: s.color }} />
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
              />
              <Tooltip
                contentStyle={tooltipContentStyle}
                labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                cursor={{ stroke: "hsl(var(--foreground))", opacity: 0.2 }}
                labelFormatter={(l) => formatTime(Number(l))}
                formatter={(value: any, name: any) => {
                  const label = series.find((s) => s.key === name)?.label ?? String(name);
                  const num = Number(value);
                  if (!Number.isFinite(num)) return [String(value), label];
                  return [`${num.toFixed(valueDigits)}${unit ? ` ${unit}` : ""}`, label];
                }}
              />
              {series.map((s) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  stroke={s.color}
                  dot={false}
                  strokeWidth={2}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
