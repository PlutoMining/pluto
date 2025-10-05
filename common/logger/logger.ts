/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import fs from "fs";
import winston from "winston";

// Crea la cartella logs se non esiste
const logDir = "logs";
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Configurazione di base di Winston per loggare su console e file
export const logger = winston.createLogger({
  level: "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      // Controlla se il messaggio è un oggetto, in tal caso loggalo come JSON
      const formattedMessage =
        typeof message === "object" ? JSON.stringify(message, null, 2) : message;
      return `${timestamp} [${level.toUpperCase()}]: ${formattedMessage}`;
    })
  ),
  transports: [
    new winston.transports.Console(), // Logga su console
    new winston.transports.File({ filename: `${logDir}/combined.log` }), // Logga su file nella cartella logs
  ],
});

// Funzione per creare un logger con un nome di file personalizzato
export const createCustomLogger = (fileName: string) => {
  return winston.createLogger({
    level: "debug",
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.printf(({ timestamp, level, message }) => {
        // Controlla se il messaggio è un oggetto, in tal caso loggalo come JSON
        const formattedMessage =
          typeof message === "object" ? JSON.stringify(message, null, 2) : message;
        return `${timestamp} [${level.toUpperCase()}]: ${formattedMessage}`;
      })
    ),
    transports: [
      new winston.transports.File({ filename: `${logDir}/${fileName}.log` }), // Logga su file nella cartella logs
    ],
  });
};
