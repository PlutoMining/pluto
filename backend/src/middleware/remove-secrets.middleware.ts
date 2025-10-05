/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { NextFunction, Request, Response } from "express";

// Funzione ricorsiva per rimuovere campi segreti
const removeSecrets = (obj: any): void => {
  if (Array.isArray(obj)) {
    // Se l'oggetto è un array, applica la rimozione dei campi segreti ad ogni elemento
    obj.forEach((item) => removeSecrets(item));
  } else if (obj && typeof obj === "object") {
    // Rimuovi i campi segreti se presenti
    delete obj.stratumPassword;
    delete obj.wifiPassword;

    // Itera su tutte le chiavi dell'oggetto e applica ricorsivamente la rimozione
    Object.keys(obj).forEach((key) => {
      if (typeof obj[key] === "object") {
        removeSecrets(obj[key]);
      }
    });
  }
};

// Middleware per rimuovere i campi segreti dalla risposta
export const removeSecretsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;

  res.send = function (body) {
    try {
      // Tenta di fare il parsing se `body` è una stringa JSON
      let jsonResponse = JSON.parse(body);

      // Rimuovi i campi segreti dall'oggetto o array ricorsivamente
      removeSecrets(jsonResponse);

      // Serializza di nuovo il body modificato
      body = JSON.stringify(jsonResponse);
    } catch (error) {
      // Se non è un JSON, lascia il `body` invariato
    }

    return originalSend.call(this, body);
  };

  next();
};
