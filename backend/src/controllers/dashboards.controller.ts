import { logger } from "@pluto/logger";
import { Request, Response } from "express";
import fs from "fs/promises";
import path from "path";
import * as grafanaService from "../services/grafana.service";

// Function to read dashboard files and enrich the response with Grafana API data
export const getDashboards = async (req: Request, res: Response) => {
  try {
    // Define the directory path that contains JSON files, using __dirname for portability
    const dashboardsDir = path.join(__dirname, "grafana/dashboards");

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
          const grafanaData = await grafanaService.publishDashboard(uid);

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

    // Filter out any null results (files that encountered an error)
    const validDashboards = dashboards.filter((dashboard) => dashboard !== null);

    // Return the list of valid dashboards with enriched data
    res.status(200).json(validDashboards);
  } catch (error) {
    // Log the error and respond with a 500 status code
    logger.error("Error reading dashboard files:", error);
    res.status(500).json({ error: "Failed to read dashboard files" });
  }
};
