/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import React from "react";

import Link from "../Link/Link";

export interface DeviceStatusBadgeProps {
  mac: string;
  hostname: string;
  ip: string;
  tracing: boolean;
}

export const HostnameBadge: React.FC<DeviceStatusBadgeProps> = ({ mac, hostname, ip, tracing }) => {
  return (
    <div
      key={mac}
      className="inline-flex items-center gap-1 border border-border bg-muted px-3 py-1"
    >
      <span className="font-body text-xs font-medium capitalize text-foreground">{hostname}</span>
      <span className="font-body text-xs font-medium text-primary">-</span>
      <Link
        isExternal={true}
        href={ip.startsWith("http") ? ip : `http://${ip}`}
        label={ip}
        fontFamily="accent"
        fontWeight={400}
        className="text-xs text-muted-foreground underline"
        isDisabled={tracing ? false : true}
      />
    </div>
  );
};
