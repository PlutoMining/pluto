import { Request, Response } from "express";
import { generateSystemInfo } from "../services/mock.service";
import { DeviceInfo } from "@pluto/interfaces";

// Funzione per calcolare l'uptime
const calculateUptime = (startTime: Date): number => {
  const currentTime = new Date();
  const uptimeMs = currentTime.getTime() - startTime.getTime();
  const uptimeSeconds = Math.floor(uptimeMs / 1000);
  return uptimeSeconds;
};

export const getSystemInfo = async (req: Request, res: Response) => {
  try {
    // Recupera il hostname salvato in app.locals
    const hostname = req.app.locals.hostname;

    console.log(req.app.locals.startTime);

    const uptimeSeconds = calculateUptime(req.app.locals.startTime);
    const systemInfo = generateSystemInfo(hostname, uptimeSeconds, req.app.locals.systemInfo);
    res.json(systemInfo);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve system info" });
  }
};

export const patchSystemInfo = async (req: Request, res: Response) => {
  try {
    const updatedInfo: Partial<DeviceInfo> = req.body;

    // Se ci sono campi da aggiornare, vengono salvati su req.app.locals
    if (!req.app.locals.systemInfo) {
      req.app.locals.systemInfo = {};
    }

    // Aggiorna i campi di systemInfo solo se presenti nel body
    req.app.locals.systemInfo = {
      ...req.app.locals.systemInfo,
      ...updatedInfo,
    };

    res.status(200).json({ message: "System info updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update system info" });
  }
};

export const restartSystem = async (req: Request, res: Response) => {
  try {
    // Imposta il flag di riavvio
    req.app.locals.isRestarting = true;

    // Invia la risposta HTML immediatamente
    res.setHeader("Content-Type", "text/html");
    res.status(200).send("<html><body><h1>System will restart shortly.</h1></body></html>");

    // Simula un tempo di "riavvio" di 5 secondi
    setTimeout(() => {
      req.app.locals.isRestarting = false;
      console.log("System has restarted and is available again.");
    }, 5000); // 5 secondi di timeout
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};
