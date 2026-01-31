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
import { DeleteIcon } from "../icons/DeleteIcon";
import { convertIsoTomMdDYy, formatDetailedTime, formatTime } from "@/utils/formatTime";

interface DeviceTableProps {
  devices: Device[];
  removeDeviceFunction: (deviceId: string) => void;
}

export const DeviceTable: React.FC<DeviceTableProps> = ({ devices, removeDeviceFunction }) => {
  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-muted">
            <th className="max-w-[140px] border-b border-border px-4 py-3 text-left align-middle font-accent text-xs font-semibold uppercase text-muted-foreground">
              Hostname
            </th>
            <th className="border-b border-border px-4 py-3 text-center align-middle font-accent text-xs font-semibold uppercase text-muted-foreground">
              Date added
            </th>
            <th className="border-b border-border px-4 py-3 text-center align-middle font-accent text-xs font-semibold uppercase text-muted-foreground">
              IP
            </th>
            <th className="border-b border-border px-4 py-3 text-center align-middle font-accent text-xs font-semibold uppercase text-muted-foreground">
              Mac Address
            </th>
            <th className="border-b border-border px-4 py-3 text-center align-middle font-accent text-xs font-semibold uppercase text-muted-foreground">
              Miner
            </th>
            <th className="border-b border-border px-4 py-3 text-center align-middle font-accent text-xs font-semibold uppercase text-muted-foreground">
              ASIC
            </th>
            <th className="border-b border-border px-4 py-3 text-center align-middle font-accent text-xs font-semibold uppercase text-muted-foreground">
              Uptime
            </th>
            <th className="border-b border-border px-4 py-3 text-center align-middle font-accent text-xs font-semibold uppercase text-muted-foreground">
              FW v.
            </th>
            <th className="border-b border-border px-4 py-3 text-center align-middle font-accent text-xs font-semibold uppercase text-muted-foreground">
              Status
            </th>
            <th className="w-12 border-b border-border px-4 py-3 text-right align-middle">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {devices.map((device) => (
            <tr key={`registered-device-${device.mac}`} className="bg-card">
              <td className="max-w-[140px] border-t border-border px-4 py-3 font-accent text-[13px] font-normal">
                {device.info.hostname}
              </td>
              <td className="border-t border-border px-4 py-3 text-center font-accent text-[13px] font-normal">
                {convertIsoTomMdDYy(device.createdAt!)}
              </td>
              <td className="border-t border-border px-4 py-3 text-center font-accent text-[13px] font-normal">
                {device.ip}
              </td>
              <td className="border-t border-border px-4 py-3 text-center font-accent text-[13px] font-normal">
                {device.mac}
              </td>
              <td className="w-[125px] max-w-[125px] border-t border-border px-4 py-3 text-center font-accent text-[13px] font-normal">
                {getMinerName(device.info.boardVersion) || device.info?.deviceModel}
              </td>
              <td className="border-t border-border px-4 py-3 text-center font-accent text-[13px] font-normal">
                {device.info.ASICModel}
              </td>
              <td
                className="border-t border-border px-4 py-3 text-center font-accent text-[13px] font-normal"
                title={formatDetailedTime(device.info.uptimeSeconds)}
              >
                {formatTime(device.info.uptimeSeconds)}
              </td>
              <td className="border-t border-border px-4 py-3 text-center font-accent text-[13px] font-normal">
                {device.info.version}
              </td>
              <td className="border-t border-border px-4 py-3 text-center">
                <DeviceStatusBadge status={device.tracing ? "online" : "offline"} />
              </td>
              <td className="border-t border-border px-4 py-3 text-right">
                <button
                  type="button"
                  onClick={() => removeDeviceFunction(device.mac)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={`Remove ${device.info.hostname}`}
                >
                  <DeleteIcon h={"20"} w={"14px"} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
