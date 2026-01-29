/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { logger } from "@pluto/logger";
import express from "express";
import { config } from "./config/environment";
import discoverRoutes from "./routes/discover.routes";

export function createDiscoveryApp() {
  const app = express();

  app.use(express.json());

  // Aggiungi le rotte per la scoperta dei dispositivi
  app.use(discoverRoutes);

  return app;
}

export async function startServer(opts?: { port?: number }) {
  const port = opts?.port ?? config.port;
  const app = createDiscoveryApp();

  const server = app.listen(port);

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.once("listening", () => resolve());
  });

  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;
  logger.info(`Server running on http://localhost:${actualPort}`);

  return { server, port: actualPort };
}

export const serverPromise = startServer().catch((err) => {
  logger.error("Failed to start discovery server", err);
  process.exitCode = 1;
  return undefined;
});
