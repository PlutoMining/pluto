"use client";

import * as React from "react";

import { POLLING_INTERVALS, type PollingIntervalKey } from "@/lib/prometheus";
import { cn } from "@/lib/utils";

export function PollingIntervalSelect({
  value,
  onChange,
  autoMs,
  className,
}: {
  value: PollingIntervalKey;
  onChange: (value: PollingIntervalKey) => void;
  autoMs?: number;
  className?: string;
}) {
  const autoLabel = React.useMemo(() => {
    if (!autoMs || !Number.isFinite(autoMs)) return undefined;
    return POLLING_INTERVALS.find((o) => o.ms === autoMs)?.label ?? `${Math.round(autoMs / 1000)}s`;
  }, [autoMs]);

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {POLLING_INTERVALS.map((r) => (
        <button
          key={r.key}
          type="button"
          onClick={() => onChange(r.key)}
          className={cn(
            "h-8 rounded-none border border-border px-3 font-accent text-[12px]",
            value === r.key
              ? "bg-primary text-primary-foreground"
              : "bg-background text-foreground hover:bg-muted"
          )}
        >
          {r.key === "auto" && autoLabel ? `Auto (${autoLabel})` : r.label}
        </button>
      ))}
    </div>
  );
}
