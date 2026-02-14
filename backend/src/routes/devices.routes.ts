/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { Router } from "express";
import {
  deleteImprintedDevice,
  discoverDevices,
  getDevicesByPresetId,
  getDiscoveredDevices,
  getImprintedDevice,
  getImprintedDevices,
  imprintDevice,
  imprintDevices,
  patchImprintedDevice,
  patchDeviceSystemInfo,
  putListenDevices,
  restartDevice,
  validateDeviceSystemInfo,
} from "../controllers/devices.controller";

const router = Router();

router.get("/devices/discovered", getDiscoveredDevices);
router.get("/devices/discover", discoverDevices);
router.put("/devices/imprint", imprintDevices);
router.patch("/devices/imprint", imprintDevice);
router.patch("/devices/imprint/:id", patchImprintedDevice);
router.delete("/devices/imprint/:id", deleteImprintedDevice);
router.get("/devices/imprint", getImprintedDevices);
router.get("/devices/imprint/:id", getImprintedDevice);
router.get("/devices/presets/:presetId", getDevicesByPresetId);
router.put("/devices/listen", putListenDevices);
router.post("/devices/:id/system/restart", restartDevice);
router.post("/devices/:id/system/validate", validateDeviceSystemInfo);
router.patch("/devices/:id/system", patchDeviceSystemInfo);

export default router;
