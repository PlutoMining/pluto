import { logger } from "@pluto/logger";
import type {
  MinerData,
  MinerConfig,
  BitaxeData,
  BitaxeApiResponse,
  SupportLevel,
  DetectionResult,
  ValidationResult,
  ConfigFormSchema,
} from "@pluto/interfaces";
import type { IMinerDriver } from "./miner-driver.interface";
import { withRetry } from "../utils/retry";

/* ---------- Accepted discrete values ------------------------------------- */

const VALID_FREQUENCIES = [400, 490, 525, 550, 575, 600, 625] as const;
const VALID_CORE_VOLTAGES = [1000, 1060, 1100, 1150, 1200, 1250] as const;

/* ---------- BitaxeDriver ------------------------------------------------- */

export class BitaxeDriver implements IMinerDriver {
  readonly driverName = "bitaxe";
  readonly supportLevel: SupportLevel = "native";

  /* -- schema & values ---------------------------------------------------- */

  getConfigSchema(): ConfigFormSchema {
    return {
      sections: [
        {
          key: "general",
          label: "General",
          columns: 2,
          fields: [
            { name: "hostname", label: "Hostname", type: "text" },
          ],
        },
        {
          key: "hardware",
          label: "Hardware Settings",
          columns: 4,
          fields: [
            {
              name: "frequency",
              label: "Frequency",
              type: "select",
              options: VALID_FREQUENCIES.map((v) => ({
                label: `${v} MHz`,
                value: v,
              })),
            },
            {
              name: "coreVoltage",
              label: "Core Voltage",
              type: "select",
              options: VALID_CORE_VOLTAGES.map((v) => ({
                label: `${v} mV`,
                value: v,
              })),
            },
            { name: "overclockEnabled", label: "Overclock Enabled", type: "checkbox" },
            { name: "overheatMode", label: "Overheat Mode", type: "checkbox" },
          ],
        },
        {
          key: "fan",
          label: "Fan Settings",
          columns: 4,
          fields: [
            { name: "autofanspeed", label: "Auto Fan Speed", type: "checkbox" },
            { name: "fanspeed", label: "Fan Speed", type: "number", min: 0, max: 100, unit: "%" },
            { name: "minFanSpeed", label: "Min Fan Speed", type: "number", min: 0, max: 100, unit: "%" },
            { name: "temptarget", label: "Temp Target", type: "number", min: 30, max: 100, unit: "°C" },
          ],
        },
        {
          key: "display",
          label: "Display Settings",
          columns: 4,
          fields: [
            { name: "rotation", label: "Rotation", type: "number" },
            { name: "invertscreen", label: "Invert Screen", type: "checkbox" },
            { name: "displayTimeout", label: "Display Timeout", type: "number", min: 0 },
            { name: "statsFrequency", label: "Stats Frequency", type: "number", min: 0 },
          ],
        },
        {
          key: "stratumFallback",
          label: "Stratum Fallback",
          columns: 4,
          fields: [
            { name: "fallbackStratumURL", label: "Fallback Stratum URL", type: "text" },
            { name: "fallbackStratumPort", label: "Fallback Stratum Port", type: "number", min: 1, max: 65535 },
            { name: "fallbackStratumUser", label: "Fallback Stratum User", type: "text" },
            { name: "fallbackStratumSuggestedDifficulty", label: "Fallback Difficulty", type: "number", min: 0 },
          ],
        },
      ],
    };
  }

  getEditableValues(minerData: MinerData): Record<string, unknown> {
    const b = minerData?.bitaxe;
    if (!b) return {};
    return {
      hostname: b.hostname,
      frequency: b.frequency,
      coreVoltage: b.coreVoltage,
      overclockEnabled: b.overclockEnabled,
      overheatMode: b.overheatMode,
      autofanspeed: b.autofanspeed,
      fanspeed: b.fanspeed,
      minFanSpeed: b.minFanSpeed,
      temptarget: b.temptarget,
      rotation: b.rotation,
      invertscreen: b.invertscreen,
      displayTimeout: b.displayTimeout,
      statsFrequency: b.statsFrequency,
      fallbackStratumURL: b.fallbackStratumURL,
      fallbackStratumPort: b.fallbackStratumPort,
      fallbackStratumUser: b.fallbackStratumUser,
      fallbackStratumSuggestedDifficulty: b.fallbackStratumSuggestedDifficulty,
    };
  }

