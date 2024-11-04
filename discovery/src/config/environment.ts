// import dotenv from "dotenv";

// dotenv.config({ path: ".env.local" });

interface EnvConfig {
  port: number;
  mockDiscoveryHost: string;
  detectMockDevices: boolean;
}

export const config: EnvConfig = {
  port: Number(process.env.PORT || 3000),
  detectMockDevices: process.env.DETECT_MOCK_DEVICES === "false",
  mockDiscoveryHost: process.env.MOCK_DISCOVERY_HOST!,
};
