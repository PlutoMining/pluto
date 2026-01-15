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
}: {
  title: string;
  points: Point[];
  unit?: string;
}) {
  return (
    <Card className="rounded-none">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
              <XAxis dataKey="t" tickFormatter={formatTime} />
              <YAxis />
              <Tooltip
                labelFormatter={(l) => formatTime(Number(l))}
                formatter={(value: any) => [`${Number(value).toFixed(2)}${unit ? ` ${unit}` : ""}`]}
              />
              <Line type="monotone" dataKey="v" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