  /* -- detect / fetch / config -------------------------------------------- */

  async detect(ip: string): Promise<DetectionResult | null> {
    return withRetry(
      async () => {
        const res = await fetch(`http://${ip}/api/system/info`, {
          signal: AbortSignal.timeout(2000),
        });
        if (!res.ok) return null;
        const data: BitaxeApiResponse = await res.json();
        if (!data.ASICModel) return null;
        return {
          type: `Bitaxe ${data.boardVersion ?? ""}`.trim(),
          model: `Bitaxe ${data.boardVersion ?? ""}`.trim(),
          mac: data.macAddr,
        };
      },
      { retries: 1, delayMs: 500, label: `BitaxeDriver.detect(${ip})` }
    ).catch(() => null);
  }

  async fetchData(ip: string): Promise<MinerData> {
    const res = await fetch(`http://${ip}/api/system/info`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) {
      throw new Error(`Bitaxe ${ip} returned HTTP ${res.status}`);
    }
    const raw: BitaxeApiResponse = await res.json();
    return this.toMinerData(ip, raw);
  }

  async getConfig(ip: string): Promise<MinerConfig> {
    const res = await fetch(`http://${ip}/api/system/info`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) {
      throw new Error(`Bitaxe ${ip} returned HTTP ${res.status}`);
    }
    const raw: BitaxeApiResponse = await res.json();
    return this.toMinerConfig(raw);
  }

  async updateConfig(ip: string, config: MinerConfig): Promise<void> {
    await withRetry(
      async () => {
        const payload = this.toBitaxePatch(config);
        logger.info(`BitaxeDriver: PATCH http://${ip}/api/system`, {
          keys: Object.keys(payload),
        });
        const res = await fetch(`http://${ip}/api/system`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(
            `Bitaxe config update failed for ${ip}: HTTP ${res.status} ${text}`
          );
        }
      },
      { retries: 1, delayMs: 500, label: `BitaxeDriver.updateConfig(${ip})` }
    );
  }

  async validateConfig(
    _ip: string,
    config: MinerConfig
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const v = config.vendorConfig ?? {};

    if (v.frequency != null) {
      if (!VALID_FREQUENCIES.includes(v.frequency as typeof VALID_FREQUENCIES[number])) {
        errors.push(
          `Invalid frequency ${v.frequency} for Bitaxe miner. Accepted values are: [${VALID_FREQUENCIES.join(", ")}]`
        );
      }
    }
    if (v.coreVoltage != null) {
      if (!VALID_CORE_VOLTAGES.includes(v.coreVoltage as typeof VALID_CORE_VOLTAGES[number])) {
        errors.push(
          `Invalid core voltage ${v.coreVoltage} for Bitaxe miner. Accepted values are: [${VALID_CORE_VOLTAGES.join(", ")}]`
        );
      }
    }
    if (v.fanspeed != null) {
      const fs = v.fanspeed as number;
      if (typeof fs !== "number" || fs < 0 || fs > 100) {
        errors.push("Fan speed must be between 0 and 100%");
      }
    }
    if (v.temptarget != null) {
      const tt = v.temptarget as number;
      if (typeof tt !== "number" || tt < 30 || tt > 100) {
        errors.push("Temperature target must be between 30 and 100°C");
      }
    }
    if (v.fallbackStratumPort != null) {
      const sp = v.fallbackStratumPort as number;
      if (typeof sp !== "number" || sp < 1 || sp > 65535) {
        errors.push("Fallback stratum port must be between 1 and 65535");
      }
    }

    return { valid: errors.length === 0, errors };
  }

