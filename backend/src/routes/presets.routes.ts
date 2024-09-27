import { Router } from "express";
import {
  createPreset,
  getPresets,
  deletePreset,
  getPreset,
} from "../controllers/presets.controller";

const router = Router();

router.get("/presets", getPresets);
router.get("/presets/:id", getPreset);
router.post("/presets", createPreset);
router.delete("/presets/:id", deletePreset);

export default router;
