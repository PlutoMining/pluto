import fs from "fs/promises";
import path from "path";
import { logger } from "@pluto/logger";
import { get, set } from "radash";
import { Device } from "@pluto/interfaces";
import { sanitizeHostname } from "@pluto/utils/strings";
import axios from "axios";
import { config } from "../config/environment";
import { delay } from "@pluto/utils/promises";

// Interface for the GET and POST response
interface DashboardResponse {
  uid: string;
  dashboardUid: string;
  accessToken: string;
  createdBy: number;
  updatedBy: number;
  createdAt: string; // Date as ISO string
  updatedAt: string; // Date as ISO string
  timeSelectionEnabled: boolean;
  isEnabled: boolean;
  annotationsEnabled: boolean;
  share: string;
}

// Interface for the POST payload
interface PostPayload {
  isEnabled: boolean;
}

// Interface for the PATCH payload
interface PatchPayload {
  uid: string;
  dashboardUid: string;
  accessToken: string;
  createdBy: number;
  updatedBy: number;
  createdAt: string;
  updatedAt: string; // Date as ISO string
  timeSelectionEnabled: boolean;
  isEnabled: boolean;
  annotationsEnabled: boolean;
  share: string;
}

const deviceDashboardTemplatePath = path.resolve(
  "./grafana_templates/bitaxe_dashboard_template.json"
); // Path al template JSON
const overviewDashboardTemplatePath = path.resolve(
  "./grafana_templates/bitaxe_overview_dashboard_template.json"
); // Path al template JSON
const dashboardsDir = path.resolve("./grafana/dashboards"); // Directory per salvare le dashboard generate

function generateCustomUUID() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let uuid = "";
  for (let i = 0; i < 14; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    uuid += chars[randomIndex];
  }
  return uuid;
}

function findHostNamePaths(json: any, currentPath: string = ""): string[] {
  let paths: string[] = [];

  if (typeof json === "object" && json !== null) {
    if (Array.isArray(json)) {
      json.forEach((value, index) => {
        const newPath = `${currentPath}[${index}]`;
        paths = paths.concat(findHostNamePaths(value, newPath));
      });
    } else {
      for (const key in json) {
        if (json.hasOwnProperty(key)) {
          const value = json[key];
          const newPath = currentPath ? `${currentPath}.${key}` : key;

          const pattern = /@@hostname@@/;

          if (value && typeof value === "string" && pattern.test(value)) {
            paths.push(newPath);
          } else {
            paths = paths.concat(findHostNamePaths(value, newPath));
          }
        }
      }
    }
  }

  return paths;
}

function replaceValuesAtPaths(json: any, paths: string[], replacement: any): void {
  paths.forEach((path) => {
    const currentValue = get<string>(json, path);

    const replacedValue = currentValue.replace(/@@hostname@@/g, replacement);

    set(json, path, replacedValue);
  });
}

export async function createGrafanaDeviceDashboard(device: Device) {
  try {
    // Sanifica il device.hostname per il template
    const sanitizedHostname = sanitizeHostname(device.info.hostname);

    // Crea la directory se non esiste
    await fs.mkdir(dashboardsDir, { recursive: true });

    // Controlla se la dashboard esiste già
    const dashboardPath = path.join(dashboardsDir, `${sanitizedHostname}.json`);
    const exists = await fs
      .access(dashboardPath)
      .then(() => true)
      .catch(() => false);

    if (exists) {
      logger.debug(`Dashboard for ${sanitizedHostname} already exists.`);
      return;
    }

    // Leggi il template
    const template = await fs.readFile(deviceDashboardTemplatePath, "utf8");
    let dashboard = JSON.parse(template);

    // Replace device hostname for any occurrences of @@hostname@@ in dashboard template
    const paths = findHostNamePaths(dashboard);
    replaceValuesAtPaths(dashboard, paths, sanitizedHostname);

    // Personalizza il template
    dashboard.title = sanitizedHostname;
    dashboard.uid = generateCustomUUID();

    // Scrivi la dashboard personalizzata
    await fs.writeFile(dashboardPath, JSON.stringify(dashboard, null, 2), "utf8");
    logger.info(`Dashboard for ${sanitizedHostname} created at ${dashboardPath}`);

    await delay(2000);

    await publishDashboard(dashboard.uid);
  } catch (error) {
    logger.error("Error creating Grafana dashboard:", error);
  }
}

