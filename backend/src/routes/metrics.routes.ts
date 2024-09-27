import { Router } from "express";
import { getMetrics } from "../controllers/metrics.controller";

const router = Router();

router.get("/metrics", getMetrics);

export default router;
