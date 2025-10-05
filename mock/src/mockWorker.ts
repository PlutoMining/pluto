/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { parentPort, workerData } from "worker_threads";
import { logger } from "@pluto/logger";
import express, { Express } from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { generateFakeLog } from "./services/mock.service";
import systemRoutes from "./routes/system.routes";
import { config } from "./config/environment";
import { checkIfRestarting } from "./middlewares/checkIfRestarting";
import { DeviceApiVersion } from "@pluto/interfaces";

interface ServerInfo {
  port: number;
  hostname: string;
  startTime: Date;
}

const { port, hostname, apiVersion } = workerData as {
  port: number;
  hostname: string;
  apiVersion: DeviceApiVersion;
};

const activeServers: ServerInfo[] = [];

// Funzione per creare un mock server (HTTP e WebSocket)
const createMockServer = (port: number, hostname: string, apiVersion: DeviceApiVersion): void => {
  const app: Express = express();
  const server = createServer(app);

  const startTime = new Date();

  // Salva il hostname nell'app Express
  app.locals.hostname = hostname;
  app.locals.apiVersion = apiVersion;
  app.locals.startTime = startTime;

  if (config.logsPubEnabled) {
    // WebSocket server che utilizza lo stesso server HTTP
    const wss = new WebSocketServer({ server });

    // Funzione asincrona per inviare log fittizi a tutti i client connessi
    const broadcastLogs = async (): Promise<void> => {
      const startTime = Date.now();

      wss.clients.forEach((client: any) => {
        if (client.readyState === client.OPEN) {
          const log = generateFakeLog();
          client.send(JSON.stringify({ log }));
          logger.debug(`Sent log to WebSocket client: ${log}`);
        }
      });

      // Calcola il tempo trascorso e il tempo rimanente da attendere prima di inviare il prossimo log
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(5000 - elapsedTime, 0); // 5 secondi - tempo impiegato

      logger.debug(
        `Broadcast took ${elapsedTime} ms. Waiting ${remainingTime} ms for next broadcast.`
      );
      setTimeout(broadcastLogs, remainingTime); // Avvia la prossima iterazione dopo il tempo rimanente
    };

    // Inizia l'invio dei log
    broadcastLogs();
  }

  app.use(express.json());

  // Applica il middleware a tutte le rotte
  app.use(checkIfRestarting);

  // Usa le rotte definite
  app.use(systemRoutes);

  // Avvia il server HTTP e WebSocket sulla stessa porta
  server.listen(port, () => {
    logger.info(`HTTP Server (${hostname}) running on http://localhost:${port}`);
    logger.info(`WebSocket Server (${hostname}) running on ws://localhost:${port}`);

    // Comunica al parent thread che il server è stato avviato
    parentPort?.postMessage({ status: "server_started", port, hostname });
  });

  // Aggiunge il server alla lista dei server attivi
  activeServers.push({ port, hostname, startTime });
};

// Creiamo il server utilizzando i dati passati dal main thread
createMockServer(port, hostname, apiVersion);
