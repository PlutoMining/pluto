import type {
  MinerData,
  MinerConfig,
  SupportLevel,
  DetectionResult,
  ValidationResult,
  ConfigFormSchema,
} from "@pluto/interfaces";

export interface IMinerDriver {
  readonly driverName: string;
  readonly supportLevel: SupportLevel;

  /** Probe an IP to see if this driver can handle it. Return null if not. */
  detect(ip: string): Promise<DetectionResult | null>;

  /** Fetch current miner data (metrics, status, vendor-specific). */
  fetchData(ip: string): Promise<MinerData>;

  /** Read current miner configuration. */
  getConfig(ip: string): Promise<MinerConfig>;

  /** Apply a configuration update. */
  updateConfig(ip: string, config: MinerConfig): Promise<void>;

  /** Validate a config without applying it. */
  validateConfig(ip: string, config: MinerConfig): Promise<ValidationResult>;

  /** Reboot the miner. */
  restart(ip: string): Promise<void>;

  /** Return the schema describing editable vendor-specific fields. */
  getConfigSchema(): ConfigFormSchema;

  /** Extract current editable values from polled MinerData (pure, no I/O). */
  getEditableValues(minerData: MinerData): Record<string, unknown>;

  /** Optional: stream miner logs. Not every miner supports this. */
  connectLogs?(
    ip: string,
    onMessage: (msg: string) => void,
    onError: (err: Error) => void,
    onClose: () => void
  ): Promise<() => void>;
}
