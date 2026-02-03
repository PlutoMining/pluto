/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { Device } from "@pluto/interfaces";
import { DeviceStatusBadge } from "../Badge";
import { getMinerName } from "@/utils/minerMap";
import { formatDetailedTime } from "@/utils/formatTime";

interface DeviceAccordionProps {
  devices: Device[];
  removeFunction: (deviceId: string) => void;
}

interface AccordionItemProps {
  device: Device;
  removeFunction: (deviceId: string) => void;
}

export const DeviceAccordion: React.FC<DeviceAccordionProps> = ({ devices, removeFunction }) => {
  return (
    <>
      {devices && devices.length > 0 ? (
        <div className="flex flex-col bg-card">
          {devices.map((device, index) => (
            <details
              key={`device-settings-${device.mac}`}
              className={index === 0 ? "" : "border-t border-border"}
            >
              <AccordionItem device={device} removeFunction={removeFunction} />
            </details>
          ))}
        </div>
      ) : (
        <div className="text-center text-sm text-muted-foreground">No device found</div>
      )}
    </>
  );
};

const AccordionItem: React.FC<AccordionItemProps> = ({ device, removeFunction }) => {
  return (
    <>
      <summary className="flex cursor-pointer items-center justify-between gap-4 bg-card px-4 py-3 hover:bg-muted">
        <div className="flex items-center gap-4">
          <span className="text-primary">▾</span>
          <span className="font-body text-sm font-semibold capitalize">{device.info.hostname}</span>
          <DeviceStatusBadge status={device.tracing ? "online" : "offline"} />
        </div>

        <button
          type="button"
          className="font-accent text-sm font-medium uppercase text-foreground underline"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            removeFunction(device.mac);
          }}
        >
          Remove
        </button>
      </summary>

      <div className="border-t border-border bg-card p-4">
        <div className="flex flex-col gap-2">
          <Row label="Date added" value={new Date(device.createdAt!).toLocaleDateString()} />
          <Row label="IP" value={device.ip} />
          <Row label="Miner" value={getMinerName(device.info.boardVersion) || device.info?.deviceModel} />
          <Row label="ASIC" value={device.info.ASICModel} />
          <Row label="FW v." value={device.info.version} />
          <Row label="Uptime" value={formatDetailedTime(device.info.uptimeSeconds)} />
        </div>
      </div>
    </>
  );
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="shrink-0 font-body text-sm font-medium capitalize">{label}</span>
      <span className="max-w-[65%] break-all text-right font-accent text-sm text-muted-foreground">{value}</span>
    </div>
  );
}
