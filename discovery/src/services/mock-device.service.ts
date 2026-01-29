/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
 */

import { insertOne, updateOne } from "@pluto/db";
import type { Device } from "@pluto/interfaces";
import { logger } from "@pluto/logger";
import axios from "axios";

import type { ArpScanResult } from "./arpScanWrapper";
import { DeviceConverterService } from "./device-converter.service";
import { config } from "../config/environment";

/**
 * Service responsible for handling mock devices discovered via the mock service.
 *
 * This keeps the mock-specific logic (system info calls, conversions and DB writes)
 * separate from the main discovery flow.
 */
export class MockDeviceService {
  /**
   * Detect whether a device entry represents a mock device.
   *
   * Mock devices use a deterministic MAC prefix `ff:ff:ff:ff:*`, which normal NICs never use,
   * so we can safely rely on it to identify them.
   */
  static isMockDevice(device: ArpScanResult): boolean {
    return (
      typeof device.mac === "string" &&
      device.mac.toLowerCase().startsWith("ff:ff:ff:ff:")
    );
  }

  /**
   * Fetch full system info for mock devices and upsert them into the discovery DB.
   *
   * Returns the list of Device objects that were successfully handled.
   */
  static async handleMockDevices(mockDevices: ArpScanResult[]): Promise<Device[]> {
    const devices: Device[] = [];

    logger.info(`Starting validation for ${mockDevices.length} mock device(s)`);

    for (const mockDevice of mockDevices) {
      try {
        // Use unified endpoint - mock devices are handled transparently
        const url = `${config.pyasicBridgeHost}/miner/${encodeURIComponent(
          mockDevice.ip
        )}/data`;
        logger.info(`[Mock Device Validation] Fetching data for ${mockDevice.ip} (MAC: ${mockDevice.mac}) from ${url}`);

        const response = await axios.get(url, {
          timeout: config.pyasicValidationTimeout,
        });
        const systemInfo = response.data || {};

        logger.debug(`[Mock Device Validation] Raw response for ${mockDevice.ip}:`, {
          hasDeviceInfo: !!systemInfo.device_info,
          deviceInfo: systemInfo.device_info,
          hasModel: !!systemInfo.model,
          model: systemInfo.model,
          hasMake: !!systemInfo.make,
          make: systemInfo.make,
          hasFirmware: !!systemInfo.firmware,
          firmware: systemInfo.firmware,
          hasFwVer: !!systemInfo.fw_ver,
          fwVer: systemInfo.fw_ver,
          responseKeys: Object.keys(systemInfo),
        });

        // Extract model from pyasic schema
        const model =
          systemInfo.device_info?.model ||
          systemInfo.model ||
          mockDevice.type ||
          "Mock Miner";

        logger.info(`[Mock Device Validation] Extracted model for ${mockDevice.ip}: ${model}`, {
          fromDeviceInfo: systemInfo.device_info?.model,
          fromModel: systemInfo.model,
          fromType: mockDevice.type,
          finalModel: model,
        });

        const deviceInfo = DeviceConverterService.convertMinerInfoToDevice(
          mockDevice.ip,
          mockDevice.mac,
          model,
          mockDevice.type,
          systemInfo,
          "mock"
        );

        logger.info(`[Mock Device Validation] Converted device info for ${mockDevice.ip}:`, {
          type: deviceInfo.type,
          model: deviceInfo.info.model,
          make: deviceInfo.info.make,
          firmware: deviceInfo.info.firmware,
          deviceInfoModel: deviceInfo.info.device_info?.model,
          deviceInfoMake: deviceInfo.info.device_info?.make,
          deviceInfoFirmware: deviceInfo.info.device_info?.firmware,
        });

        devices.push(deviceInfo);
        logger.info(
          `Mock device ${mockDevice.ip} (${model}) added to the discovered list.`
        );

        try {
          await insertOne<Device>(
            "pluto_discovery",
            "devices:discovered",
            mockDevice.mac,
            deviceInfo
          );
          logger.info(`Mock device ${mockDevice.ip} inserted successfully.`);
        } catch (error) {
          if (error instanceof Error && error.message.includes("already exists")) {
            logger.info(`Mock device ${mockDevice.ip} already exists, updating...`);
            await updateOne<Device>(
              "pluto_discovery",
              "devices:discovered",
              mockDevice.mac,
              deviceInfo
            );
          } else {
            throw error;
          }
        }
      } catch (error) {
        logger.error(
          `Failed to handle mock device ${mockDevice.ip}:`,
          error instanceof Error ? error.message : String(error)
        );
      }
    }

    return devices;
  }
}

