/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import type { Device } from "./device-info.interface";
import type { Entity } from "./entity.interface";

export interface Preset extends Entity {
  uuid: string;
  name: string;
  configuration: Record<string, any>;
  associatedDevices?: Device[];
}
