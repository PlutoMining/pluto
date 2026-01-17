/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { logger } from "@pluto/logger";
import express from "express";
import http from "http";
import { config } from "./config/environment";
import metricsRoutes from "./routes/metrics.routes";
import devicesRoutes from "./routes/devices.routes";
import presetsRoutes from "./routes/presets.routes";
import socketRoutes from "./routes/socket.routes";
import prometheusRoutes from "./routes/prometheus.routes";
import { listenToDevices } from "./services/device.service";
import { removeSecretsMiddleware } from "./middleware/remove-secrets.middleware";

const { port, autoListen } = config;

const app = express();
const server = http.createServer(app);

app.use(express.json());

app.use(removeSecretsMiddleware);

// Imposta il server nell'app per poterlo riutilizzare nei controller
app.set("server", server);

// Aggiungi le rotte
app.use(metricsRoutes);
app.use(prometheusRoutes);
app.use(devicesRoutes);
app.use(presetsRoutes);
app.use(socketRoutes);

server.listen(port, async () => {
  if (autoListen) {
    await listenToDevices(); //no filter and log tracing disabled
  }

  logger.info(`Server running on http://localhost:${port}`);
});
