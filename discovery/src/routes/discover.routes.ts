import { Router } from "express";
import { discoverDevices, getDiscoveredDevices } from "../controllers/discover.controller";

const router = Router();

// Rotta per la scoperta dei dispositivi
router.get("/discover", discoverDevices);
router.get("/discovered", getDiscoveredDevices);

export default router;
