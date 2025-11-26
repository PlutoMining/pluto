/**
 * Anti-corruption layer to convert miner library DTOs into Pluto domain models.
 */
import {
  DeviceInfo,
  DeviceFrequencyOptions,
  DeviceVoltageOptions,
  DropdownOption,
} from "@pluto/interfaces";
import type { DeviceInfo as MinerDeviceInfo } from "@plutomining/miner";

const createEmptyHistory = () => ({
  hashrate_10m: [] as number[],
  hashrate_1h: [] as number[],
  hashrate_1d: [] as number[],
  timestamps: [] as number[],
  timestampBase: Date.now(),
});

const createDeviceInfoDefaults = (): DeviceInfo => ({
  power: 0,
  maxPower: 0,
  minPower: 0,
  voltage: 0,
  maxVoltage: 0,
  minVoltage: 0,
  current: 0,
  fanSpeedRpm: 0,
  temp: 0,
  vrTemp: 0,
  hashRate: 0,
  hashRateTimestamp: 0,
  hashRate_10m: 0,
  hashRate_1h: 0,
  hashRate_1d: 0,
  jobInterval: 0,
  bestDiff: "",
  bestSessionDiff: "",
  freeHeap: 0,
  coreVoltage: 0,
  coreVoltageActual: 0,
  frequency: 0,
  ssid: "",
  hostname: "",
  wifiStatus: "",
  sharesAccepted: 0,
  sharesRejected: 0,
  uptimeSeconds: 0,
  ASICModel: "",
  stratumURL: "",
  stratumPort: 0,
  stratumUser: "",
  version: "",
  boardVersion: "",
  runningPartition: "",
  flipscreen: 0,
  invertscreen: 0,
  invertfanpolarity: 0,
  autofanspeed: 0,
  fanspeed: 0,
  efficiency: 0,
  frequencyOptions: [],
  coreVoltageOptions: [],
  asicCount: 0,
  smallCoreCount: 0,
  deviceModel: "",
  overheat_temp: 0,
  autoscreenoff: 0,
  fanrpm: 0,
  lastResetReason: "",
  history: createEmptyHistory(),
});

const numberOr = (value: number | undefined, fallback: number): number =>
  typeof value === "number" ? value : fallback;

const stringOr = (value: string | undefined, fallback: string): string =>
  typeof value === "string" ? value : fallback;

const cloneDropdowns = (options: DropdownOption[]): DropdownOption[] =>
  options.map((option) => ({ ...option }));

