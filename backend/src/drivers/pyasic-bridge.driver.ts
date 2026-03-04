import { logger } from "@pluto/logger";
import WebSocket from "ws";
import type {
  MinerData,
  MinerConfig,
  SupportLevel,
  DetectionResult,
  ValidationResult,
  PbMinerData,
  PbPoolsConfig,
  PbValidationResult,
  ConfigFormSchema,
} from "@pluto/interfaces";
import { config } from "../config/environment";
import type { IMinerDriver } from "./miner-driver.interface";
import { withRetry } from "../utils/retry";

/* ------------------------------------------------------------------ */
/*  PyasicBridgeDriver                                                 */
/* ------------------------------------------------------------------ */

export class PyasicBridgeDriver implements IMinerDriver {
  readonly driverName = "pyasic-bridge";
  readonly supportLevel: SupportLevel = "generic";

  private get baseUrl(): string {
    return config.pyasicBridgeHost;
  }

  private get timeoutMs(): number {
    return config.systemInfoTimeoutMs;
  }

  /* -- schema & values -------------------------------------------------- */

  getConfigSchema(): ConfigFormSchema {
    return {
      sections: [
        {
          key: "fan",
          label: "Fan Settings",
          columns: 3,
          fields: [
            {
              name: "fanMode",
              label: "Fan Mode",
              type: "select",
              options: [
                { label: "Normal", value: "normal" },
                { label: "Manual", value: "manual" },
                { label: "Immersion", value: "immersion" },
              ],
            },
            { name: "fanSpeed", label: "Fan Speed", type: "number", min: 0, max: 100, unit: "%" },
            { name: "minimumFans", label: "Minimum Fans", type: "number", min: 0 },
          ],
        },
        {
          key: "temperature",
          label: "Temperature",
          columns: 3,
          fields: [
            { name: "temperatureTarget", label: "Target", type: "number", unit: "°C" },
            { name: "temperatureHot", label: "Hot", type: "number", unit: "°C" },
            { name: "temperatureDanger", label: "Danger", type: "number", unit: "°C" },
          ],
        },
        {
          key: "mining",
          label: "Mining Mode",
          columns: 1,
          fields: [
            {
              name: "miningMode",
              label: "Mode",
              type: "select",
              options: [
                { label: "Normal", value: "normal" },
                { label: "Low", value: "low" },
                { label: "High", value: "high" },
              ],
            },
          ],
        },
      ],
    };
  }

  getEditableValues(minerData: MinerData): Record<string, unknown> {
    const values: Record<string, unknown> = {};
    if (minerData?.temperatureAvg != null) values.temperatureTarget = minerData.temperatureAvg;
    return values;
  }

  /* -- detect / fetch / config ------------------------------------------ */

