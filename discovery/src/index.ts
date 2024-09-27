import { logger } from "@pluto/logger";
import express from "express";
import { config } from "./config/environment";
import discoverRoutes from "./routes/discover.routes";

const { port } = config;

const app = express();

app.use(express.json());

// Aggiungi le rotte per la scoperta dei dispositivi
app.use(discoverRoutes);

app.listen(port, () => {
  logger.info(`Server running on http://localhost:${port}`);
});
