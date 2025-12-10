/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

export interface ParsedStratumURL {
  protocolVersion: 'v1' | 'v2';
  host: string;
  port: number;
  authorityKey?: string;  // Only for V2
  originalURL: string;
}

/**
 * Checks if a URL is in Stratum V2 format
 * V2 format: stratum2+tcp://host:port/authority_key
 */
export function isStratumV2URL(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }
  return url.startsWith('stratum2+tcp://') || url.startsWith('stratum2+ssl://');
}

/**
 * Parses a Stratum URL (V1 or V2) and extracts its components
 * @param url - The Stratum URL to parse
 * @param port - Optional port number (used for V1 if not in URL)
 * @returns Parsed URL components
 */
export function parseStratumURL(url: string, port?: number): ParsedStratumURL {
  if (!url || typeof url !== 'string') {
    throw new Error('URL must be a non-empty string');
  }

  // Check if it's a V2 URL
  if (isStratumV2URL(url)) {
    return parseStratumV2URL(url);
  }

  // Parse V1 URL
  return parseStratumV1URL(url, port);
}

/**
 * Parses a Stratum V2 URL
 * Format: stratum2+tcp://host:port/authority_key
 */
function parseStratumV2URL(url: string): ParsedStratumURL {
  const v2Regex = /^stratum2\+tcp:\/\/([^:]+):(\d+)\/(.+)$/;
  const v2SslRegex = /^stratum2\+ssl:\/\/([^:]+):(\d+)\/(.+)$/;
  
  let match = url.match(v2Regex) || url.match(v2SslRegex);
  
  if (!match) {
    throw new Error(`Invalid Stratum V2 URL format: ${url}`);
  }

  const host = match[1];
  const port = parseInt(match[2], 10);
  const authorityKey = match[3];

  if (isNaN(port) || port < 0 || port > 65535) {
    throw new Error(`Invalid port number in V2 URL: ${port}`);
  }

  return {
    protocolVersion: 'v2',
    host,
    port,
    authorityKey,
    originalURL: url,
  };
}

/**
 * Parses a Stratum V1 URL
 * Formats: 
 * - host (port provided separately)
 * - stratum+tcp://host:port
 * - host:port
 */
function parseStratumV1URL(url: string, port?: number): ParsedStratumURL {
  // Try parsing as stratum+tcp://host:port
  const v1Regex = /^stratum\+tcp:\/\/([^:]+):(\d+)$/;
  let match = url.match(v1Regex);

  if (match) {
    const host = match[1];
    const parsedPort = parseInt(match[2], 10);
    
    if (isNaN(parsedPort) || parsedPort < 0 || parsedPort > 65535) {
      throw new Error(`Invalid port number in V1 URL: ${parsedPort}`);
    }

    return {
      protocolVersion: 'v1',
      host,
      port: parsedPort,
      originalURL: url,
    };
  }

  // Try parsing as host:port
  const hostPortRegex = /^([^:]+):(\d+)$/;
  match = url.match(hostPortRegex);

  if (match) {
    const host = match[1];
    const parsedPort = parseInt(match[2], 10);
    
    if (isNaN(parsedPort) || parsedPort < 0 || parsedPort > 65535) {
      throw new Error(`Invalid port number: ${parsedPort}`);
    }

    return {
      protocolVersion: 'v1',
      host,
      port: parsedPort,
      originalURL: url,
    };
  }

  // Just hostname, use provided port or default
  if (!port) {
    throw new Error('Port number required for V1 URL without port');
  }

  if (port < 0 || port > 65535) {
    throw new Error(`Invalid port number: ${port}`);
  }

  return {
    protocolVersion: 'v1',
    host: url,
    port,
    originalURL: url,
  };
}

/**
 * Builds a Stratum V2 URL from components
 * @param host - Pool hostname or IP
 * @param port - Pool port number
 * @param authorityKey - Authority public key (base58-check encoded)
 * @returns Complete V2 URL string
 */
export function buildStratumV2URL(host: string, port: number, authorityKey: string): string {
  if (!host || typeof host !== 'string') {
    throw new Error('Host must be a non-empty string');
  }

  if (typeof port !== 'number' || port < 0 || port > 65535) {
    throw new Error('Port must be a number between 0 and 65535');
  }

  if (!authorityKey || typeof authorityKey !== 'string') {
    throw new Error('Authority key must be a non-empty string');
  }

  return `stratum2+tcp://${host}:${port}/${authorityKey}`;
}

/**
 * Extracts host and port from a Stratum URL (V1 or V2)
 * Useful for pool identification in metrics
 */
export function extractPoolIdentifier(url: string, port?: number): string {
  try {
    const parsed = parseStratumURL(url, port);
    return `${parsed.host}:${parsed.port}`;
  } catch (error) {
    // Fallback: return original URL if parsing fails
    return url;
  }
}
