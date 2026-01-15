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
  label?: string | number;
  color?: string;
  bg?: string;
  fontWeight?: string;
}

export const Badge: React.FC<DeviceStatusBadgeProps> = ({
  label,
  color = "body-text",
  bg = "dashboard-badge-bg",
  fontWeight = 500,
}) => {
  const bgClass =
    bg === "dashboard-badge-bg" ? "bg-muted" : bg === "badge-bg" ? "bg-muted" : "bg-muted";
  const textClass =
    color === "primary-color"
      ? "text-primary"
      : color === "body-text"
      ? "text-foreground"
      : "text-foreground";

  return (
    <span
      className={cn(
        "inline-flex items-center border border-border px-2 py-1",
        "font-accent text-[13px] uppercase leading-5",
        bgClass,
        textClass
      )}
      style={{ fontWeight }}
    >
      {label}
    </span>
  );
};
