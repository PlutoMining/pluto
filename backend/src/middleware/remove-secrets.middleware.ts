/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { NextFunction, Request, Response } from "express";
import { redactSecrets } from "../utils/redact-secrets";

// Middleware per rimuovere i campi segreti dalla risposta
export const removeSecretsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;

  res.send = function (body) {
    try {
      // Tenta di fare il parsing se `body` è una stringa JSON
      let jsonResponse = JSON.parse(body);

      // Rimuovi i campi segreti dall'oggetto o array ricorsivamente
      redactSecrets(jsonResponse);

      // Serializza di nuovo il body modificato
      body = JSON.stringify(jsonResponse);
    } catch (_error) {
      // Se non è un JSON, lascia il `body` invariato
    }

    return originalSend.call(this, body);
  };

  next();
};
