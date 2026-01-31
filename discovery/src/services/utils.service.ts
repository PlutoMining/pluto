/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

/**
 * Utility functions for discovery service.
 */
export class UtilsService {
  /**
   * Split an array into chunks of specified size.
   * 
   * @param array - Array to split
   * @param size - Size of each chunk
   * @returns Array of chunks
   */
  static chunkArray<T>(array: T[], size: number): T[][] {
    if (size <= 0) {
      throw new Error("Chunk size must be greater than 0");
    }

    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Convert a port number to a deterministic mock MAC address.
   * 
   * @param port - Port number
   * @returns MAC address string or undefined if port is invalid
   */
  static mockMacFromPort(port: unknown): string | undefined {
    const numericPort = typeof port === "number" ? port : Number(port);
    if (!Number.isFinite(numericPort) || numericPort <= 0) {
      return undefined;
    }

    const toHexByte = (value: number) => value.toString(16).padStart(2, "0");
    const hi = (numericPort >> 8) & 0xff;
    const lo = numericPort & 0xff;
    return `ff:ff:ff:ff:${toHexByte(hi)}:${toHexByte(lo)}`;
  }
}
