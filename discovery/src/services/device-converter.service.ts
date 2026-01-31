/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { Device, PyasicMinerInfo, type DeviceSource } from "@pluto/interfaces";

/**
 * Interface for miner validation result from pyasic-bridge
 */
export interface MinerValidationResult {
  ip: string;
  is_miner: boolean;
  model: string | null;
  error: string | null;
}

/**
 * Service for converting miner information from pyasic-bridge format to Device format.
 * 
 * This service extracts the conversion logic to make it easier to refactor
 * in the future if the Discovery service adopts the MinerInfo interface directly.
 */
export class DeviceConverterService {
  /**
   * Convert miner validation result and data to Device format.
   * 
   * Stores pyasic-bridge response directly without transformation.
   * 
   * @param ip - The IP address to use for the device (storage IP, may differ from validation IP for mock devices)
   * @param mac - The MAC address of the device
   * @param model - The miner model from validation result (optional)
   * @param fallbackType - Fallback type if model is not available (e.g., from ARP scan)
   * @param minerData - Full miner data from pyasic-bridge /miner/{ip}/data endpoint (PyasicMinerInfo)
   * @returns Device object ready for storage
   */
  static convertMinerInfoToDevice(
    ip: string,
    mac: string,
    model: string | null,
    fallbackType: string | undefined,
    minerData: Partial<PyasicMinerInfo> | null,
    source: DeviceSource = "real"
  ): Device {
    // Extract model from pyasic data if available, otherwise use validation result or fallback
    const deviceModel =
      minerData?.device_info?.model ||
      minerData?.model ||
      model ||
      fallbackType ||
      "unknown";

    // Normalize device-specific fields into extra_config (pyasic model: only general fields at top level)
    const raw = minerData as Record<string, unknown> | null | undefined;
    const baseExtra = (minerData?.config as { extra_config?: Record<string, unknown> } | undefined)?.extra_config ?? {};
    const extra_config: Record<string, unknown> = { ...baseExtra };
    if (raw?.frequency !== undefined) extra_config.frequency = raw.frequency;
    if (raw?.coreVoltage !== undefined) extra_config.core_voltage = raw.coreVoltage;
    if (raw?.coreVoltageActual !== undefined) extra_config.core_voltage_actual = raw.coreVoltageActual;
    if (raw?.freeHeap !== undefined) extra_config.free_heap = raw.freeHeap;
    if (raw?.isPSRAMAvailable !== undefined) extra_config.is_psram_available = raw.isPSRAMAvailable;

    const baseConfig = minerData?.config ?? {
      pools: { groups: [] },
      fan_mode: { mode: "auto", speed: 0, minimum_fans: 0 },
      temperature: { target: null, hot: null, danger: null },
      mining_mode: { mode: "normal" },
      extra_config: {},
    };
    const config = { ...baseConfig, extra_config };

    const pyasicInfo: PyasicMinerInfo = {
      ip: minerData?.ip || ip,
      mac: minerData?.mac || mac,
      hostname: minerData?.hostname || "unknown",
      device_info: minerData?.device_info || {
        make: minerData?.make || "unknown",
        model: deviceModel,
        firmware: minerData?.firmware || minerData?.fw_ver || "unknown",
        algo: minerData?.algo || "unknown",
      },
      serial_number: minerData?.serial_number ?? null,
      psu_serial_number: minerData?.psu_serial_number ?? null,
      api_ver: minerData?.api_ver || "",
      fw_ver: minerData?.fw_ver || "",
      sticker_hashrate: minerData?.sticker_hashrate ?? null,
      expected_hashrate: minerData?.expected_hashrate || {
        unit: { value: 1000000000000, suffix: "TH/s" },
        rate: 0,
      },
      expected_hashboards: minerData?.expected_hashboards ?? 0,
      expected_chips: minerData?.expected_chips ?? 0,
      expected_fans: minerData?.expected_fans ?? 0,
      env_temp: minerData?.env_temp ?? null,
      wattage: minerData?.wattage ?? 0,
      voltage: minerData?.voltage ?? null,
      network_difficulty: minerData?.network_difficulty ?? 0,
      best_difficulty: minerData?.best_difficulty || "0",
      best_session_difficulty: minerData?.best_session_difficulty || "0",
      shares_accepted: minerData?.shares_accepted ?? 0,
      shares_rejected: minerData?.shares_rejected ?? 0,
      fans: minerData?.fans || [],
      fan_psu: minerData?.fan_psu ?? null,
      hashboards: minerData?.hashboards || [],
      config,
      fault_light: minerData?.fault_light ?? null,
      errors: minerData?.errors || [],
      is_mining: minerData?.is_mining ?? false,
      uptime: minerData?.uptime ?? 0,
      pools: minerData?.pools || [],
      hashrate: minerData?.hashrate || {
        unit: { value: 1000000000, suffix: "Gh/s" },
        rate: 0,
      },
      wattage_limit: minerData?.wattage_limit ?? null,
      total_chips: minerData?.total_chips ?? 0,
      nominal: minerData?.nominal ?? false,
      percent_expected_chips: minerData?.percent_expected_chips ?? 0,
      percent_expected_hashrate: minerData?.percent_expected_hashrate ?? 0,
      percent_expected_wattage: minerData?.percent_expected_wattage ?? null,
      temperature_avg: minerData?.temperature_avg ?? 0,
      efficiency: minerData?.efficiency || {
        unit: { suffix: "J/Th" },
        rate: 0,
      },
      efficiency_fract: minerData?.efficiency_fract ?? 0,
      datetime: minerData?.datetime || new Date().toISOString(),
      timestamp: minerData?.timestamp ?? Math.floor(Date.now() / 1000),
      make: minerData?.make || minerData?.device_info?.make || "unknown",
      model: deviceModel,
      firmware: minerData?.firmware || minerData?.device_info?.firmware || "unknown",
      algo: minerData?.algo || minerData?.device_info?.algo || "unknown",
    };

    return {
      ip,
      mac,
      type: deviceModel,
      info: pyasicInfo,
      source,
    };
  }
}
