/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { updateOne } from "@pluto/db";
import { Device, DeviceInfo, ExtendedDeviceInfo } from "@pluto/interfaces";
import { createCustomLogger, logger } from "@pluto/logger";
import { asyncForEach, sanitizeHostname } from "@pluto/utils";
import axios from "axios";
import { Server as NetServer } from "http";
import { Server as ServerIO } from "socket.io";
import WebSocket from "ws";
import { config } from "../config/environment";
import {
  createMetricsForDevice,
  deleteMetricsForDevice,
  updateOverviewMetrics,
} from "./metrics.service"; // Aggiunta funzione per rimuovere metriche

let isListeningLogs = false;
let ipMap: {
  [key: string]: {
    ws?: WebSocket;
    timeout?: NodeJS.Timeout;
    info?: DeviceInfo;
    tracing?: boolean;
  };
} = {}; // Mappa che tiene traccia degli IP attivi
let ioInstance: ServerIO | undefined = undefined; // Cambiato a undefined invece di null

/**
 * Funzione che avvia la gestione dei WebSocket.
 */
export function startIoHandler(server: NetServer) {
  if (!ioInstance) {
    logger.info("Starting ioHandler for the devices");
    ioInstance = new ServerIO(server, {
      path: "/socket/io",
      addTrailingSlash: false,
      pingInterval: 10000,
      pingTimeout: 5000,
    });

    ioInstance.on("connection", (socket) => {
      socket.on("enableLogsListening", () => {
        isListeningLogs = true;
        logger.info("External WebSocket listening enabled");
        ioInstance!.emit("logsListeningStatus", isListeningLogs);
      });

      socket.on("disableLogsListening", () => {
        isListeningLogs = false;
        logger.info("External WebSocket listening disabled");
        ioInstance!.emit("logsListeningStatus", isListeningLogs);
      });

      socket.on("checkLogsListening", () => {
        socket.emit("logsListeningStatus", isListeningLogs);
      });
    });
  }
}

/**
 * Funzione che aggiorna la lista degli IP per il polling,
 * aggiungendo solo nuovi IP e rimuovendo quelli non più presenti.
 */
export async function updateOriginalIpsListeners(newDevices: Device[], traceLogs?: boolean) {
  // Rimuovi gli IP che non sono più presenti
  await asyncForEach(Object.keys(ipMap), async (existingIp) => {
    if (!newDevices.some((d) => d.ip === existingIp)) {
      logger.info(`Stopping monitoring for IP ${existingIp}`);

      // Ferma il polling
      clearTimeout(ipMap[existingIp].timeout);

      // Chiudi la connessione WebSocket
      ipMap[existingIp].ws?.close();

      ioInstance?.emit("device_removed", {
        ipRemoved: existingIp,
        remainingIps: Object.keys(ipMap).filter((k) => k !== existingIp),
      });

      if (config.deleteDataOnDeviceRemove) {
        try {
          // Rimuovi le metriche di Prometheus
          deleteMetricsForDevice(sanitizeHostname(ipMap[existingIp].info?.hostname!));
          logger.info(`Deleted Prometheus metrics for IP ${existingIp}`);
        } catch (err) {
          logger.error(`Failed to delete Prometheus metrics for IP ${existingIp}:`, err);
        }
      }

      // Rimuovi l'IP dalla mappa
      delete ipMap[existingIp];
    }
  });

  // Aggiungi nuovi IP
  for (const device of newDevices) {
    if (!ipMap[device.ip]) {
      logger.info(`Adding new IP to the listening pool: ${device.ip}`);
      await startDeviceMonitoring(device, traceLogs); // Inizia il monitoraggio del nuovo dispositivo
    } else {
      logger.info(`IP ${device.ip} is already being monitored.`);
    }
  }
}

/**
 * Funzione che inizia il monitoraggio di un dispositivo.
 */
