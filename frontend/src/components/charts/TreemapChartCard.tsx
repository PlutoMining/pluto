"use client";

import * as React from "react";
import { ResponsiveContainer, Tooltip, Treemap } from "recharts";

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

export function TreemapChartCard<T extends AnyRecord>({
  title,
  data,
  nameKey,
  valueKey,
  valueDigits = 0,
  colors = DEFAULT_COLORS,
  renderTooltip,
}: {
  title: string;
  data: T[];
  nameKey: keyof T & string;
  valueKey: keyof T & string;
  valueDigits?: number;
  colors?: string[];
  renderTooltip?: (row: T) => React.ReactNode;
}) {
  const tooltipContentStyle: React.CSSProperties = {
    backgroundColor: "hsl(var(--secondary))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 0,
    color: "hsl(var(--secondary-foreground))",
  };

  const Content = React.useCallback(
    (nodeProps: any): React.ReactElement => {
      const { x, y, width, height, index, depth, name, tooltipIndex } = nodeProps ?? {};

      if (!Number.isFinite(width) || !Number.isFinite(height)) return <g />;
      if (depth === 0) return <g />;

      const fill = colors[(Number(index) || 0) % colors.length];
      const showLabel = width >= 90 && height >= 28;

      return (
        <g>
          <rect
            x={x}
            y={y}
            width={width}
            height={height}
            fill={fill}
            stroke="hsl(var(--background))"
            strokeWidth={1}
            data-recharts-item-index={tooltipIndex}
          />
          {showLabel ? (
            <text
              x={x + 8}
              y={y + 18}
              fontSize={12}
              fill="hsl(0 0% 100%)"
              style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.35)", strokeWidth: 3 }}
            >
              {String(name)}
            </text>
          ) : null}
        </g>
      );
    },
    [colors]
  );

  return (
    <Card className="rounded-none">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <Treemap data={data} dataKey={valueKey} nameKey={nameKey} content={Content} colorPanel={colors as any}>
              <Tooltip
                cursor={{ fill: "hsl(var(--foreground))", opacity: 0.06 }}
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const row = (payload[0]?.payload ?? null) as T | null;
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
            </Treemap>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
