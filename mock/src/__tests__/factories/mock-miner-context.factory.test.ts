/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
 */

import { createMockMinerContext, DEFAULT_MINER_TYPE } from "@/factories/mock-miner-context.factory";
import { DeviceApiVersion } from "@/types/axeos.types";

describe("createMockMinerContext", () => {
  it("creates a context with default miner type and legacy API version", () => {
    const startTime = new Date("2024-01-01T00:00:00Z");

    const ctx = createMockMinerContext({
      // intentionally omit minerType and apiVersion to exercise defaults
      hostname: "mockaxe1",
      startTime,
    });

    expect(ctx.getHostname()).toBe("mockaxe1");
    expect(ctx.getMinerType()).toBe(DEFAULT_MINER_TYPE);
    expect(ctx.getApiVersion()).toBe(DeviceApiVersion.Legacy);
  });
});