function startDeviceMonitoring(device: Device, traceLogs?: boolean) {
  const { updatePrometheusMetrics } = createMetricsForDevice(
    sanitizeHostname(device.info.hostname)
  );

  let retryAttempts = 0;
  const maxRetryAttempts = 5;
  let ws: WebSocket | undefined;
  let timeoutId: NodeJS.Timeout | undefined; // Aggiunto per salvare l'ID del timeout

  // Funzione per connettersi al WebSocket
  const connectWebSocket = (): void => {
    ws = new WebSocket(`ws://${device.ip}/api/ws`);

    ws.on("open", () => {
      logger.debug(`Connected to WebSocket for IP ${device.ip}`);
      retryAttempts = 0;
      // Aggiorna la mappa con il WebSocket attivo
      ipMap[device.ip].ws = ws;
    });

    ws.on("close", () => {
      logger.debug(`Disconnected from WebSocket for IP ${device.ip}`);
      attemptReconnect();
    });

    ws.on("error", (error: Error) => {
      logger.error(`Connection error for IP ${device.ip}:`, error);
      attemptReconnect();
    });

    ws.on("message", (message: WebSocket.Data) => {
      const messageString = message.toString();
      logger.debug(`Received message for IP ${device.ip}:`, messageString);

      const logsLogger = createCustomLogger(device.info.hostname);
      logsLogger.info(messageString);

      // Invia i log al client WebSocket se abilitato
      if (isListeningLogs) {
        ioInstance?.emit("logs_update", { ...device, info: messageString });
      }

      // // Aggiorna le metriche con i dati dei log ricevuti
      // updatePrometheusMetrics(messageString);
    });
  };

  // Funzione per tentare la riconnessione
  const attemptReconnect = (): void => {
    if (retryAttempts < maxRetryAttempts) {
      retryAttempts += 1;
      const retryDelay = Math.min(5000, retryAttempts * 1000);
      logger.info(`Attempting to reconnect to ${device.ip} in ${retryDelay / 1000} seconds...`);
      setTimeout(connectWebSocket, retryDelay);
    } else {
      logger.error(`Max retry attempts reached for IP ${device.ip}. Giving up.`);
    }
  };

  // Funzione per eseguire il polling delle informazioni di sistema
  const pollSystemInfo = async (): Promise<void> => {
    const startTime = Date.now(); // Registra il tempo di inizio

    try {
      logger.debug(`Polling system info from ${device.ip}`);
      const response = await axios.get(`http://${device.ip}/api/system/info`);

      const extendedDevice: Device = {
        ...device,
        tracing: true,
        info: response.data,
      };

      delete extendedDevice.presetUuid; // @hack to avoid that presetId gets reset

      const updatedDevice = await updateOne<Device>(
        "pluto_core",
        "devices:imprinted",
        device.mac,
        extendedDevice
      );

      // Invia i dati delle informazioni di sistema al client WebSocket
      ioInstance?.emit("stat_update", updatedDevice);

      // Aggiorna le metriche Prometheus con i dati del sistema
      updatePrometheusMetrics(response.data);

      // Aggiorna i dati nella mappa ipMap per il dispositivo corrente
      ipMap[device.ip].info = response.data;
      ipMap[device.ip].tracing = true;

    } catch (error: any) {
      const extendedDevice = { ...device, tracing: false };

      logger.error(`Failed to make request to ${device.ip}:`, error);
      ioInstance?.emit("error", { ...extendedDevice, error: error.message });

      // // Se il polling fallisce, aggiorna il dispositivo come offline in ipMap
      // ipMap[device.ip].metrics = {
      //   hashrate: 0,
      //   power: 0,
      //   firmwareVersion: "unknown",
      //   sharesAccepted: 0,
      //   sharesRejected: 0,
      //   isOnline: false,
      // };

      ipMap[device.ip].tracing = false;
    } finally {
      // Calcola il tempo impiegato dalla funzione di polling
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(5000 - elapsedTime, 0); // Assicurati che non sia negativo

      logger.debug(
        `pollSystemInfo from ${device.ip} took ${elapsedTime} ms. Waiting for ${remainingTime} ms before next polling.`
      );

      // Ripetere il polling dopo il tempo rimanente e salva l'ID del timeout
      timeoutId = setTimeout(pollSystemInfo, remainingTime);
      ipMap[device.ip].timeout = timeoutId;

      // Alla fine di ogni polling, aggiorna le metriche di overview con i dati di tutti i dispositivi
      const allMetrics: ExtendedDeviceInfo[] = Object.values(ipMap).map((entry) => ({
        ...entry.info!,
        tracing: entry.tracing,
      }));
      updateOverviewMetrics(allMetrics);
    }
  };

  // Avvia il polling la prima volta
  pollSystemInfo();

  if (traceLogs) {
    // Inizia la connessione WebSocket per questo dispositivo
    connectWebSocket();
  }

  // Aggiungi l'IP alla mappa con il WebSocket e l'ID di timeout per il polling
  ipMap[device.ip] = { ws, timeout: timeoutId, info: device.info };
}

/**
 * Getter per ottenere l'istanza di `io`.
 */
export function getIoInstance(): ServerIO | undefined {
  return ioInstance;
}
