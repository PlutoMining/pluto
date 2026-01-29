/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { useSocket } from "@/providers/SocketProvider";
import { formatDetailedTime } from "@/utils/formatTime";
import { formatDifficulty } from "@/utils/formatDifficulty";
import { Device } from "@pluto/interfaces";
import NextLink from "next/link";
import { useEffect, useState } from "react";
import { DeviceStatusBadge } from "../Badge";
import { ArrowLeftSmallIcon } from "../icons/ArrowIcon";

interface DeviceMonitoringAccordionProps {
  devices: Device[] | undefined;
}

interface AccordionItemProps {
  device: Device;
}

export const DeviceMonitoringAccordion: React.FC<DeviceMonitoringAccordionProps> = ({
  devices: deviceList,
}) => {
  const [devices, setDevices] = useState<Device[]>(deviceList || []);

  const { isConnected, socket } = useSocket();

  useEffect(() => {
    setDevices(deviceList || []);
  }, [deviceList]);

  useEffect(() => {
    const listener = (e: Device) => {
      setDevices((prevDevices) => {
        // Trova l'indice del dispositivo da aggiornare
        const deviceIndex = prevDevices.findIndex((device) => device.mac === e.mac);

        if (deviceIndex === -1) {
          // Se il dispositivo non è trovato, opzionalmente puoi aggiungerlo
          return prevDevices;
        }

        // Crea una nuova lista di dispositivi con l'aggiornamento
        const updatedDevices = [...prevDevices];
        updatedDevices[deviceIndex] = {
          ...updatedDevices[deviceIndex], // Mantieni i dati esistenti
          ...e, // Aggiorna con i nuovi dati da e
        };

        return updatedDevices;
      });
    };

    if (isConnected) {
      socket.on("stat_update", listener);
      socket.on("error", listener);

      return () => {
        socket.off("stat_update", listener);
        socket.off("error", listener);
      };
    }
  }, [isConnected, socket]);

  return (
    <>
      {devices && devices.length > 0 ? (
        <div className="flex flex-col border border-border bg-card">
          {devices.map((device, index) => (
            <details
              key={`device-settings-${device.mac}`}
              className={index === 0 ? "" : "border-t border-border"}
            >
              <AccordionItem device={device} />
            </details>
          ))}
        </div>
      ) : (
        <div className="text-center text-sm text-muted-foreground">No device found</div>
      )}
    </>
  );
};

const AccordionItem: React.FC<AccordionItemProps> = ({ device }) => {
  const currentDiff = (device.info as any).currentDiff ?? device.info.bestSessionDiff;

  return (
    <>
      <summary className="flex cursor-pointer items-center justify-between gap-4 bg-muted p-4">
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground">▾</span>
          <span className="font-body text-sm font-semibold capitalize">{device.info.hostname}</span>
          <DeviceStatusBadge status={device.tracing ? "online" : "offline"} />
        </div>
        <NextLink
          href={`/monitoring/${device.info.hostname}`}
          onClick={(e) => e.stopPropagation()}
          className="text-muted-foreground hover:text-foreground"
          aria-label={`Open ${device.info.hostname}`}
        >
          <ArrowLeftSmallIcon color="currentColor" />
        </NextLink>
      </summary>

      <div className="border-t border-border bg-card p-4">
        <div className="flex flex-col gap-2">
          <Row label="Hash rate" value={`${(device.info.hashRate_10m || device.info.hashRate)?.toFixed(2)} GH/s`} />
          <Row
            label="Shares"
            value={`${device.info.sharesAccepted} | ${device.info.sharesRejected}`}
            highlightRight
          />
          <Row label="Power" value={`${device.info.power.toFixed(2)} W`} />
          <Row label="Temp." value={`${formatTemperature(device.info.temp)} °C`} />
          <Row label="VR Temp." value={`${formatTemperature(device.info.vrTemp)} °C`} />
          <Row label="Current difficulty" value={formatDifficulty(currentDiff)} />
          <Row label="Best difficulty" value={formatDifficulty(device.info.bestDiff)} />
          <Row label="Uptime" value={formatDetailedTime(device.info.uptimeSeconds)} />
        </div>
      </div>
    </>
  );
};

function Row({
  label,
  value,
  highlightRight = false,
}: {
  label: string;
  value: string;
  highlightRight?: boolean;
}) {
  const parts = value.split("|").map((p) => p.trim());

  return (
    <div className="flex items-center justify-between gap-4">
      <span className="font-heading text-sm font-medium capitalize">{label}</span>
      {highlightRight && parts.length === 2 ? (
        <span className="font-body text-sm">
          <span className="text-muted-foreground">{parts[0]}</span>{" "}
          <span className="text-muted-foreground">|</span>{" "}
          <span className="text-primary">{parts[1]}</span>
        </span>
      ) : (
        <span className="font-body text-sm text-muted-foreground">{value}</span>
      )}
    </div>
  );
}

function formatTemperature(value: number | undefined | null) {
  if (value == null) return "N/A";
  if (!Number.isFinite(value)) return "N/A";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
