import { logger } from "@pluto/logger";
import WebSocket from "ws";
import type {
  MinerData,
  MinerConfig,
  SupportLevel,
  DetectionResult,
  ValidationResult,
  ConfigFormSchema,
} from "@pluto/interfaces";
import type { IMinerDriver } from "./miner-driver.interface";

/**
 * Driver for miners that expose a generic HTTP API at `/api/system/info`.
 *
 * Used for mock devices and any future miner that serves system data
 * via plain HTTP rather than a vendor-specific protocol.  This driver
 * talks directly to the device — no pyasic-bridge in the loop.
 */
export class GenericHttpDriver implements IMinerDriver {
  readonly driverName = "generic-http";
  readonly supportLevel: SupportLevel = "generic";

  getConfigSchema(): ConfigFormSchema {
    return { sections: [] };
  }

  getEditableValues(_minerData: MinerData): Record<string, unknown> {
    return {};
  }

  async detect(_ip: string): Promise<DetectionResult | null> {
    return null;
  }

  async fetchData(ip: string): Promise<MinerData> {
    const res = await fetch(`http://${ip}/api/system/info`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      throw new Error(`generic-http /api/system/info for ${ip} returned ${res.status}`);
    }
    const raw: Record<string, unknown> = await res.json();
    return this.toMinerData(ip, raw);
  }

  async getConfig(ip: string): Promise<MinerConfig> {
    const res = await fetch(`http://${ip}/api/system/info`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      throw new Error(`generic-http config fetch for ${ip} returned ${res.status}`);
    }
    const raw: Record<string, unknown> = await res.json();
    const cfg: MinerConfig = {};
    if (raw.pool_url) {
      cfg.pools = {
        groups: [{
          pools: [{ url: raw.pool_url as string, user: (raw.pool_user as string) ?? undefined }],
        }],
      };
    }
    return cfg;
  }

  async updateConfig(ip: string, cfg: MinerConfig): Promise<void> {
    const body: Record<string, unknown> = {};
    if (cfg.pools?.groups?.[0]?.pools?.[0]) {
      const pool = cfg.pools.groups[0].pools[0];
      if (pool.url) body.pool_url = pool.url;
      if (pool.user) body.pool_user = pool.user;
    }
    const res = await fetch(`http://${ip}/api/system`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      throw new Error(`generic-http config update for ${ip} failed: ${res.status}`);
    }
  }

  async validateConfig(_ip: string, _cfg: MinerConfig): Promise<ValidationResult> {
    return { valid: true, errors: [] };
  }

  async restart(ip: string): Promise<void> {
    const res = await fetch(`http://${ip}/api/system/restart`, {
      method: "POST",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      throw new Error(`generic-http restart for ${ip} failed: ${res.status}`);
    }
  }

  async connectLogs(
    ip: string,
    onMessage: (msg: string) => void,
    onError: (err: Error) => void,
    onClose: () => void
  ): Promise<() => void> {
    const wsUrl = `ws://${ip}`;
    const ws = new WebSocket(wsUrl);

    ws.on("open", () => logger.debug(`GenericHttp WS connected for ${ip}`));
    ws.on("message", (data: WebSocket.Data) => onMessage(data.toString()));
    ws.on("error", (err: Error) => onError(err));
    ws.on("close", () => onClose());

    return () => ws.close();
  }

  private toMinerData(ip: string, raw: Record<string, unknown>): MinerData {
    return {
      ip,
      mac: raw.mac as string | undefined,
      hostname: raw.hostname as string | undefined,
      deviceInfo:
        raw.make || raw.model || raw.firmware || raw.algo
          ? {
              make: (raw.make as string) ?? undefined,
              model: (raw.model as string) ?? undefined,
              firmware: (raw.firmware as string) ?? undefined,
              algo: (raw.algo as string) ?? undefined,
            }
          : undefined,
      serialNumber: (raw.serial_number as string) ?? undefined,
      hashrate: raw.hashrate != null ? { rate: raw.hashrate as number } : undefined,
      expectedHashrate: raw.expected_hashrate != null ? { rate: raw.expected_hashrate as number } : undefined,
      wattage: (raw.wattage as number) ?? undefined,
      wattageLimit: (raw.wattage_limit as number) ?? undefined,
      voltage: (raw.voltage as number) ?? undefined,
      temperatureAvg: (raw.temperature_avg as number) ?? undefined,
      envTemp: (raw.env_temp as number) ?? undefined,
      sharesAccepted: (raw.shares_accepted as number) ?? undefined,
      sharesRejected: (raw.shares_rejected as number) ?? undefined,
      bestDifficulty: (raw.best_difficulty as string) ?? undefined,
      bestSessionDifficulty: (raw.best_session_difficulty as string) ?? undefined,
      networkDifficulty: (raw.network_difficulty as number) ?? undefined,
      fans: Array.isArray(raw.fans)
        ? (raw.fans as { speed?: number }[]).map((f) => ({ speed: f.speed ?? undefined }))
        : undefined,
      hashboards: Array.isArray(raw.hashboards)
        ? (raw.hashboards as Record<string, unknown>[]).map((h) => ({
            slot: (h.slot as number) ?? undefined,
            hashrate: h.hashrate != null ? { rate: h.hashrate as number } : undefined,
            temp: (h.temp as number) ?? undefined,
            chipTemp: (h.chip_temp as number) ?? undefined,
            chips: (h.chips as number) ?? undefined,
            expectedChips: (h.expected_chips as number) ?? undefined,
            active: (h.active as boolean) ?? undefined,
            voltage: (h.voltage as number) ?? undefined,
          }))
        : undefined,
      totalChips: (raw.total_chips as number) ?? undefined,
      expectedChips: (raw.expected_chips as number) ?? undefined,
      expectedHashboards: (raw.expected_hashboards as number) ?? undefined,
      expectedFans: (raw.expected_fans as number) ?? undefined,
      isMining: (raw.is_mining as boolean) ?? undefined,
      uptime: (raw.uptime as number) ?? undefined,
      nominal: (raw.nominal as boolean) ?? undefined,
      efficiency: raw.efficiency != null ? { rate: raw.efficiency as number } : undefined,
      pools:
        raw.pool_url
          ? {
              groups: [
                {
                  pools: [{ url: raw.pool_url as string, user: (raw.pool_user as string) ?? undefined }],
                },
              ],
            }
          : undefined,
      fwVer: (raw.fw_ver as string) ?? undefined,
      apiVer: (raw.api_ver as string) ?? undefined,
      datetime: (raw.datetime as string) ?? undefined,
      timestamp: (raw.timestamp as number) ?? undefined,
    };
  }
}
