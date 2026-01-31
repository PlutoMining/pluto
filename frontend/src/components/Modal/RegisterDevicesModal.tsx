/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { Device } from "@pluto/interfaces";
import { isValidIp, isValidMac } from "@pluto/utils";
import axios from "axios";
import React, { ChangeEvent, useCallback, useEffect, useState } from "react";
import Button from "../Button/Button";
import { AddIcon } from "../icons/AddIcon";
import { Input } from "../Input/Input";
import { CircularProgressWithDots } from "../ProgressBar/CircularProgressWithDots";
import { RegisterDeviceTable } from "../Table";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

interface RegisterDevicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDevicesChanged: () => Promise<void>;
}

export function hasEmptyFields(obj: any): boolean {
  for (const key in obj) {
    if (typeof obj[key] === "object" && obj[key] !== null) {
      if (hasEmptyFields(obj[key])) return true;
    } else if (obj[key] === "") {
      return true;
    }
  }
  return false;
}

export function hasErrorFields(obj: any): boolean {
  for (const key in obj) {
    if (typeof obj[key] === "object" && obj[key] !== null) {
      if (hasErrorFields(obj[key])) return true;
    } else if (obj[key] !== "") {
      return true;
    }
  }
  return false;
}

function ModalBodyContent({
  onClose,
  onDevicesChanged,
}: {
  onClose: () => void;
  onDevicesChanged: () => Promise<void>;
}) {
  const [discoveredDevices, setDiscoveredDevices] = useState<Device[] | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [tabIndex, setTabIndex] = useState(0);

  const [errors, setErrors] = useState({
    ipAddress: "",
    macAddress: "",
  });

  const [ipAndMacAddress, setIpAndMacAddress] = useState({
    ipAddress: "",
    macAddress: "",
  });

  const [checkedFetchedItems, setCheckedFetchedItems] = React.useState<boolean[]>([]);

  const allChecked = checkedFetchedItems.every(Boolean);

  useEffect(() => {
    setIpAndMacAddress({ ipAddress: "", macAddress: "" });
    setDiscoveredDevices(null);
    if (tabIndex === 1) {
      getDiscoverDevices();
    }
  }, [tabIndex]);

  const getDiscoverDevices = async () => {
    try {
      setIsLoadingData(true);

      // Effettua la chiamata per ottenere le imprinted devices
      const imprintedResponse = await axios.get("/api/devices/imprint");
      const imprintedDevices: Device[] = imprintedResponse.data?.data;

      // Effettua la chiamata per ottenere le discovered devices
      const discoveredResponse = await axios.get("/api/devices/discover");
      if (discoveredResponse.status === 200) {
        const discoveredDevices: Device[] = discoveredResponse.data;

        // Filtra i discoveredDevices escludendo quelli già imprinted
        const filteredDiscoveredDevices = discoveredDevices.filter(
          (device) => !imprintedDevices.some((imprinted) => imprinted.mac === device.mac)
        );

        // Aggiorna lo stato con i dispositivi filtrati
        setDiscoveredDevices([...filteredDiscoveredDevices]);
        setCheckedFetchedItems(
          Array.from({ length: filteredDiscoveredDevices.length }, () => false)
        );
      } else {
        console.error("Error discovering devices:", discoveredResponse.status);
      }
    } catch (error) {
      console.error("Error discovering devices:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const searchDevice = useCallback(async () => {
    try {
      setIsLoadingData(true);

      const response = await axios.get("/api/devices/discover", {
        params: {
          ip: ipAndMacAddress.ipAddress,
          mac: ipAndMacAddress.macAddress,
        },
      });

      const discoveredDevices: Device[] = response.data;

      if (discoveredDevices.length === 1) {
        discoveredDevices[0].mac = ipAndMacAddress.macAddress;
      }

      setDiscoveredDevices(discoveredDevices);
    } catch (error) {
      console.error("Error discovering devices:", error);
    } finally {
      setIsLoadingData(false);
    }
  }, [ipAndMacAddress]);

  const registerDevice = async () => {
    try {
      await axios.patch(`/api/devices/imprint`, {
        mac: discoveredDevices?.find((d) => d.ip === ipAndMacAddress.ipAddress)?.mac,
      });
      await onDevicesChanged();
      onClose();
    } catch (error) {
      console.error("Error registering device:", error);
    }
  };

  const registerDevices = async () => {
    try {
      // Filtra i dispositivi selezionati
      const selectedDevices = discoveredDevices!.filter((_, index) => checkedFetchedItems[index]);

      // Registra i dispositivi selezionati inviando le informazioni necessarie, in sequenza
      for (const device of selectedDevices) {
        await axios.patch(`/api/devices/imprint`, {
          mac: device.mac,
        });
      }

      // Chiamata di callback per notificare che i dispositivi sono stati modificati
      await onDevicesChanged();
      onClose();
    } catch (error) {
      console.error("Error registering devices:", error);
    }
  };

  const handleAllCheckbox = useCallback((value: boolean) => {
    setCheckedFetchedItems((prevItems) => Array.from({ length: prevItems.length }, () => value));
  }, []);

  const handleCheckbox = useCallback((index: number) => {
    setCheckedFetchedItems((prevItems) =>
      prevItems.map((value: boolean, i: number) => (i === index ? !value : value))
    );
  }, []);

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    const isValid = name === "ipAddress" ? isValidIp(value) : isValidMac(value);

    const errorLabel = value === "" ? `${name} is required` : isValid ? "" : `${name} is not valid`;

    setErrors((prevErrors) => ({ ...prevErrors, [name]: errorLabel }));
    setIpAndMacAddress((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  }, []);

  const areManuallySearchFieldsValid = useCallback(() => {
    return hasErrorFields(errors) || hasEmptyFields(ipAndMacAddress);
  }, [errors, ipAndMacAddress]);

  return (
    <div className="mt-6 flex h-full flex-col gap-4">
      <div className="flex gap-6 border-b border-border pb-2">
        <button
          type="button"
          onClick={() => setTabIndex(0)}
          className={cn(
            "relative pb-2 font-heading text-sm",
            tabIndex === 0 ? "font-bold" : "text-muted-foreground"
          )}
        >
          Manually
          {tabIndex === 0 ? (
            <span className="absolute -bottom-[1px] left-1/2 h-0.5 w-8 -translate-x-1/2 bg-primary" />
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => setTabIndex(1)}
          className={cn(
            "relative pb-2 font-heading text-sm",
            tabIndex === 1 ? "font-bold" : "text-muted-foreground"
          )}
        >
          Auto discovery
          {tabIndex === 1 ? (
            <span className="absolute -bottom-[1px] left-1/2 h-0.5 w-8 -translate-x-1/2 bg-primary" />
          ) : null}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tabIndex === 0 ? (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="IP Address"
                name="ipAddress"
                id="ipAddress"
                placeholder="IP address"
                value={ipAndMacAddress.ipAddress}
                onChange={handleChange}
                error={errors.ipAddress}
              />
              <Input
                label="MAC Address"
                name="macAddress"
                id="macAddress"
                placeholder="MAC Address"
                value={ipAndMacAddress.macAddress}
                onChange={handleChange}
                error={errors.macAddress}
              />
            </div>

            <div>
              <Button
                variant="primary"
                onClick={searchDevice}
                isLoading={isLoadingData}
                disabled={areManuallySearchFieldsValid()}
                label="Search"
                className="w-full md:w-auto"
              />
            </div>

            {discoveredDevices ? (
              discoveredDevices.length > 0 && ipAndMacAddress.macAddress ? (
                <div className="mt-2 flex flex-col gap-4">
                  <p className="font-heading text-sm font-bold text-foreground">
                    Result for {ipAndMacAddress.macAddress}
                  </p>
                  <RegisterDeviceTable
                    devices={discoveredDevices}
                    onChange={handleCheckbox}
                    allChecked={allChecked}
                    checkedItems={checkedFetchedItems}
                    handleAllCheckbox={handleAllCheckbox}
                    selectedTab={tabIndex}
                  />
                  <div className="flex flex-col gap-3 md:flex-row md:gap-4">
                    <Button variant="outlined" onClick={onClose} label="Cancel" className="w-full md:w-auto" />
                    <Button
                      variant="primary"
                      onClick={() => registerDevice()}
                      rightIcon={<AddIcon color="currentColor" />}
                      disabled={discoveredDevices.length !== 1}
                      label="Add device"
                      className="w-full md:w-auto"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No device found</p>
              )
            ) : null}
          </div>
        ) : isLoadingData ? (
          <div className="mx-auto my-8 flex flex-col items-center gap-4">
            <CircularProgressWithDots />
            <p className="font-heading text-2xl font-normal">Looking for Devices...</p>
          </div>
        ) : (
          <div className="flex h-full flex-col gap-4">
            {discoveredDevices && discoveredDevices.length > 0 ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs text-muted-foreground">
                    “{discoveredDevices.length}” new devices found
                  </p>
                  <label className="flex items-center gap-2 md:hidden">
                    <span className="text-xs text-muted-foreground">Select all</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded-none border border-input bg-background accent-primary"
                      checked={allChecked}
                      onChange={(e) => handleAllCheckbox(e.target.checked)}
                    />
                  </label>
                </div>

                <RegisterDeviceTable
                  devices={discoveredDevices}
                  onChange={handleCheckbox}
                  allChecked={allChecked}
                  checkedItems={checkedFetchedItems}
                  handleAllCheckbox={handleAllCheckbox}
                  selectedTab={tabIndex}
                />

                <div className="flex flex-col gap-3 md:flex-row md:gap-4">
                  <Button variant="outlined" onClick={onClose} label="Cancel" className="w-full md:w-auto" />
                  <Button
                    variant="primary"
                    onClick={() => registerDevices()}
                    rightIcon={<AddIcon color="currentColor" />}
                    disabled={checkedFetchedItems.filter((el) => el === true).length === 0}
                    label={`Add ${
                      checkedFetchedItems.filter((el) => el === true).length > 0
                        ? checkedFetchedItems.filter((el) => el === true).length
                        : ""
                    } device`}
                    className="w-full md:w-auto"
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No device found.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export const RegisterDevicesModal: React.FC<RegisterDevicesModalProps> = ({
  isOpen,
  onClose,
  onDevicesChanged,
}) => {
  return (
    <Modal open={isOpen} onClose={onClose} variant="sheet">
      <div className="w-full max-w-[1440px] border border-border bg-card text-card-foreground">
        <div className="relative mx-auto max-h-[calc(100vh-8rem)] overflow-y-auto p-6 md:p-8">
          <div className="flex items-start justify-between gap-6">
            <h2 className="font-heading text-2xl font-medium">Add a new Device</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-primary hover:opacity-80"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <ModalBodyContent onClose={onClose} onDevicesChanged={onDevicesChanged} />
        </div>
      </div>
    </Modal>
  );
};
