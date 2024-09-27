import { exec } from "child_process";
import { promisify } from "util";

// Promisify exec for easier async/await usage
const execPromise = promisify(exec);

export interface ArpScanResult {
  ip: string;
  mac: string;
  type: string;
}

export class ArpScanWrapper {
  private interface: string;

  constructor(networkInterface: string) {
    this.interface = networkInterface;
  }

  /**
   * Run arp-scan on the local network and return parsed results.
   * @returns {Promise<ArpScanResult[]>} Parsed arp-scan results.
   */
  public async scan(): Promise<ArpScanResult[]> {
    const command = `arp-scan --interface=${this.interface} --localnet`;
    try {
      const { stdout, stderr } = await execPromise(command);

      if (stderr) {
        console.error(`Error: ${stderr}`);
        throw new Error(stderr);
      }

      return this.parseOutput(stdout);
    } catch (error) {
      console.error(`Failed to execute arp-scan: ${error}`);
      throw error;
    }
  }

  /**
   * Parse the arp-scan output and return an array of results.
   * @param {string} output - The raw output from arp-scan.
   * @returns {ArpScanResult[]} Parsed results.
   */
  private parseOutput(output: string): ArpScanResult[] {
    const lines = output.split("\n");
    const results: ArpScanResult[] = [];

    for (const line of lines) {
      const match = line.match(/^(\d+\.\d+\.\d+\.\d+)\s+([\w:]+)\s+(.+)$/);

      if (match) {
        const [_, ip, mac, vendor] = match;
        results.push({ ip, mac, type: vendor });
      }
    }

    return results;
  }
}
