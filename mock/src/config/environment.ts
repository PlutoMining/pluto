/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

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
