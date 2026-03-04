export { MinerDriverFactory } from "./miner-driver.factory";
export type { IMinerDriver } from "./miner-driver.interface";
export type {
  DetectionResult,
  ValidationResult,
  SupportLevel,
} from "@pluto/interfaces";
export { BitaxeDriver } from "./bitaxe.driver";
export { PyasicBridgeDriver } from "./pyasic-bridge.driver";
export { GenericHttpDriver } from "./generic-http.driver";

import { MinerDriverFactory } from "./miner-driver.factory";
import { BitaxeDriver } from "./bitaxe.driver";
import { PyasicBridgeDriver } from "./pyasic-bridge.driver";
import { GenericHttpDriver } from "./generic-http.driver";

const driverFactory = new MinerDriverFactory();
driverFactory.register("bitaxe", BitaxeDriver);
driverFactory.register("espminer", BitaxeDriver);
driverFactory.registerMacOverride("ff:ff:ff:ff:", GenericHttpDriver);
driverFactory.setFallback(PyasicBridgeDriver);

export { driverFactory };
