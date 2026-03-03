/**
 * Helper functions for pool/stratum URL parsing.
 * Used by DeviceSettingsAccordion and PresetAccordion.
 */

export interface StratumFormState {
  stratumURL: string;
  stratumPort: number | undefined;
  stratumUser: string;
  stratumPassword: string;
  workerName: string;
}

export function parseStratumUrl(url: string): { url: string; port?: number } {
  if (!url || typeof url !== "string") {
    return { url: "" };
  }

  try {
    const match = url.match(/^(stratum\+tcp:\/\/[^:]+)(?::(\d+))?(\/.*)?$/);
    if (match) {
      const baseUrl = match[1];
      const portStr = match[2];
      const port = portStr ? parseInt(portStr, 10) : undefined;
      return {
        url: portStr ? `${baseUrl}:${portStr}` : baseUrl,
        port: port && Number.isFinite(port) && port > 0 ? port : undefined,
      };
    }

    return { url };
  } catch {
    return { url };
  }
}

export function buildStratumUrl(baseUrl: string, port?: number): string {
  if (!baseUrl) return "";

  if (baseUrl.includes(":")) {
    return baseUrl;
  }

  if (port && Number.isFinite(port) && port > 0) {
    return `${baseUrl}:${port}`;
  }

  return baseUrl;
}
