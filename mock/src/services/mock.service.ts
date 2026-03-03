/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
 */

export const generateFakeLog = (): string => {
  const logs = [
    "System started",
    "Temperature reading failed",
    "Fan speed increased",
    "Power supply issue detected",
    "System performance optimal",
    "Network connection lost",
    "ASIC failure detected",
    "Overclocking applied successfully",
    "Temperature is stable",
    "Fan is operating within limits",
  ];
  const randomIndex = Math.floor(Math.random() * logs.length);
  return logs[randomIndex];
};
