"use client";

import * as React from "react";

import { TIME_RANGES, type TimeRangeKey } from "@/lib/prometheus";
import { cn } from "@/lib/utils";

export function TimeRangeSelect({
  value,
  onChange,
  className,
}: {
  value: TimeRangeKey;
  onChange: (value: TimeRangeKey) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {TIME_RANGES.map((r) => (
        <button
          key={r.key}
          type="button"
          onClick={() => onChange(r.key)}
          className={cn(
            "h-8 rounded-none border border-border px-3 font-accent text-[12px]",
            value === r.key ? "bg-primary text-primary-foreground" : "bg-background text-foreground hover:bg-muted"
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
