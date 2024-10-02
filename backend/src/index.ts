import { logger } from "@pluto/logger";
import express from "express";
import http from "http";
import { config } from "./config/environment";
import metricsRoutes from "./routes/metrics.routes";
import dashboardsRoutes from "./routes/dashboards.routes";
import devicesRoutes from "./routes/devices.routes";
import presetsRoutes from "./routes/presets.routes";
import socketRoutes from "./routes/socket.routes";
import { listenToDevices } from "./services/device.service";
import { createGrafanaOverviewDashboard } from "./services/grafana.service";
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
app.use(dashboardsRoutes);
app.use(devicesRoutes);
app.use(presetsRoutes);
app.use(socketRoutes);

server.listen(port, async () => {
  if (autoListen) {
    await listenToDevices(); //no filter and log tracing disabled

    // Crea o aggiorna la dashboard Grafana dell'overview
    await createGrafanaOverviewDashboard();
  }

  logger.info(`Server running on http://localhost:${port}`);
});
