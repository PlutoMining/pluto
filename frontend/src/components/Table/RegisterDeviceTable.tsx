/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import React, { useEffect, useRef, useState } from "react";
import { Device } from "@pluto/interfaces";
import { getMinerName } from "@/utils/minerMap";
import { Checkbox } from "../Checkbox";

interface RegisterDeviceTableProps {
  devices: Device[];
  allChecked: boolean;
  onChange: (index: number) => void;
  checkedItems: boolean[];
  handleAllCheckbox: (value: boolean) => void;
  selectedTab: number;
}

export const RegisterDeviceTable: React.FC<RegisterDeviceTableProps> = ({
  devices,
  allChecked,
  onChange,
  checkedItems,
  handleAllCheckbox,
  selectedTab,
}) => {
  const [hasScroll, setHasScroll] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkScroll = () => {
      if (boxRef.current) {
        // Controlla se il contenuto è più grande della sua altezza visibile
        setHasScroll(boxRef.current.scrollHeight > boxRef.current.clientHeight);
      }
    };

    // Verifica lo scroll iniziale
    checkScroll();

    // Crea un ResizeObserver per monitorare i cambiamenti nelle dimensioni del contenitore
    const resizeObserver = new ResizeObserver(() => {
      checkScroll(); // Ricalcola se c'è scroll ogni volta che la dimensione cambia
    });

    // Inizia ad osservare l'elemento
    const element = boxRef.current;
    if (element) {
      resizeObserver.observe(element);
    }

    // Pulisci l'observer quando il componente viene smontato
    return () => {
      if (element) {
        resizeObserver.unobserve(element);
      }
    };
  }, []);

  return (
    <div style={{ maxHeight: "calc(100% - 5.5rem)" }} className="relative">
      <div ref={boxRef} className="h-full overflow-auto">
        {devices && devices.length > 0 ? (
          <>
            <div className="hidden tablet:block">
              <table className="w-full border-collapse border border-border">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    <th className="border-b border-border p-3 text-left font-heading text-xs font-medium capitalize text-foreground">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded-none border border-input bg-background accent-primary"
                          checked={allChecked}
                          onChange={(e) => handleAllCheckbox(e.target.checked)}
                        />
                        <span>Hostname</span>
                      </label>
                    </th>
                    <th className="border-b border-border p-3 text-left font-heading text-xs font-medium capitalize text-foreground">
                      IP
                    </th>
                    <th className="border-b border-border p-3 text-left font-heading text-xs font-medium capitalize text-foreground">
                      Mac Address
                    </th>
                    <th className="border-b border-border p-3 text-left font-heading text-xs font-medium capitalize text-foreground">
                      Miner
                    </th>
                    <th className="border-b border-border p-3 text-left font-heading text-xs font-medium capitalize text-foreground">
                      ASIC
                    </th>
                    <th className="border-b border-border p-3 text-left font-heading text-xs font-medium capitalize text-foreground">
                      FW v.
                    </th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {devices.map((device, index) => (
                    <tr key={`tab${selectedTab}-device-${device.ip}`} className="bg-card">
                      <td className="border-t border-border p-3">
                        <Checkbox
                          id={device.mac}
                          name={device.mac}
                          label={device.info.hostname}
                          onChange={() => onChange(index)}
                          isChecked={checkedItems[index]}
                        />
                      </td>
                      <td className="border-t border-border p-3 font-accent text-[13px]">
                        {device.ip}
                      </td>
                      <td className="border-t border-border p-3 font-accent text-[13px]">
                        {device.mac}
                      </td>
                      <td className="border-t border-border p-3 font-accent text-[13px]">
                        {getMinerName(device.info.boardVersion) || device.info?.deviceModel}
                      </td>
                      <td className="border-t border-border p-3 font-accent text-[13px]">
                        {device.info.ASICModel}
                      </td>
                      <td className="border-t border-border p-3 font-accent text-[13px]">
                        {device.info.version}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="tablet:hidden border border-border bg-card">
              {devices.map((device, index) => (
                <details
                  key={`tab${selectedTab}-device-${device.ip}`}
                  className="border-t border-border first:border-t-0"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-3 bg-muted px-4 py-3">
                    <span className="font-body text-sm font-semibold capitalize">
                      {device.info.hostname}
                    </span>
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded-none border border-input bg-background accent-primary"
                      checked={checkedItems[index]}
                      onChange={() => onChange(index)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </summary>
                  <div className="bg-card p-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-heading text-sm font-medium capitalize">IP</span>
                        <span className="font-accent text-sm text-muted-foreground">{device.ip}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-heading text-sm font-medium capitalize">Mac Address</span>
                        <span className="font-accent text-sm text-muted-foreground">{device.mac}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-heading text-sm font-medium capitalize">Miner</span>
                        <span className="font-accent text-sm text-muted-foreground">
                          {getMinerName(device.info.boardVersion) || device.info?.deviceModel}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-heading text-sm font-medium capitalize">ASIC</span>
                        <span className="font-accent text-sm text-muted-foreground">
                          {device.info.ASICModel}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-heading text-sm font-medium capitalize">FW v.</span>
                        <span className="font-accent text-sm text-muted-foreground">
                          {device.info.version}
                        </span>
                      </div>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </>
        ) : (
          <div className="py-10 text-center text-sm text-muted-foreground">No device found</div>
        )}
      </div>

      <div
        className="pointer-events-none absolute bottom-0 left-0 h-[50px] w-full"
        data-has-scroll={hasScroll ? "true" : "false"}
        style={{
          background: hasScroll ? "linear-gradient(to top, hsl(var(--background)), transparent)" : "none",
        }}
      />
    </div>
  );
};
