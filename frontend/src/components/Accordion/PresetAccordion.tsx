/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { Preset } from "@pluto/interfaces";
import type { MinerConfigModelInput } from "@pluto/pyasic-bridge-client";
import { parseStratumUrl } from "@/utils/deviceConfigHelpers";
import { MouseEvent, useMemo } from "react";
import { HostnameBadge } from "../Badge";
import Button from "../Button/Button";
import { DeleteIcon } from "../icons/DeleteIcon";
import { DuplicateIcon } from "../icons/DuplicateIcon";
import { Input } from "../Input";

interface PresetProps {
  preset: Preset;
  onDuplicate: (uuid: string) => (e: MouseEvent<HTMLButtonElement>) => void;
  onDelete: (uuid: string) => void;
  isDuplicateDisabled: boolean;
  index: number;
}

export const PresetAccordion: React.FC<PresetProps> = ({
  preset,
  onDuplicate,
  onDelete,
  index,
  isDuplicateDisabled,
}) => {
  const { displayUrl, displayPort, displayUser } = useMemo(() => {
    const config = preset.configuration as MinerConfigModelInput;
    const poolConfig = config.pools?.groups?.[0]?.pools?.[0];

    const url = poolConfig?.url || "";
    const { port } = parseStratumUrl(url);
    const user = poolConfig?.user || "";

    return {
      displayUrl: url,
      displayPort: port ?? "",
      displayUser: user,
    };
  }, [preset.configuration]);

  return (
    <details
      key={`preset-${preset.uuid}`}
      className="border border-border bg-card text-card-foreground"
    >
      <summary className="flex cursor-pointer items-center justify-between gap-4 bg-muted p-4">
        <div className="flex items-center gap-2 font-heading font-semibold">
          <span className="text-primary">▾</span>
          <span className="font-accent font-normal">#{++index}</span>
          <span className="font-accent font-normal">{preset.name}</span>
        </div>
      </summary>

      <div className="border-t border-border p-4">
        <div className="flex flex-col gap-4">
          <p className="font-heading text-sm font-semibold uppercase">Settings</p>

          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex-1">
              <Input
                isDisabled={true}
                type="text"
                label="Stratum URL"
                name="stratumURL"
                id={`${preset.uuid}-stratumUrl`}
                defaultValue={displayUrl}
              />
            </div>
            <div className="flex-1">
              <Input
                isDisabled={true}
                type="number"
                label="Stratum Port"
                name="stratumPort"
                id={`${preset.uuid}-stratumPort`}
                defaultValue={displayPort}
              />
            </div>
            <div className="flex-[2]">
              <Input
                isDisabled={true}
                type="text"
                label="Stratum User"
                name="stratumUser"
                id={`${preset.uuid}-stratumUser`}
                defaultValue={displayUser}
              />
            </div>
          </div>

          <p className="font-accent text-sm font-semibold uppercase">Associated Devices</p>

          {preset.associatedDevices && preset.associatedDevices.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {preset.associatedDevices.map((device, i) => (
                <HostnameBadge
                  key={`hostname-badge-${i}`}
                  mac={device.mac}
                  hostname={device.minerData?.hostname ?? device.ip}
                  ip={device.ip}
                  tracing={device.tracing || false}
                />
              ))}
            </div>
          ) : (
            <p className="text-center text-xs text-muted-foreground">No associated device</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 border-t border-border p-3">
        <Button
          variant="text"
          onClick={onDuplicate(preset.uuid)}
          icon={<DuplicateIcon h={"18"} />}
          disabled={isDuplicateDisabled}
          label="Duplicate"
        />
        <Button
          variant="text"
          onClick={() => onDelete(preset.uuid)}
          disabled={preset.associatedDevices && preset.associatedDevices.length > 0}
          icon={<DeleteIcon h={"18"} />}
          label="Delete"
        />
      </div>
    </details>
  );
};
