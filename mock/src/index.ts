import { Worker } from "worker_threads";
import { logger } from "@pluto/logger";
import { config } from "./config/environment";
import express, { Express } from "express";
import path from "path";
import { DeviceApiVersion } from "@pluto/interfaces";

interface ServerInfo {
  port: number;
  hostname: string;
  startTime: Date;
}

const activeServers: ServerInfo[] = [];
const { listingPort, ports } = config;

// Funzione per creare un worker per ogni mock server
const createMockServerWorker = (
  port: number,
  hostname: string,
  apiVersion: DeviceApiVersion
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.resolve(__dirname, "./mockWorker.js"), {
      workerData: { port, hostname, apiVersion },
    });

    worker.on("message", (message: any) => {
      if (message.status === "server_started") {
        logger.info(`Worker for ${hostname} started on port ${port}`);
        activeServers.push({
          port: message.port,
          hostname: message.hostname,
          startTime: new Date(),
        });
        resolve();
      }
    });

    worker.on("error", (error) => {
      logger.error(`Error in worker for ${hostname}:`, error);
      reject(error);
    });

    worker.on("exit", (code) => {
      if (code !== 0) {
        logger.error(`Worker for ${hostname} stopped with exit code ${code}`);
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
};

// Crea un worker per ogni porta definita in `config`
Promise.all(
  ports.map((port: number, i: number) =>
    createMockServerWorker(
      port,
      `mockaxe${i + 1}`,
      i % 2 === 0 ? DeviceApiVersion.Legacy : DeviceApiVersion.New // creo metà mock legacy e metà mock nuovi
    )
  )
)
  .then(() => logger.info("All mock servers started successfully"))
  .catch((error) => logger.error("Error starting mock servers:", error));

// Aggiungiamo un server per elencare tutti gli altri server attivi
const createListingServer = (port: number): void => {
  const app: Express = express();

  // Rotta per ottenere la lista dei server attivi, escluso se stesso
  app.get("/servers", (req, res) => {
    const listingHostname = `listing-server:${port}`;
    const otherServers = activeServers.filter((server) => server.port !== port);
    res.json({
      message: `Available servers from ${listingHostname}`,
      servers: otherServers,
    });
  });

  app.listen(port, () => {
    logger.info(`Listing server running on http://localhost:${port}`);
  });
};

// Avvia il server di listing
createListingServer(listingPort);