  async restart(ip: string): Promise<void> {
    logger.info(`BitaxeDriver: restarting ${ip}`);
    const res = await fetch(`http://${ip}/api/system/restart`, {
      method: "POST",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      throw new Error(`Bitaxe restart failed for ${ip}: HTTP ${res.status}`);
    }
  }

  /* -- mapping helpers ---------------------------------------------------- */

  private toMinerData(ip: string, r: BitaxeApiResponse): MinerData {
    const bitaxeData: BitaxeData = {
      hashRate: r.hashRate,
      hashRate1m: r.hashRate_1m,
      hashRate10m: r.hashRate_10m,
      hashRate1h: r.hashRate_1h,
      expectedHashrate: r.expectedHashrate,
      errorPercentage: r.errorPercentage,
      power: r.power,
      voltage: r.voltage,
      current: r.current,
      maxPower: r.maxPower,
      nominalVoltage: r.nominalVoltage,
      asicModel: r.ASICModel,
      boardVersion: r.boardVersion,
      frequency: r.frequency,
      coreVoltage: r.coreVoltage,
      coreVoltageActual: r.coreVoltageActual,
      smallCoreCount: r.smallCoreCount,
      temp: r.temp,
      temp2: r.temp2,
      vrTemp: r.vrTemp,
      overheatMode: r.overheat_mode,
      temptarget: r.temptarget,
      freeHeap: r.freeHeap,
      freeHeapInternal: r.freeHeapInternal,
      freeHeapSpiram: r.freeHeapSpiram,
      isPSRAMAvailable: r.isPSRAMAvailable,
      ssid: r.ssid,
      macAddr: r.macAddr,
      hostname: r.hostname,
      ipv4: r.ipv4,
      ipv6: r.ipv6,
      wifiStatus: r.wifiStatus,
      wifiRSSI: r.wifiRSSI,
      apEnabled: r.apEnabled,
      sharesAccepted: r.sharesAccepted,
      sharesRejected: r.sharesRejected,
      sharesRejectedReasons: r.sharesRejectedReasons ?? [],
      poolDifficulty: r.poolDifficulty,
      networkDifficulty: r.networkDifficulty,
      blockHeight: r.blockHeight,
      blockFound: r.blockFound,
      bestDiff: r.bestDiff,
      bestSessionDiff: r.bestSessionDiff,
      isUsingFallbackStratum: r.isUsingFallbackStratum,
      poolAddrFamily: r.poolAddrFamily,
      scriptsig: r.scriptsig,
      stratumURL: r.stratumURL,
      stratumPort: r.stratumPort,
      stratumUser: r.stratumUser,
      stratumSuggestedDifficulty: r.stratumSuggestedDifficulty,
      stratumExtranonceSubscribe: r.stratumExtranonceSubscribe,
      fallbackStratumURL: r.fallbackStratumURL,
      fallbackStratumPort: r.fallbackStratumPort,
      fallbackStratumUser: r.fallbackStratumUser,
      fallbackStratumSuggestedDifficulty:
        r.fallbackStratumSuggestedDifficulty,
      fallbackStratumExtranonceSubscribe:
        r.fallbackStratumExtranonceSubscribe,
      fanrpm: r.fanrpm,
      fan2rpm: r.fan2rpm,
      autofanspeed: r.autofanspeed,
      fanspeed: r.fanspeed,
      manualFanSpeed: r.manualFanSpeed,
      minFanSpeed: r.minFanSpeed,
      version: r.version,
      axeOSVersion: r.axeOSVersion,
      idfVersion: r.idfVersion,
      runningPartition: r.runningPartition,
      resetReason: r.resetReason,
      uptimeSeconds: r.uptimeSeconds,
      responseTime: r.responseTime,
      display: r.display,
      rotation: r.rotation,
      invertscreen: r.invertscreen,
      displayTimeout: r.displayTimeout,
      overclockEnabled: r.overclockEnabled,
      statsFrequency: r.statsFrequency,
      hashrateMonitor: r.hashrateMonitor,
    };

    return {
      ip,
      mac: r.macAddr,
      hostname: r.hostname,
      deviceInfo: {
        make: "Bitaxe",
        model: `Bitaxe ${r.boardVersion}`,
        firmware: r.version,
        algo: "SHA256",
      },
      hashrate: { rate: r.hashRate, unit: { value: 1, suffix: "GH/s" } },
      expectedHashrate: {
        rate: r.expectedHashrate,
        unit: { value: 1, suffix: "GH/s" },
      },
      wattage: Math.round(r.power),
      voltage: r.voltage / 1000,
      temperatureAvg: Math.round(r.temp),
      sharesAccepted: r.sharesAccepted,
      sharesRejected: r.sharesRejected,
      bestDifficulty: String(r.bestDiff),
      bestSessionDifficulty: String(r.bestSessionDiff),
      networkDifficulty: r.networkDifficulty,
      fans: [{ speed: r.fanrpm }],
      hashboards: [],
      uptime: r.uptimeSeconds,
      isMining: r.hashRate > 0,
      fwVer: r.version,
      pools: {
        groups: [
          {
            pools: [
              {
                url: `${r.stratumURL}:${r.stratumPort}`,
                user: r.stratumUser,
              },
              {
                url: `${r.fallbackStratumURL}:${r.fallbackStratumPort}`,
                user: r.fallbackStratumUser,
              },
            ],
          },
        ],
      },
      bitaxe: bitaxeData,
    };
  }

  private toMinerConfig(r: BitaxeApiResponse): MinerConfig {
    return {
      pools: {
        groups: [
          {
            pools: [
              {
                url: `${r.stratumURL}:${r.stratumPort}`,
                user: r.stratumUser,
              },
            ],
          },
        ],
      },
      vendorConfig: {
        hostname: r.hostname,
        frequency: r.frequency,
        coreVoltage: r.coreVoltage,
        overclockEnabled: r.overclockEnabled,
        overheatMode: r.overheat_mode,
        autofanspeed: r.autofanspeed,
        fanspeed: r.fanspeed,
        minFanSpeed: r.minFanSpeed,
        temptarget: r.temptarget,
        rotation: r.rotation,
        invertscreen: r.invertscreen,
        displayTimeout: r.displayTimeout,
        statsFrequency: r.statsFrequency,
        fallbackStratumURL: r.fallbackStratumURL,
        fallbackStratumPort: r.fallbackStratumPort,
        fallbackStratumUser: r.fallbackStratumUser,
        fallbackStratumSuggestedDifficulty: r.fallbackStratumSuggestedDifficulty,
      },
    };
  }

  private toBitaxePatch(config: MinerConfig): Record<string, unknown> {
    const patch: Record<string, unknown> = {};
    const v = config.vendorConfig ?? {};

    // Pool settings from universal pools section
    const pool = config.pools?.groups?.[0]?.pools?.[0];
    if (pool) {
      if (pool.url) {
        const { host, port } = this.parseStratumUrl(pool.url);
        patch.stratumURL = host;
        if (port != null) patch.stratumPort = port;
      }
      if (pool.user != null) patch.stratumUser = pool.user;
      if (pool.password != null) patch.stratumPassword = pool.password;
    }

    // Vendor-specific fields from vendorConfig
    if (v.frequency != null) patch.frequency = v.frequency;
    if (v.coreVoltage != null) patch.coreVoltage = v.coreVoltage;
    if (v.overclockEnabled != null) patch.overclockEnabled = v.overclockEnabled;
    if (v.overheatMode != null) patch.overheat_mode = v.overheatMode;
    if (v.autofanspeed != null) patch.autofanspeed = v.autofanspeed;
    if (v.fanspeed != null) patch.fanspeed = v.fanspeed;
    if (v.minFanSpeed != null) patch.minFanSpeed = v.minFanSpeed;
    if (v.temptarget != null) patch.temptarget = v.temptarget;
    if (v.rotation != null) patch.rotation = v.rotation;
    if (v.invertscreen != null) patch.invertscreen = v.invertscreen;
    if (v.displayTimeout != null) patch.displayTimeout = v.displayTimeout;
    if (v.statsFrequency != null) patch.statsFrequency = v.statsFrequency;
    if (v.hostname != null) patch.hostname = v.hostname;
    if (v.fallbackStratumURL != null) patch.fallbackStratumURL = v.fallbackStratumURL;
    if (v.fallbackStratumPort != null) patch.fallbackStratumPort = v.fallbackStratumPort;
    if (v.fallbackStratumUser != null) patch.fallbackStratumUser = v.fallbackStratumUser;
    if (v.fallbackStratumSuggestedDifficulty != null)
      patch.fallbackStratumSuggestedDifficulty = v.fallbackStratumSuggestedDifficulty;

    return patch;
  }

  private parseStratumUrl(url: string): { host: string; port?: number } {
    const stripped = url.replace(/^stratum\+tcp:\/\//, "");
    const lastColon = stripped.lastIndexOf(":");
    if (lastColon === -1) return { host: stripped };
    const host = stripped.slice(0, lastColon);
    const port = parseInt(stripped.slice(lastColon + 1), 10);
    return { host, port: Number.isFinite(port) ? port : undefined };
  }
}