export async function createGrafanaOverviewDashboard() {
  try {
    // Crea la directory se non esiste
    await fs.mkdir(dashboardsDir, { recursive: true });

    // Controlla se la dashboard esiste già
    const dashboardPath = path.join(dashboardsDir, "overview.json");
    const exists = await fs
      .access(dashboardPath)
      .then(() => true)
      .catch(() => false);

    if (exists) {
      logger.debug(`Overview Dashboard already exists.`);
      return;
    }

    // Leggi il template
    const template = await fs.readFile(overviewDashboardTemplatePath, "utf8");
    let dashboard = JSON.parse(template);

    dashboard.uid = generateCustomUUID();

    // Scrivi la dashboard personalizzata
    await fs.writeFile(dashboardPath, JSON.stringify(dashboard, null, 2), "utf8");
    logger.info(`Overview Dashboard created at ${dashboardPath}`);

    await delay(2000);

    await publishDashboard(dashboard.uid);
  } catch (error) {
    logger.error("Error creating Grafana dashboard:", error);
  }
}

export async function deleteGrafanaDashboard(hostname: string) {
  try {
    // Sanifica il device.hostname per ottenere il nome corretto della dashboard
    const sanitizedHostname = sanitizeHostname(hostname);

    // Determina il percorso della dashboard
    const dashboardPath = path.join(dashboardsDir, `${sanitizedHostname}.json`);

    // Controlla se la dashboard esiste
    const exists = await fs
      .access(dashboardPath)
      .then(() => true)
      .catch(() => false);

    if (!exists) {
      logger.debug(`No Grafana dashboard file found for ${sanitizedHostname}. Nothing to delete.`);
      return;
    }

    // Leggi il contenuto del file JSON per ottenere il `dashboardUid`
    const fileContent = await fs.readFile(dashboardPath, "utf8");
    const dashboardData = JSON.parse(fileContent);

    // Ottieni il `dashboardUid` dal contenuto della dashboard
    const { uid } = dashboardData;

    // Prima di cancellare il file, eseguiamo l'unpublish tramite l'API di Grafana
    if (uid) {
      logger.info(`Unpublishing Grafana dashboard for ${sanitizedHostname} with UID: ${uid}...`);
      try {
        await unpublishDashboard(uid);
        logger.info(`Grafana dashboard for ${sanitizedHostname} successfully unpublished.`);
      } catch (error) {
        logger.error(`Error unpublishing Grafana dashboard for ${sanitizedHostname}:`, error);
        // Non bloccare l'eliminazione del file se l'unpublish fallisce
      }
    } else {
      logger.warn(
        `Dashboard UID not found in the JSON for ${sanitizedHostname}. Skipping unpublish.`
      );
    }

    // Elimina il file della dashboard
    await fs.unlink(dashboardPath);
    logger.info(`Dashboard for ${sanitizedHostname} deleted from ${dashboardPath}`);
  } catch (error) {
    logger.error(`Error deleting Grafana dashboard for ${hostname}:`, error);
  }
}

// Service function to read dashboard files and enrich the response with Grafana API data
export const getDashboardFiles = async () => {
  const dashboardsDir = "/app/grafana/dashboards";

  try {
    // Read the directory to get the list of files
    const files = await fs.readdir(dashboardsDir);

    // Filter only .json files
    const jsonFiles = files.filter((file) => path.extname(file) === ".json");

    // Process each file and enrich with data from the Grafana API
    const dashboards = await Promise.all(
      jsonFiles.map(async (file) => {
        const filePath = path.join(dashboardsDir, file);

        try {
          // Read the content of the file
          const fileContent = await fs.readFile(filePath, "utf-8");
          const jsonData = JSON.parse(fileContent);

          // Get the `uid` from the JSON file
          const { uid } = jsonData;

          // Use publishDashboard to get the enriched data
          const grafanaData = await publishDashboard(uid);

          // Return the enriched object with the file name and Grafana API data
          return {
            name: path.basename(file, ".json"), // File name without extension
            uid: jsonData.uid, // UID from file
            grafanaData, // Enriched data from Grafana API
            publicUrl: `/grafana/public-dashboards/${grafanaData.accessToken}?orgId=1`,
          };
        } catch (err) {
          logger.error(`Error reading file ${file}:`, err);
          // Continue without interrupting the process in case of an error
          return null;
        }
      })
    );

    return dashboards;
  } catch (error) {
    logger.error("Error reading dashboard files:", error);
    throw error;
  }
};