  async detect(ip: string): Promise<DetectionResult | null> {
    return withRetry(
      async () => {
        const res = await fetch(`${this.baseUrl}/miners/validate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ips: [ip] }),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return null;
        const results: PbValidationResult[] = await res.json();
        const r = results[0];
        if (!r?.is_miner) return null;
        return {
          type: r.model ?? "unknown",
          model: r.model ?? "unknown",
        };
      },
      { retries: 1, delayMs: 500, label: `PyasicBridgeDriver.detect(${ip})` }
    ).catch(() => null);
  }

  async fetchData(ip: string): Promise<MinerData> {
    const res = await fetch(`${this.baseUrl}/miner/${ip}/data`, {
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) {
      throw new Error(`pyasic-bridge /miner/${ip}/data returned ${res.status}`);
    }
    const raw: PbMinerData = await res.json();
    return this.toMinerData(raw);
  }

  async getConfig(ip: string): Promise<MinerConfig> {
    const res = await fetch(`${this.baseUrl}/miner/${ip}/config`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      throw new Error(`pyasic-bridge /miner/${ip}/config returned ${res.status}`);
    }
    const raw = await res.json();
    return this.toMinerConfig(raw);
  }

  async updateConfig(ip: string, cfg: MinerConfig): Promise<void> {
    await withRetry(
      async () => {
        const body = this.toPbConfigPatch(cfg);
        const res = await fetch(`${this.baseUrl}/miner/${ip}/config`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`pyasic-bridge config update for ${ip} failed: ${res.status} ${text}`);
        }
      },
      { retries: 1, delayMs: 500, label: `PyasicBridgeDriver.updateConfig(${ip})` }
    );
  }

  async validateConfig(ip: string, cfg: MinerConfig): Promise<ValidationResult> {
    const body = this.toPbConfigPatch(cfg);
    const res = await fetch(`${this.baseUrl}/miner/${ip}/config/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      return { valid: false, errors: [`HTTP ${res.status}`] };
    }
    const result: { valid: boolean; errors?: string[] } = await res.json();
    return { valid: result.valid, errors: result.errors ?? [] };
  }

  async restart(ip: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/miner/${ip}/restart`, {
      method: "POST",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      throw new Error(`pyasic-bridge restart for ${ip} failed: ${res.status}`);
    }
  }

  async connectLogs(
    ip: string,
    onMessage: (msg: string) => void,
    onError: (err: Error) => void,
    onClose: () => void
  ): Promise<() => void> {
    const wsUrl = this.baseUrl.replace(/^http/, "ws") + `/ws/miner/${ip}`;
    const ws = new WebSocket(wsUrl);

    ws.on("open", () => logger.debug(`PB WS connected for ${ip}`));
    ws.on("message", (data: WebSocket.Data) => onMessage(data.toString()));
    ws.on("error", (err: Error) => onError(err));
    ws.on("close", () => onClose());

    return () => ws.close();
  }

  /* ---- mapping helpers ------------------------------------------------- */

  private toMinerData(r: PbMinerData): MinerData {
    return {
      ip: r.ip,
      mac: r.mac ?? undefined,
      hostname: r.hostname ?? undefined,
      deviceInfo: r.device_info
        ? {
            make: r.device_info.make ?? undefined,
            model: r.device_info.model ?? undefined,
            firmware: r.device_info.firmware ?? undefined,
            algo: r.device_info.algo ?? undefined,
          }
        : undefined,
      serialNumber: r.serial_number ?? undefined,
      hashrate: r.hashrate
        ? {
            rate: r.hashrate.rate ?? undefined,
            unit: r.hashrate.unit
              ? { value: r.hashrate.unit.value ?? undefined, suffix: r.hashrate.unit.suffix ?? undefined }
              : undefined,
          }
        : undefined,
      expectedHashrate: r.expected_hashrate
        ? { rate: r.expected_hashrate.rate ?? undefined, unit: r.expected_hashrate.unit ?? undefined }
        : undefined,
      wattage: r.wattage ?? undefined,
      wattageLimit: r.wattage_limit ?? undefined,
      voltage: r.voltage ?? undefined,
      temperatureAvg: r.temperature_avg ?? undefined,
      envTemp: r.env_temp ?? undefined,
      sharesAccepted: r.shares_accepted ?? undefined,
      sharesRejected: r.shares_rejected ?? undefined,
      bestDifficulty: r.best_difficulty ?? undefined,
      bestSessionDifficulty: r.best_session_difficulty ?? undefined,
      networkDifficulty: r.network_difficulty ?? undefined,
      fans: (r.fans ?? []).map((f) => ({ speed: f.speed ?? undefined })),
      hashboards: (r.hashboards ?? []).map((h) => ({
        slot: h.slot ?? undefined,
        hashrate: h.hashrate
          ? { rate: h.hashrate.rate ?? undefined, unit: h.hashrate.unit ?? undefined }
          : undefined,
        temp: h.temp ?? undefined,
        chipTemp: h.chip_temp ?? undefined,
        chips: h.chips ?? undefined,
        expectedChips: h.expected_chips ?? undefined,
        serialNumber: h.serial_number ?? undefined,
        missing: h.missing ?? undefined,
        active: h.active ?? undefined,
        voltage: h.voltage ?? undefined,
      })),
      totalChips: r.total_chips ?? undefined,
      expectedChips: r.expected_chips ?? undefined,
      expectedHashboards: r.expected_hashboards ?? undefined,
      expectedFans: r.expected_fans ?? undefined,
      isMining: r.is_mining ?? undefined,
      uptime: r.uptime ?? undefined,
      nominal: r.nominal ?? undefined,
      efficiency: r.efficiency
        ? { rate: r.efficiency.rate ?? undefined, unit: r.efficiency.unit ?? undefined }
        : undefined,
      efficiencyFract: r.efficiency_fract ?? undefined,
      fwVer: r.fw_ver ?? undefined,
      apiVer: r.api_ver ?? undefined,
      datetime: r.datetime ?? undefined,
      timestamp: r.timestamp ?? undefined,
      pools: r.config?.pools ? this.mapPools(r.config.pools) : undefined,
    };
  }

  private mapPools(pb: PbPoolsConfig) {
    return {
      groups: (pb.groups ?? []).map((g) => ({
        pools: (g.pools ?? []).map((p) => ({
          url: p.url ?? undefined,
          user: p.user ?? undefined,
          password: p.password ?? undefined,
        })),
        quota: g.quota ?? undefined,
      })),
    };
  }

  private toMinerConfig(raw: Record<string, unknown>): MinerConfig {
    const cfg: MinerConfig = {};
    if (raw.pools && typeof raw.pools === "object") {
      cfg.pools = this.mapPools(raw.pools as PbPoolsConfig);
    }

    const vc: Record<string, unknown> = {};
    const fm = raw.fan_mode as Record<string, unknown> | undefined;
    if (fm) {
      if (fm.mode != null) vc.fanMode = fm.mode;
      if (fm.speed != null) vc.fanSpeed = fm.speed;
      if (fm.minimum_fans != null) vc.minimumFans = fm.minimum_fans;
    }
    const temp = raw.temperature as Record<string, unknown> | undefined;
    if (temp) {
      if (temp.target != null) vc.temperatureTarget = temp.target;
      if (temp.hot != null) vc.temperatureHot = temp.hot;
      if (temp.danger != null) vc.temperatureDanger = temp.danger;
    }
    const mm = raw.mining_mode as Record<string, unknown> | undefined;
    if (mm) {
      if (mm.mode != null) vc.miningMode = mm.mode;
    }

    if (Object.keys(vc).length > 0) cfg.vendorConfig = vc;
    return cfg;
  }

  private toPbConfigPatch(cfg: MinerConfig): Record<string, unknown> {
    const body: Record<string, unknown> = {};
    if (cfg.pools) body.pools = cfg.pools;

    const v = cfg.vendorConfig ?? {};
    if (v.fanMode != null || v.fanSpeed != null || v.minimumFans != null) {
      body.fan_mode = {
        mode: v.fanMode,
        speed: v.fanSpeed,
        minimum_fans: v.minimumFans,
      };
    }
    if (v.temperatureTarget != null || v.temperatureHot != null || v.temperatureDanger != null) {
      body.temperature = {
        target: v.temperatureTarget,
        hot: v.temperatureHot,
        danger: v.temperatureDanger,
      };
    }
    if (v.miningMode != null) {
      body.mining_mode = { mode: v.miningMode };
    }
    return body;
  }
}
