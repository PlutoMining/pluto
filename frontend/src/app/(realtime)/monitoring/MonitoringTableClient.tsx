"use client";
/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
 */

import { DeviceMonitoringAccordion } from "@/components/Accordion";
import { DeviceStatusBadge } from "@/components/Badge";
import { ArrowLeftSmallIcon } from "@/components/icons/ArrowIcon";
import { SearchInput } from "@/components/Input";
import { useSocket } from "@/providers/SocketProvider";
import { formatDifficulty } from "@/utils/formatDifficulty";
import { formatDetailedTime, formatTime } from "@/utils/formatTime";
import { Device } from "@pluto/interfaces";
import axios from "axios";
import NextLink from "next/link";
import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";

function formatTemperature(value: number | undefined | null) {
  if (value == null) return "N/A";
  if (!Number.isFinite(value)) return "N/A";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export default function MonitoringTableClient() {
  const [registeredDevices, setRegisteredDevices] = useState<Device[] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const hasSearchedRef = useRef(false);

  const fetchDevicesAndUpdate = useCallback(async () => {
    try {
      const deviceResponse = await axios.get<{ data: Device[] }>("/api/devices/imprint");
      const fetchedDevices = deviceResponse.data.data;

      setRegisteredDevices(fetchedDevices || []);
    } catch (error) {
      console.error("Error discovering devices:", error);
    }
  }, []);

  useEffect(() => {
    void fetchDevicesAndUpdate();
  }, [fetchDevicesAndUpdate]);

  const { isConnected, socket } = useSocket();

  useEffect(() => {
    const listener = (e: Device) => {
      setRegisteredDevices((prevDevices) => {
        if (!prevDevices) return prevDevices;

        const deviceIndex = prevDevices.findIndex((device) => device.mac === e.mac);

        if (deviceIndex === -1) {
          return prevDevices;
        }

        const updatedDevices = [...prevDevices];
        updatedDevices[deviceIndex] = {
          ...updatedDevices[deviceIndex],
          ...e,
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

  const handleSearch = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  useEffect(() => {
    const query = searchQuery.trim();

    if (query === "") {
      if (hasSearchedRef.current) {
        void fetchDevicesAndUpdate();
        hasSearchedRef.current = false;
      }
      return;
    }

    hasSearchedRef.current = true;

    const controller = new AbortController();

    const timeoutId = setTimeout(async () => {
      try {
        const response = await axios.get<{ data: Device[] }>("/api/devices/imprint", {
          params: { q: query },
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        setRegisteredDevices(response.data.data || []);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Error searching devices:", error);
      }
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [fetchDevicesAndUpdate, searchQuery]);

  return (
    <div className="container flex-1 py-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 tablet:flex-row tablet:items-center tablet:justify-between">
          <h1 className="font-heading text-4xl font-bold uppercase">Monitoring</h1>
          <div className="w-full tablet:w-auto">
            <SearchInput label="Search device" onChange={handleSearch} placeholder="Search device" />
          </div>
        </div>

        {registeredDevices && registeredDevices.length > 0 ? (
          <div className="bg-card">
            <div className="hidden tablet:block overflow-x-auto border border-border">
              <table className="w-full border-collapse">
                <thead className="bg-muted">
                  <tr>
                    <th className="border-b border-border p-3 text-left font-accent text-xs font-normal uppercase text-muted-foreground">
                      Name
                    </th>
                    <th className="border-b border-border p-3 text-center font-accent text-xs font-normal uppercase text-muted-foreground">
                      Hashrate
                    </th>
                    <th className="border-b border-border p-3 text-center font-accent text-xs font-normal uppercase text-muted-foreground">
                      Shares
                    </th>
                    <th className="border-b border-border p-3 text-center font-accent text-xs font-normal uppercase text-muted-foreground">
                      Power
                    </th>
                    <th className="border-b border-border p-3 text-center font-accent text-xs font-normal uppercase text-muted-foreground">
                      Temp
                    </th>
                    <th className="border-b border-border p-3 text-center font-accent text-xs font-normal uppercase text-muted-foreground">
                      VR Temp
                    </th>
                    <th className="border-b border-border p-3 text-center font-accent text-xs font-normal uppercase text-muted-foreground">
                      Current difficulty
                    </th>
                    <th className="border-b border-border p-3 text-center font-accent text-xs font-normal uppercase text-muted-foreground">
                      Best difficulty
                    </th>
                    <th className="border-b border-border p-3 text-center font-accent text-xs font-normal uppercase text-muted-foreground">
                      Uptime
                    </th>
                    <th className="border-b border-border p-3 text-center font-accent text-xs font-normal uppercase text-muted-foreground">
                      Status
                    </th>
                    <th className="border-b border-border p-3" />
                  </tr>
                </thead>
                <tbody>
                  {registeredDevices.map((device) => {
                    const currentDiff = (device.info as any).currentDiff ?? device.info.bestSessionDiff;

                    return (
                    <tr key={device.mac} className="bg-card">
                      <td className="border-t border-border p-3 text-left font-accent text-sm font-normal">
                        {device.info.hostname}
                      </td>
                      <td className="border-t border-border p-3 text-center font-accent text-sm font-normal">
                        {(device.info.hashRate_10m || device.info.hashRate)?.toFixed(2)} GH/s
                      </td>
                      <td className="border-t border-border p-3 text-center font-accent text-sm font-normal">
                        <span className="text-muted-foreground">{device.info.sharesAccepted}</span>{" "}
                        <span className="text-muted-foreground">|</span>{" "}
                        <span className="text-primary">{device.info.sharesRejected}</span>
                      </td>
                      <td className="border-t border-border p-3 text-center font-accent text-sm font-normal">
                        {device.info.power.toFixed(2)} W
                      </td>
                      <td className="border-t border-border p-3 text-center font-accent text-sm font-normal">
                        {formatTemperature(device.info.temp)} °C
                      </td>
                      <td className="border-t border-border p-3 text-center font-accent text-sm font-normal">
                        {formatTemperature(device.info.vrTemp)} °C
                      </td>
                      <td className="border-t border-border p-3 text-center font-accent text-sm font-normal">
                        {formatDifficulty(currentDiff)}
                      </td>
                      <td className="border-t border-border p-3 text-center font-accent text-sm font-normal">
                        {formatDifficulty(device.info.bestDiff)}
                      </td>
                      <td
                        className="border-t border-border p-3 text-center font-accent text-sm font-normal"
                        title={formatDetailedTime(device.info.uptimeSeconds)}
                      >
                        {formatTime(device.info.uptimeSeconds)}
                      </td>
                      <td className="border-t border-border p-3 text-center">
                        <DeviceStatusBadge status={device.tracing ? "online" : "offline"} />
                      </td>
                      <td className="border-t border-border p-3 text-center">
                        <NextLink
                          href={`/monitoring/${device.info.hostname}`}
                          className="inline-flex items-center gap-1 font-accent text-sm font-medium underline"
                        >
                          Dashboard <ArrowLeftSmallIcon color="currentColor" />
                        </NextLink>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="tablet:hidden">
              <DeviceMonitoringAccordion devices={registeredDevices} />
            </div>
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            To start using Pluto, go to{" "}
            <NextLink href={"/devices"} className="underline">
              Your Devices
            </NextLink>{" "}
            and add one or more devices.
          </p>
        )}
      </div>
    </div>
  );
}
