// import dotenv from "dotenv";

// dotenv.config({ path: ".env.local" });

interface EnvConfig {
  listingPort: number;
  ports: number[];
  logsPubEnabled: boolean;
}

export const config: EnvConfig = {
  listingPort: Number(process.env.LISTING_PORT),
  ports: process.env.PORTS!.split(",").map((p) => Number(p)),
  logsPubEnabled: process.env.LOGS_PUB_ENABLED === "true",
};
