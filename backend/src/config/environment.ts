// import dotenv from "dotenv";

// dotenv.config({ path: ".env.local" });

interface EnvConfig {
  port: number;
  autoListen: boolean;
  discoveryServiceHost: string;
  gfHost: string;
  deleteDataOnDeviceRemove: boolean;
}

export const config: EnvConfig = {
  port: Number(process.env.PORT || 3000),
  autoListen: process.env.AUTO_LISTEN === "true",
  discoveryServiceHost: process.env.DISCOVERY_SERVICE_HOST!,
  gfHost: process.env.GF_HOST!,
  deleteDataOnDeviceRemove: process.env.DELETE_DATA_ON_DEVICE_REMOVE === "true",
};
