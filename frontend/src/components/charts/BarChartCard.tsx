"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function BarChartCard({
  title,
  data,
  xKey,
  yKey,
}: {
  title: string;
  data: Array<Record<string, any>>;
  xKey: string;
  yKey: string;
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
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" opacity={0.25} />
              <XAxis
                dataKey={xKey}
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
                cursor={{ fill: "hsl(var(--foreground))", opacity: 0.06 }}
              />
              <Bar dataKey={yKey} fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
