/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import React from "react";

import { cn } from "@/lib/utils";

export interface DeviceStatusBadgeProps {
  status?: "online" | "offline";
  label?: string;
  lineHeight?: string;
  invert?: boolean;
}

export const DeviceStatusBadge: React.FC<DeviceStatusBadgeProps> = ({
  status = "online",
  label,
  lineHeight = "20px",
  invert = false,
}) => {
  const online = status === "online";
  const base = "inline-flex items-center border px-2 py-1 font-body text-[13px] font-medium uppercase";
  const variant = online
    ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
    : "border-destructive bg-destructive/10 text-destructive";
  const maybeInvert = invert ? "bg-background" : "";
  return (
    <span className={cn(base, variant, maybeInvert)} style={{ lineHeight }}>
      {label ? label : status}
    </span>
  );
};
