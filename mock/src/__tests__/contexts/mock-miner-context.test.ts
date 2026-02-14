/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
 */

import { MockMinerContext } from "@/contexts/mock-miner-context";
import type { MockMinerStrategy } from "@/strategies/mock-miner-strategy.interface";

describe("MockMinerContext", () => {
  const createStrategy = (): MockMinerStrategy<any> => {
    return {
      generateSystemInfo: jest.fn().mockReturnValue({ generated: true }),
      getApiVersion: jest.fn().mockReturnValue("v1"),
      getMinerType: jest.fn().mockReturnValue("axeos"),
      getRootHtml: jest.fn().mockReturnValue("<html></html>"),
    };
  };

  it("computes uptime and delegates to strategy when getting system info", () => {
    jest.useFakeTimers();

    const startTime = new Date("2024-01-01T00:00:00Z");
    jest.setSystemTime(new Date("2024-01-01T00:00:10Z"));

    const strategy = createStrategy();

    const ctx = new MockMinerContext({
      strategy,
      hostname: "mockaxe1",
      startTime,
      initialSystemInfo: { foo: 1 },
    });

    const result = ctx.getSystemInfo();

    expect(strategy.generateSystemInfo).toHaveBeenCalledTimes(1);
    expect(strategy.generateSystemInfo).toHaveBeenCalledWith(
      "mockaxe1",
      10,
      { foo: 1 }
    );
    expect(result).toEqual({ generated: true });

    // getUptimeSeconds uses the same time base.
    expect(ctx.getUptimeSeconds()).toBe(10);

    jest.useRealTimers();
  });

  it("merges system info overrides when patching", () => {
    const strategy = createStrategy();

    const ctx = new MockMinerContext({
      strategy,
      hostname: "mockaxe2",
      startTime: new Date("2024-01-01T00:00:00Z"),
      initialSystemInfo: { foo: 1 },
    });

    ctx.patchSystemInfo({ bar: 2 });

    expect(ctx.getSystemInfoOverrides()).toEqual({ foo: 1, bar: 2 });
  });

  it("exposes hostname, miner type, api version and root HTML", () => {
    const strategy = createStrategy();

    // Omit startTime to exercise the default branch that uses `new Date()`
    const ctx = new MockMinerContext({
      strategy,
      hostname: "mockaxe3",
    });

    expect(ctx.getHostname()).toBe("mockaxe3");
    expect(ctx.getMinerType()).toBe("axeos");
    expect(ctx.getApiVersion()).toBe("v1");
    expect(ctx.getRootHtml()).toBe("<html></html>");
  });
});