// Service function to publish the dashboard
export const publishDashboard = async (dashboardUid: string) => {
  const baseUrl = `${config.gfHost}/grafana/api/dashboards/uid/${dashboardUid}/public-dashboards`;
  const headers = {
    "X-WEBAUTH-USER": "admin",
    Origin: `${config.gfHost}`,
  };

  try {
    let getData: DashboardResponse | null = null;

    try {
      // First GET request to check if isEnabled is already true
      const getResponse = await axios.get<DashboardResponse>(baseUrl, { headers });

      if (getResponse.status === 200) {
        getData = getResponse.data;
      }
    } catch (err) {
      logger.warn(err);
    }

    // Check if `isEnabled` is present and true, skip POST and PATCH if so
    if (getData?.isEnabled) {
      logger.debug("Dashboard is already enabled. Skipping POST and PATCH requests.");
      return getData; // Return the existing data
    }

    // If `isEnabled` is not true, proceed with the POST request
    logger.debug("Dashboard is not enabled, proceeding with POST request.");

    const postPayload: PostPayload = {
      isEnabled: true,
    };

    const postResponse = await axios.post<DashboardResponse>(baseUrl, postPayload, { headers });

    if (postResponse.status !== 200) {
      throw new Error("Error during the POST request");
    }

    const postData: DashboardResponse = postResponse.data;

    // Using the UID returned from the first request to construct the PATCH URL
    const patchUrl = `${baseUrl}/${postData.uid}`;

    const patchPayload: PatchPayload = {
      uid: postData.uid,
      dashboardUid: postData.dashboardUid,
      accessToken: postData.accessToken,
      createdBy: postData.createdBy,
      updatedBy: postData.updatedBy,
      createdAt: postData.createdAt,
      updatedAt: new Date().toISOString(), // Update timestamp
      timeSelectionEnabled: true,
      isEnabled: true,
      annotationsEnabled: false,
      share: "public",
    };

    // Second PATCH request
    const patchResponse = await axios.patch<DashboardResponse>(patchUrl, patchPayload, { headers });

    if (patchResponse.status !== 200) {
      throw new Error("Error during the PATCH request");
    }

    const patchData: DashboardResponse = patchResponse.data;

    // Return the result of the PATCH request
    return patchData;
  } catch (error) {
    logger.error("Error during the sequence of requests:", error);
    throw error;
  }
};

// Service function to unpublish the dashboard
export const unpublishDashboard = async (dashboardUid: string) => {
  const baseUrl = `${config.gfHost}/grafana/api/dashboards/uid/${dashboardUid}/public-dashboards`;
  const headers = {
    "X-WEBAUTH-USER": "admin",
    Origin: `${config.gfHost}`,
  };

  try {
    // Prima richiesta GET per verificare se la dashboard è abilitata
    let getData: DashboardResponse | null = null;

    try {
      const getResponse = await axios.get<DashboardResponse>(baseUrl, { headers });

      if (getResponse.status === 200) {
        getData = getResponse.data;
      }
    } catch (err) {
      logger.warn(`Error during GET request for dashboard UID ${dashboardUid}:`, err);
    }

    // Verifica se la dashboard è abilitata
    if (getData?.isEnabled) {
      logger.debug("Dashboard is enabled. Proceeding with DELETE request.");

      // Richiesta DELETE per disabilitare la dashboard
      const deleteUrl = `${baseUrl}/${getData.uid}`;
      const response = await axios.delete(deleteUrl, { headers });

      if (response.status === 200) {
        logger.info(`Dashboard with UID ${dashboardUid} successfully deleted.`);
        return response.data;
      } else {
        throw new Error(`Failed to delete dashboard. Status code: ${response.status}`);
      }
    } else {
      logger.info(`Dashboard with UID ${dashboardUid} is already disabled or does not exist.`);
    }
  } catch (error) {
    logger.error(`Error deleting public dashboard for UID ${dashboardUid}:`, error);
    throw error;
  }
};
