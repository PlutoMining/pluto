import { logger } from "@pluto/logger";
import type { MinerData, SupportLevel, DetectionResult, BitaxeApiResponse } from "@pluto/interfaces";

export interface NativeDetectionResult extends DetectionResult {
  supportLevel: SupportLevel;
  minerData: MinerData;
}

interface INativeMinerDetector {
  detect(ip: string): Promise<NativeDetectionResult | null>;
}

/* ---------- Bitaxe native detector -------------------------------------- */

class BitaxeDetector implements INativeMinerDetector {
  async detect(ip: string): Promise<NativeDetectionResult | null> {
    try {
      const res = await fetch(`http://${ip}/api/system/info`, {
        signal: AbortSignal.timeout(2000),
      });
      if (!res.ok) return null;
      const data: BitaxeApiResponse = await res.json();
      if (!data.ASICModel) return null;

      const type = `Bitaxe ${data.boardVersion ?? ""}`.trim();

      const minerData: MinerData = {
        ip,
        mac: data.macAddr,
        hostname: data.hostname,
        deviceInfo: {
          make: "Bitaxe",
          model: type,
          firmware: data.version,
          algo: "SHA256",
        },
      };

      return {
        type,
        model: type,
        mac: data.macAddr,
        supportLevel: "native",
        minerData,
      };
    } catch {
      return null;
    }
  }
}

/* ---------- Registry ---------------------------------------------------- */

export class NativeMinerDetectorService {
  private detectors: INativeMinerDetector[] = [new BitaxeDetector()];

  async detect(ip: string): Promise<NativeDetectionResult | null> {
    for (const detector of this.detectors) {
      try {
        const result = await detector.detect(ip);
        if (result) {
          logger.info(`[discovery] Native detector: matched ${ip} (${result.type}), path=native`);
          return result;
        }
      } catch (err) {
        logger.debug(`Native detector failed for ${ip}:`, err);
      }
    }
    logger.debug(`[discovery] Native detector: no match for ${ip}`);
    return null;
  }
}

export const nativeMinerDetector = new NativeMinerDetectorService();
