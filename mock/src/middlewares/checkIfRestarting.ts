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
