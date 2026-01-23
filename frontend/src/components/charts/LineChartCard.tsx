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

function formatTime(t: number) {
  const d = new Date(t * 1000);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function LineChartCard({
  title,
  points,
  unit,
  curve = "monotone",
  showDots = false,
}: {
  title: string;
  points: Point[];
  unit?: string;
  curve?: "monotone" | "step" | "stepBefore" | "stepAfter";
  showDots?: boolean;
}) {
  const tooltipContentStyle: React.CSSProperties = {
    backgroundColor: "hsl(var(--secondary))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 0,
    color: "hsl(var(--secondary-foreground))",
  };

  return (
    <Card className="rounded-none">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                formatter={(value: any) => [`${Number(value).toFixed(2)}${unit ? ` ${unit}` : ""}`]}
              />
              <Line
                type={curve}
                dataKey="v"
                stroke="hsl(var(--chart-1))"
                dot={showDots ? { r: 2 } : false}
                strokeWidth={2}
                animateNewValues={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
