// import dotenv from "dotenv";

// dotenv.config({ path: ".env.local" });

interface EnvConfig {
  port: number;
  mockDiscoveryHost: string;
  detectMockDevices: boolean;
  arpScanInterfaces: string[];
}

export const config: EnvConfig = {
  port: Number(process.env.PORT || 3000),
  detectMockDevices: process.env.DETECT_MOCK_DEVICES === "true",
  mockDiscoveryHost: process.env.MOCK_DISCOVERY_HOST!,
  arpScanInterfaces: process.env.ARP_SCAN_IFACES!.split(","),
};
