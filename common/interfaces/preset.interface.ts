import { Device } from "./device-info.interface";
import { Entity } from "./entity.interface";

export interface Preset extends Entity {
  uuid: string;
  name: string;
  configuration: Record<string, any>;
  associatedDevices?: Device[];
}
