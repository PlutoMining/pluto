import { startIoHandler } from "../controllers/socket.controller";
import { Router } from "express";

const router = Router();

router.get("/socket/io", startIoHandler);

export default router;
