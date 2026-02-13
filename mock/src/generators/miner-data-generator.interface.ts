export interface MinerDataGenerator<TInfo> {
  generate(
    hostname: string,
    uptimeSeconds: number,
    overrides?: Partial<TInfo>
  ): Partial<TInfo>;
}

