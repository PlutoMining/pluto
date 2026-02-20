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
import {
  getHostname,
  getHashrateGhs,
  getBestDifficulty,
  getBestSessionDifficulty,
  getUptime,
  getTemperatureAvg,
  getWattage,
  getSharesAccepted,
  getSharesRejected,
} from "@/utils/minerDataHelpers";
import type { DiscoveredMiner } from "@pluto/interfaces";
import axios from "axios";
import NextLink from "next/link";
import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";

function formatTemperature(value: number | undefined | null) {
  if (value == null) return "N/A";
  if (!Number.isFinite(value)) return "N/A";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export default function MonitoringTableClient() {
  const [registeredDevices, setRegisteredDevices] = useState<DiscoveredMiner[] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const hasSearchedRef = useRef(false);

  const fetchDevicesAndUpdate = useCallback(async () => {
    try {
      const deviceResponse = await axios.get<{ data: DiscoveredMiner[] }>("/api/devices/imprint");
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
    const listener = (e: DiscoveredMiner) => {
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
        const response = await axios.get<{ data: DiscoveredMiner[] }>("/api/devices/imprint", {
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
    <div className="flex-1 py-6">
      <div className="mx-auto w-full max-w-[var(--pluto-content-max)] px-4 md:px-8">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-end">
            <div className="w-full">
              <SearchInput label="Search device" onChange={handleSearch} placeholder="Search device" />
            </div>
          </div>

        {registeredDevices && registeredDevices.length > 0 ? (
          <div className="bg-card">
            <div className="hidden overflow-x-auto border border-border md:block">
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
                    const m = device.minerData;
                    const currentDiff = getBestSessionDifficulty(m);
                    const hostname = getHostname(m);
                    const power = getWattage(m);
                    const temp = getTemperatureAvg(m);

                    return (
                    <tr key={device.mac} className="bg-card">
                      <td className="border-t border-border p-3 text-left font-accent text-sm font-normal">
                        {hostname}
                      </td>
                      <td className="border-t border-border p-3 text-center font-accent text-sm font-normal">
                        {getHashrateGhs(m).toFixed(2)} GH/s
                      </td>
                      <td className="border-t border-border p-3 text-center font-accent text-sm font-normal">
                        <span className="text-muted-foreground">{getSharesAccepted(m)}</span>{" "}
                        <span className="text-muted-foreground">|</span>{" "}
                        <span className="text-primary">{getSharesRejected(m)}</span>
                      </td>
                      <td className="border-t border-border p-3 text-center font-accent text-sm font-normal">
                        {power != null ? `${power.toFixed(2)} W` : "N/A"}
                      </td>
                      <td className="border-t border-border p-3 text-center font-accent text-sm font-normal">
                        {formatTemperature(temp)} °C
                      </td>
                      <td className="border-t border-border p-3 text-center font-accent text-sm font-normal">
                        {formatDifficulty(currentDiff)}
                      </td>
                      <td className="border-t border-border p-3 text-center font-accent text-sm font-normal">
                        {formatDifficulty(getBestDifficulty(m))}
                      </td>
                      <td
                        className="border-t border-border p-3 text-center font-accent text-sm font-normal"
                        title={formatDetailedTime(getUptime(m))}
                      >
                        {formatTime(getUptime(m))}
                      </td>
                      <td className="border-t border-border p-3 text-center">
                        <DeviceStatusBadge status={device.tracing ? "online" : "offline"} />
                      </td>
                      <td className="border-t border-border p-3 text-center">
                        <NextLink
                          href={`/monitoring/${encodeURIComponent(hostname)}`}
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

              <div className="md:hidden">
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
    </div>
  );
}
