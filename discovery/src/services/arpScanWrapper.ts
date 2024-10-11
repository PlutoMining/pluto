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

/**
 * Perform an ARP scan on the specified network interface and return the parsed results.
 * @param {string} networkInterface - The network interface to use for the ARP scan.
 * @returns {Promise<ArpScanResult[]>} Parsed ARP scan results.
 */
export async function arpScan(networkInterface: string): Promise<ArpScanResult[]> {
  const command = `arp-scan --interface=${networkInterface} --localnet`;
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
  const command = `ip -o addr show | awk '{print $2}' | grep -Ev '^(docker|br-|veth|lo|dind|.orbmirror)' | sort -u`;
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
