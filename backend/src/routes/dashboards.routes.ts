import { Router } from "express";
import { getDashboards } from "../controllers/dashboards.controller";

const router = Router();

router.get("/dashboards", getDashboards);

export default router;
