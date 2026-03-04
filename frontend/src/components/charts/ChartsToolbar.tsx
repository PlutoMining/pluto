"use client";

import * as React from "react";

import { PollingIntervalSelect } from "@/components/charts/PollingIntervalSelect";
import { TimeRangeSelect } from "@/components/charts/TimeRangeSelect";
import type { PollingIntervalKey, TimeRangeKey } from "@/lib/prometheus";
import { cn } from "@/lib/utils";

export function ChartsToolbar({
  range,
  onRangeChange,
  polling,
  onPollingChange,
  autoRefreshMs,
  className,
}: {
  range: TimeRangeKey;
  onRangeChange: (value: TimeRangeKey) => void;
  polling: PollingIntervalKey;
  onPollingChange: (value: PollingIntervalKey) => void;
  autoRefreshMs?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border border-border bg-card px-4 py-3",
        "md:flex-row md:items-end md:justify-between",
        className
      )}
    >
      <div className="flex flex-col gap-1">
        <p className="font-heading text-sm font-bold uppercase text-foreground">Charts</p>
        <p className="font-accent text-xs text-muted-foreground">Applies to charts only (not live stats).</p>
      </div>

      <div className="flex flex-col items-start gap-3 md:flex-row md:items-end">
        <div className="flex flex-col items-start gap-1">
          <p className="font-accent text-xs text-muted-foreground">Time range</p>
          <TimeRangeSelect value={range} onChange={onRangeChange} />
        </div>
        <div className="flex flex-col items-start gap-1">
          <p className="font-accent text-xs text-muted-foreground">Refresh</p>
          <PollingIntervalSelect value={polling} onChange={onPollingChange} autoMs={autoRefreshMs} />
        </div>
      </div>
    </div>
  );
}
