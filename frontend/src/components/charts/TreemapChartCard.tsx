"use client";

import * as React from "react";
import { ResponsiveContainer, Tooltip, Treemap } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CHART_PALETTE,
  computeLinearBreakpoints,
  contrastTextColor,
  steppedColor,
} from "@/components/charts/chartPalette";

type AnyRecord = Record<string, any>;

const DEFAULT_COLORS = [
  ...CHART_PALETTE,
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
  colorMode = "categorical",
  breakpoints,
  renderTooltip,
}: {
  title: string;
  data: T[];
  nameKey: keyof T & string;
  valueKey: keyof T & string;
  valueDigits?: number;
  colors?: string[];
  colorMode?: "categorical" | "stepped";
  breakpoints?: number[];
  renderTooltip?: (row: T) => React.ReactNode;
}) {
  const tooltipContentStyle: React.CSSProperties = {
    backgroundColor: "hsl(var(--secondary))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 0,
    color: "hsl(var(--secondary-foreground))",
  };

  const palette = React.useMemo(() => {
    return colors.length > 0 ? colors : ["hsl(var(--chart-1))"];
  }, [colors]);

  const inferredBreakpoints = React.useMemo(() => {
    if (colorMode !== "stepped") return [];
    if (breakpoints) return breakpoints;

    const values = (data ?? [])
      .map((row) => Number((row as any)?.[valueKey]))
      .filter((n) => Number.isFinite(n));

    if (values.length < 2) return [];

    const min = Math.min(...values);
    const max = Math.max(...values);
    return computeLinearBreakpoints(min, max, Math.max(2, palette.length));
  }, [breakpoints, colorMode, data, valueKey, palette.length]);

  const Content = React.useCallback(
    (nodeProps: any): React.ReactElement => {
      const { x, y, width, height, index, depth, name, tooltipIndex, payload, value } = nodeProps ?? {};

      if (!Number.isFinite(width) || !Number.isFinite(height)) return <g />;
      if (depth === 0) return <g />;

      const rawValue = payload?.[valueKey] ?? value ?? index;
      const fill =
        colorMode === "stepped"
          ? steppedColor(rawValue, inferredBreakpoints, palette)
          : palette[(Number(index) || 0) % palette.length] ?? "hsl(var(--chart-1))";
      const labelFill = contrastTextColor(fill) ?? "hsl(0 0% 100%)";
      const labelStroke = labelFill === "#000000" ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)";
      const showLabel = width >= 90 && height >= 28;

      return (
        <g>
          <rect
            x={x}
            y={y}
            width={width}
            height={height}
            fill={fill}
            stroke="hsl(var(--border))"
            stroke="hsl(var(--border))"
            strokeWidth={1}
            data-recharts-item-index={tooltipIndex}
          />
          {showLabel ? (
            <text
              x={x + 8}
              y={y + 18}
              fontSize={12}
              fill={labelFill}
              style={{ paintOrder: "stroke", stroke: labelStroke, strokeWidth: 3 }}
              fill={labelFill}
              style={{ paintOrder: "stroke", stroke: labelStroke, strokeWidth: 3 }}
            >
              {String(name)}
            </text>
          ) : null}
        </g>
      );
    },
    [colorMode, inferredBreakpoints, palette, valueKey]
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
