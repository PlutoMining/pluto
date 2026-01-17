"use client";

import * as React from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AnyRecord = Record<string, any>;

const DEFAULT_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(50 95% 55%)",
  "hsl(330 85% 62%)",
  "hsl(200 25% 45%)",
];

function formatNumber(value: unknown, digits = 0) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "-";
  return n.toFixed(digits);
}

export function PieChartCard<T extends AnyRecord>({
  title,
  data,
  nameKey,
  valueKey,
  valueDigits = 0,
  colors = DEFAULT_COLORS,
  renderTooltip,
  centerLabelKey,
  centerLabel,
  centerLabelTitle,
  hideHeader = false,
}: {
  title: string;
  data: T[];
  nameKey: keyof T & string;
  valueKey: keyof T & string;
  valueDigits?: number;
  colors?: string[];
  renderTooltip?: (row: T) => React.ReactNode;
  centerLabelKey?: keyof T & string;
  centerLabel?: React.ReactNode;
  centerLabelTitle?: React.ReactNode;
  hideHeader?: boolean;
}) {
  const tooltipContentStyle: React.CSSProperties = {
    backgroundColor: "hsl(var(--secondary))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 0,
    color: "hsl(var(--secondary-foreground))",
  };

  const [activeIndex, setActiveIndex] = React.useState(0);

  React.useEffect(() => {
    if (data.length === 0) return;
    setActiveIndex((prev) => Math.min(Math.max(prev, 0), data.length - 1));
  }, [data.length]);

  const activeRow = centerLabelKey ? data[activeIndex] : undefined;
  const resolvedCenterLabel =
    centerLabel ?? (centerLabelKey && activeRow ? String(activeRow[centerLabelKey]) : undefined);

  return (
    <Card className="rounded-none">
      {hideHeader ? null : (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <div className="relative h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                contentStyle={tooltipContentStyle}
                cursor={{ fill: "hsl(var(--foreground))", opacity: 0.06 }}
                formatter={(value: any) => [formatNumber(value, valueDigits)]}
                labelFormatter={(l: any) => String(l)}
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const row = payload[0]?.payload as T | undefined;
                  if (!row) return null;

                  return (
                    <div style={tooltipContentStyle} className="px-3 py-2">
                      <div className="text-xs text-muted-foreground">{String(row[nameKey])}</div>
                      <div className="font-accent text-sm text-foreground">
                        {formatNumber(row[valueKey], valueDigits)}
                      </div>
                      {renderTooltip ? (
                        <div className="mt-2 text-xs text-muted-foreground">{renderTooltip(row)}</div>
                      ) : null}
                    </div>
                  );
                }}
              />
              <Pie
                data={data}
                dataKey={valueKey}
                nameKey={nameKey}
                innerRadius={60}
                outerRadius={90}
                minAngle={2}
                paddingAngle={1}
                stroke="transparent"
                strokeWidth={0}
                onMouseEnter={(_, idx) => {
                  if (typeof idx === "number") setActiveIndex(idx);
                }}
              >
                {data.map((_, idx) => (
                  <Cell key={`cell-${idx}`} fill={colors[idx % colors.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {resolvedCenterLabel ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="max-w-[180px] text-center">
                {centerLabelTitle ? (
                  <div className="text-xs text-muted-foreground">{centerLabelTitle}</div>
                ) : null}
                <div className="font-heading text-sm text-foreground break-words">{resolvedCenterLabel}</div>
              </div>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
