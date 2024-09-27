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
router.patch("/devices/:id/system", patchDeviceSystemInfo);

export default router;
