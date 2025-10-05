/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { Request, Response } from "express";

// Middleware per bloccare richieste durante il riavvio
export const checkIfRestarting = (req: Request, res: Response, next: () => void) => {
  if (req.app.locals.isRestarting) {
    res
      .status(503)
      .send(
        "<html><body><h1>Server is temporarily unavailable. Please try again later.</h1></body></html>"
      );
  } else {
    next();
  }
};
