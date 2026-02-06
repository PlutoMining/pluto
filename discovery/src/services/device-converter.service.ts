/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { Device, DiscoveredMiner } from "@pluto/interfaces";
import type { MinerData, MinerValidationResult } from "@pluto/pyasic-bridge-client";
import type { ArpScanResult } from "./arpScanWrapper";

/**
 * Service for converting miner information from pyasic-bridge format to Device format.
 * 
 * This service now uses DiscoveredMiner (based on pyasic-bridge MinerData) internally
 * for a device-agnostic representation, then converts to the legacy Device format
 * for backward compatibility with backend/frontend.
 */
export class DeviceConverterService {
  /**
   * Create a DiscoveredMiner from pyasic-bridge data.
   * This is the new, generic format based on pyasic-bridge MinerData structure.
   * 
   * @param storageIp - The IP address to use for storage (may differ from validation IP for mock devices)
   * @param mac - The MAC address of the device
   * @param validationResult - Validation result from pyasic-bridge (optional)
   * @param arpResult - ARP scan result (optional, for fallback type)
   * @param minerData - Full miner data from pyasic-bridge /miner/{ip}/data endpoint (optional)
   * @returns DiscoveredMiner object with generic miner data
   */
  static createDiscoveredMiner(
    storageIp: string,
    mac: string,
    validationResult: MinerValidationResult | null,
    arpResult: ArpScanResult | null,
    minerData: MinerData | null
  ): DiscoveredMiner {
    // Extract model from validation result, miner data, or ARP result
    const model =
      validationResult?.model ??
      minerData?.device_info?.model ??
      minerData?.model ??
      arpResult?.type ??
      "unknown";

    // If we have minerData, use it directly; otherwise create minimal MinerData
    const fullMinerData: MinerData = minerData || {
      ip: storageIp,
      mac: mac !== "unknown" ? mac : undefined,
      hostname: storageIp,
      model: model !== "unknown" ? model : undefined,
      device_info: model !== "unknown" ? { model } : undefined,
    };

    return {
      ip: storageIp,
      mac,
      type: model,
      minerData: fullMinerData,
      storageIp,
    };
  }

  /**
   * Convert DiscoveredMiner to legacy Device format for backward compatibility.
   * 
   * This conversion is necessary because backend/frontend still expect the old Device format.
   * The Device format is Bitaxe/AxeOS-specific, so we map generic miner data to it.
   * 
   * @param discoveredMiner - DiscoveredMiner with generic miner data
   * @returns Device object in legacy format for storage
   */
  static convertToLegacyDevice(discoveredMiner: DiscoveredMiner): Device {
    const { minerData } = discoveredMiner;
    
    // Extract model information
    const model =
      minerData.device_info?.model ??
      minerData.model ??
      discoveredMiner.type ??
      "unknown";

    // Build minimal DeviceInfo for legacy format
    // Note: Most fields will be empty/default since we're converting from generic format
    // Backend will enrich this data later when it polls the device
    const deviceInfo: Device["info"] = {
      // Basic identification
      ASICModel: minerData.device_info?.model ?? minerData.model ?? model,
      deviceModel: minerData.model ?? minerData.device_info?.model ?? model,
      hostname: minerData.hostname ?? discoveredMiner.ip,
      mac: minerData.mac ?? discoveredMiner.mac,
      version: minerData.fw_ver ?? minerData.device_info?.firmware ?? minerData.firmware ?? "",

      // Mining stats (if available)
      power: minerData.wattage ?? 0,
      voltage: minerData.voltage ?? 0,
      current: 0, // Not in MinerData
      fanSpeedRpm: minerData.fans?.[0]?.speed ?? 0,
      temp: minerData.temperature_avg ?? minerData.hashboards?.[0]?.temp ?? 0,
      hashRate: minerData.hashrate?.rate ? minerData.hashrate.rate * 1000 : 0, // Convert Gh/s to Th/s approximation
      hashRate_10m: 0, // Will be enriched by backend
      hashRate_1h: 0,
      hashRate_1d: 0,
      hashRateTimestamp: minerData.timestamp ?? 0,
      bestDiff: minerData.best_difficulty ?? "0",
      bestSessionDiff: minerData.best_session_difficulty ?? "0",
      sharesAccepted: minerData.shares_accepted ?? 0,
      sharesRejected: minerData.shares_rejected ?? 0,
      uptimeSeconds: minerData.uptime ?? 0,

      // Network
      ssid: "",
      wifiStatus: "",
      stratumURL: minerData.config?.pools?.groups?.[0]?.pools?.[0]?.url ?? "",
      stratumPort: 0,
      stratumUser: minerData.config?.pools?.groups?.[0]?.pools?.[0]?.user ?? "",

      // Hardware (Bitaxe-specific fields - will be empty for other miners)
      freeHeap: 0,
      coreVoltage: 0,
      coreVoltageActual: 0,
      frequency: 0,
      boardVersion: "",
      runningPartition: "",
      flipscreen: 0,
      invertscreen: 0,
      invertfanpolarity: 0,
      autofanspeed: 0,
      fanspeed: 0,
      efficiency: minerData.efficiency_fract ?? 0,
      frequencyOptions: [],
      coreVoltageOptions: [],

      // Additional fields from DeviceInfoNew
      maxPower: minerData.wattage_limit ?? minerData.wattage ?? 0,
      minPower: 0,
      maxVoltage: minerData.voltage ?? 0,
      minVoltage: 0,
      vrTemp: 0,
      jobInterval: 0,
      asicCount: minerData.total_chips ?? 0,
      smallCoreCount: 0,
      overheat_temp: 0,
      autoscreenoff: 0,
      fanrpm: minerData.fans?.[0]?.speed ?? 0,
      lastResetReason: "",
      history: {
        hashrate_10m: [],
        hashrate_1h: [],
        hashrate_1d: [],
        timestamps: [],
        timestampBase: 0,
      },
    } as Device["info"];

    return {
      ip: discoveredMiner.storageIp ?? discoveredMiner.ip,
      mac: discoveredMiner.mac,
      type: discoveredMiner.type,
      info: deviceInfo,
    };
  }

  /**
   * Convert miner validation result and data to Device format (legacy method).
   * 
   * @deprecated This method is kept for backward compatibility.
   * Use createDiscoveredMiner() + convertToLegacyDevice() for new code.
   * 
   * @param storageIp - The IP address to use for the device (storage IP, may differ from validation IP for mock devices)
   * @param mac - The MAC address of the device
   * @param validationResult - Validation result from pyasic-bridge (optional)
   * @param arpResult - ARP scan result (optional, for fallback type)
   * @param minerData - Full miner data from pyasic-bridge /miner/{ip}/data endpoint (optional)
   * @returns Device object ready for storage
   */
  static convertToDevice(
    storageIp: string,
    mac: string,
    validationResult: MinerValidationResult | null,
    arpResult: ArpScanResult | null,
    minerData: MinerData | null
  ): Device {
    const discoveredMiner = this.createDiscoveredMiner(
      storageIp,
      mac,
      validationResult,
      arpResult,
      minerData
    );
    return this.convertToLegacyDevice(discoveredMiner);
  }
}
