import { Router } from "express";
import { getSystemInfo, patchSystemInfo, restartSystem } from "../controllers/system.controller";

const router = Router();

// Rotta per ottenere le informazioni di sistema
router.get("/api/system/info", getSystemInfo);

// Rotta per aggiornare le informazioni di sistema
router.patch("/api/system", patchSystemInfo);

// Rotta per riavviare il sistema
router.post("/api/system/restart", restartSystem);

export default router;

// /api/devices-proxy/:id/system/info => /api/system/info
