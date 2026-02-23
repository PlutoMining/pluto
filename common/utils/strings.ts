/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

export function sanitizeHostname(hostname: string) {
  let sanitized = hostname.replace(/[^a-zA-Z0-9_]/g, "__");
  // Prometheus metric names must start with [a-zA-Z_], not a digit.
  if (/^\d/.test(sanitized)) {
    sanitized = `miner_${sanitized}`;
  }
  return sanitized;
}