export function mapMinerInfoToDeviceInfo(minerInfo: MinerDeviceInfo): DeviceInfo {
  const defaults = createDeviceInfoDefaults();
  const isNewApi = minerInfo.apiVersion === "new";
  const asicModel = minerInfo.ASICModel || "";
  const deviceModel = isNewApi ? minerInfo.deviceModel || asicModel : asicModel;

  const frequencyOptions = cloneDropdowns(DeviceFrequencyOptions[asicModel] || []);
  const coreVoltageOptions = cloneDropdowns(DeviceVoltageOptions[asicModel] || []);

  const hashRatePrimary = isNewApi
    ? numberOr(minerInfo.hashRate_10m, defaults.hashRate_10m)
    : numberOr(minerInfo.hashRate, defaults.hashRate);
  const efficiency =
    numberOr(minerInfo.power, defaults.power) > 0
      ? hashRatePrimary / numberOr(minerInfo.power, defaults.power)
      : defaults.efficiency;

  const history = isNewApi && minerInfo.history ? minerInfo.history : createEmptyHistory();

  return {
    ...defaults,
    power: numberOr(minerInfo.power, defaults.power),
    maxPower: isNewApi ? numberOr(minerInfo.maxPower, numberOr(minerInfo.power, defaults.maxPower)) : numberOr(minerInfo.power, defaults.maxPower),
    minPower: isNewApi ? numberOr(minerInfo.minPower, numberOr(minerInfo.power, defaults.minPower)) : numberOr(minerInfo.power, defaults.minPower),
    voltage: numberOr(minerInfo.voltage, defaults.voltage),
    maxVoltage: isNewApi ? numberOr(minerInfo.maxVoltage, numberOr(minerInfo.voltage, defaults.maxVoltage)) : numberOr(minerInfo.voltage, defaults.maxVoltage),
    minVoltage: isNewApi ? numberOr(minerInfo.minVoltage, numberOr(minerInfo.voltage, defaults.minVoltage)) : numberOr(minerInfo.voltage, defaults.minVoltage),
    current: numberOr(minerInfo.current, defaults.current),
    fanSpeedRpm: !isNewApi ? numberOr(minerInfo.fanSpeedRpm, defaults.fanSpeedRpm) : numberOr(minerInfo.fanrpm, defaults.fanSpeedRpm),
    temp: numberOr(minerInfo.temp, defaults.temp),
    vrTemp: isNewApi ? numberOr(minerInfo.vrTemp, defaults.vrTemp) : defaults.vrTemp,
    hashRate: !isNewApi ? numberOr(minerInfo.hashRate, defaults.hashRate) : hashRatePrimary,
    hashRateTimestamp: isNewApi ? numberOr(minerInfo.hashRateTimestamp, Date.now()) : Date.now(),
    hashRate_10m: hashRatePrimary,
    hashRate_1h: isNewApi ? numberOr(minerInfo.hashRate_1h, defaults.hashRate_1h) : hashRatePrimary,
    hashRate_1d: isNewApi ? numberOr(minerInfo.hashRate_1d, defaults.hashRate_1d) : hashRatePrimary,
    jobInterval: isNewApi ? numberOr(minerInfo.jobInterval, defaults.jobInterval) : defaults.jobInterval,
    bestDiff: stringOr(minerInfo.bestDiff, defaults.bestDiff),
    bestSessionDiff: stringOr(minerInfo.bestSessionDiff, defaults.bestSessionDiff),
    freeHeap: numberOr(minerInfo.freeHeap, defaults.freeHeap),
    coreVoltage: numberOr(minerInfo.coreVoltage, defaults.coreVoltage),
    coreVoltageActual: numberOr(minerInfo.coreVoltageActual, defaults.coreVoltageActual),
    frequency: numberOr(minerInfo.frequency, defaults.frequency),
    ssid: stringOr(minerInfo.ssid, defaults.ssid),
    hostname: stringOr(minerInfo.hostname, defaults.hostname),
    wifiStatus: stringOr(minerInfo.wifiStatus, defaults.wifiStatus),
    sharesAccepted: numberOr(minerInfo.sharesAccepted, defaults.sharesAccepted),
    sharesRejected: numberOr(minerInfo.sharesRejected, defaults.sharesRejected),
    uptimeSeconds: numberOr(minerInfo.uptimeSeconds, defaults.uptimeSeconds),
    asicCount: isNewApi ? numberOr(minerInfo.asicCount, defaults.asicCount) : defaults.asicCount,
    smallCoreCount: isNewApi ? numberOr(minerInfo.smallCoreCount, defaults.smallCoreCount) : defaults.smallCoreCount,
    ASICModel: asicModel,
    deviceModel,
    stratumURL: stringOr(minerInfo.stratumURL, defaults.stratumURL),
    stratumPort: numberOr(minerInfo.stratumPort, defaults.stratumPort),
    stratumUser: stringOr(minerInfo.stratumUser, defaults.stratumUser),
    wifiPassword: minerInfo.wifiPassword,
    stratumPassword: minerInfo.stratumPassword,
    version: stringOr(minerInfo.version, defaults.version),
    boardVersion: !isNewApi ? stringOr(minerInfo.boardVersion, defaults.boardVersion) : defaults.boardVersion,
    runningPartition: stringOr(minerInfo.runningPartition, defaults.runningPartition),
    flipscreen: numberOr(minerInfo.flipscreen, defaults.flipscreen),
    overheat_temp: isNewApi ? numberOr(minerInfo.overheat_temp, defaults.overheat_temp) : defaults.overheat_temp,
    invertscreen: numberOr(minerInfo.invertscreen, defaults.invertscreen),
    autoscreenoff: isNewApi ? numberOr(minerInfo.autoscreenoff, defaults.autoscreenoff) : defaults.autoscreenoff,
    invertfanpolarity: numberOr(minerInfo.invertfanpolarity, defaults.invertfanpolarity),
    autofanspeed: numberOr(minerInfo.autofanspeed, defaults.autofanspeed),
    fanspeed: numberOr(minerInfo.fanspeed, defaults.fanspeed),
    fanrpm: isNewApi ? numberOr(minerInfo.fanrpm, defaults.fanrpm) : numberOr(minerInfo.fanSpeedRpm, defaults.fanrpm),
    lastResetReason: isNewApi ? stringOr(minerInfo.lastResetReason, defaults.lastResetReason) : defaults.lastResetReason,
    history,
    efficiency,
    frequencyOptions,
    coreVoltageOptions,
  };
}

