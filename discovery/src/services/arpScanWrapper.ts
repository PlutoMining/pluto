/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { exec } from "child_process";
import { promisify } from "util";

// Promisify exec for easier async/await usage
const execPromise = promisify(exec);

/**
 * Interface representing the structure of an ARP scan result.
 */
export interface ArpScanResult {
  ip: string;
  mac: string;
  type: string;
}

function parseEnvInt(value: string | undefined, fallback: number): number {
  if (typeof value !== "string" || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
}

function parseEnvBool(value: string | undefined, fallback: boolean): boolean {
  if (typeof value !== "string" || value.trim() === "") return fallback;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "off"].includes(normalized)) return false;
  return fallback;
}

function getArpScanArgs() {
  // Defaults chosen to be robust on LANs where some devices respond slowly.
  // These mirror the recommended Umbrel container invocation:
  // arp-scan --localnet --retry=3 --timeout=2000 --ignoredups
  const retry = parseEnvInt(process.env.ARP_SCAN_RETRY, 3);

  const timeout =
    parseEnvInt(process.env.ARP_SCAN_TIMEOUT_MS, -1) >= 0
      ? parseEnvInt(process.env.ARP_SCAN_TIMEOUT_MS, 2000)
      : parseEnvInt(process.env.ARP_SCAN_TIMEOUT, 2000);

  const ignoreDups = parseEnvBool(process.env.ARP_SCAN_IGNORE_DUPS, true);

  const args: string[] = [`--retry=${retry}`, `--timeout=${timeout}`];
  if (ignoreDups) args.push("--ignoredups");
  return args;
}

function parseInterfaceList(value: string): string[] {
  const items = value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s !== "");

  const unique = Array.from(new Set(items));
  for (const iface of unique) {
    if (!/^[a-zA-Z0-9._:-]+$/.test(iface)) {
      throw new Error(`Invalid network interface name: ${iface}`);
    }
  }
  return unique;
}

/**
 * Perform an ARP scan on the specified network interface and return the parsed results.
 * @param {string} networkInterface - The network interface to use for the ARP scan.
 * @returns {Promise<ArpScanResult[]>} Parsed ARP scan results.
 */
export async function arpScan(networkInterface: string): Promise<ArpScanResult[]> {
  if (!/^[a-zA-Z0-9._:-]+$/.test(networkInterface)) {
    throw new Error(`Invalid network interface name: ${networkInterface}`);
  }

  const extraArgs = getArpScanArgs().join(" ");
  const command = `arp-scan --interface=${networkInterface} --localnet ${extraArgs}`;
  try {
    const { stdout, stderr } = await execPromise(command);

    if (stderr) {
      console.error(`Error: ${stderr}`);
      throw new Error(stderr);
    }

    return parseArpScanOutput(stdout);
  } catch (error) {
    console.error(`Failed to execute arp-scan: ${error}`);
    throw error;
  }
}

/**
 * Retrieve the active network interfaces that have IP addresses assigned and exclude Docker-related interfaces.
 * @returns {Promise<string[]>} List of active network interface names.
 */
export async function getActiveNetworkInterfaces(): Promise<string[]> {
  const configured =
    typeof process.env.ARP_SCAN_INTERFACES === "string" &&
    process.env.ARP_SCAN_INTERFACES.trim() !== ""
      ? parseInterfaceList(process.env.ARP_SCAN_INTERFACES)
      : undefined;

  if (configured && configured.length > 0) return configured;

  // Prefer IPv4 interfaces (ARP scan is IPv4-only).
  const command = `ip -o -4 addr show | awk '{print $2}' | grep -Ev '^(docker|br-|veth|lo|dind|.orbmirror)' | sort -u`;
  try {
    const { stdout, stderr } = await execPromise(command);

    if (stderr) {
      console.error(`Error: ${stderr}`);
      throw new Error(stderr);
    }

    return parseNetworkInterfacesOutput(stdout);
  } catch (error) {
    console.error(`Failed to retrieve network interfaces: ${error}`);
    throw error;
  }
}

/**
 * Parse the raw output of the arp-scan command and return structured results.
 * @param {string} output - The raw output from the arp-scan command.
 * @returns {ArpScanResult[]} An array of objects representing the parsed ARP scan results.
 */
function parseArpScanOutput(output: string): ArpScanResult[] {
  const lines = output.split("\n");
  const results: ArpScanResult[] = [];

  // Parse each line of the arp-scan output to extract IP, MAC, and vendor/type
  for (const line of lines) {
    const match = line.match(/^(\d+\.\d+\.\d+\.\d+)\s+([\w:]+)\s+(.+)$/);
    if (match) {
      const [_, ip, mac, vendor] = match;
      results.push({ ip, mac, type: vendor });
    }
  }

  return results;
}

/**
 * Parse the raw output of the ip command to extract a list of network interface names.
 * @param {string} output - The raw output from the ip command.
 * @returns {string[]} An array of strings representing the network interface names.
 */
function parseNetworkInterfacesOutput(output: string): string[] {
  // Split the output by newline and filter out any empty lines
  const lines = output.split("\n").filter((line) => line.trim() !== "");
  return lines;
}
