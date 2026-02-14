/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import React, { ChangeEvent, useCallback, useEffect, useState } from "react";
import { HostnameBadge } from "../Badge";
import type { DiscoveredMiner, Preset } from "@pluto/interfaces";
import { getHostname } from "@/utils/minerDataHelpers";
import { Select } from "../Select";
import Button from "../Button/Button";
import { ArrowIcon } from "../icons/ArrowIcon";
import { Modal } from "@/components/ui/modal";

interface SelectPresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: DiscoveredMiner[];
  presets: Preset[];
  onCloseSuccessfully: (uuid: string) => void;
}

export const SelectPresetModal: React.FC<SelectPresetModalProps> = ({
  isOpen,
  onClose,
  devices,
  presets,
  onCloseSuccessfully,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);

  useEffect(() => {
    if (presets && presets.length > 0) {
      setSelectedPreset(presets[0]);
    }
  }, [presets]);

  const handleChangeOnSelectPreset = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const preset = presets.find((p) => p.uuid === e.target.value);
      if (preset) {
        setSelectedPreset(preset);
      }
    },
    [presets]
  );

  const handleAction = useCallback(() => {
    if (selectedPreset) {
      onCloseSuccessfully(selectedPreset.uuid);
    } else {
      // console.log("No preset selected");
    }
  }, [onCloseSuccessfully, selectedPreset]);

  return (
    <Modal open={isOpen} onClose={onClose} variant="sheet">
      <div className="w-full max-w-[1440px] border border-border bg-card text-card-foreground">
        <div className="relative mx-auto max-h-[calc(100vh-8rem)] overflow-y-auto p-4 md:p-8">
          <div className="flex items-start justify-between gap-6">
            <h2 className="font-heading text-2xl font-medium">Pool Preset</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-primary hover:opacity-80"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="mt-6 flex flex-col gap-4">
            <h3 className="font-heading text-sm font-medium">Selected Devices</h3>
            <div className="flex flex-wrap gap-3">
              {devices.map((device, i) => (
                <HostnameBadge
                  key={`hostname-badge-${i}`}
                  mac={device.mac}
                  hostname={getHostname(device.minerData)}
                  ip={device.ip}
                  tracing={device.tracing || false}
                />
              ))}
            </div>

            <p className="font-body text-sm text-muted-foreground">
              The selected Pool Preset will be applied to all the selected devices.
            </p>

            <Select
              id={"select-preset"}
              label="Select Pool Preset"
              name="preset"
              onChange={handleChangeOnSelectPreset}
              value={selectedPreset?.uuid || ""}
              optionValues={presets.map((preset) => ({ value: preset.uuid, label: preset.name }))}
            />

            <div className="flex gap-4">
              <Button variant="outlined" onClick={onClose} label="Cancel" />
              <Button
                variant="primary"
                rightIcon={<ArrowIcon color="currentColor" />}
                onClick={handleAction}
                label="Save"
              />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
