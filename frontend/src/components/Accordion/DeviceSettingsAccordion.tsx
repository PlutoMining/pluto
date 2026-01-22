/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { useSocket } from "@/providers/SocketProvider";
import { Modal } from "@/components/ui/modal";
import { useDisclosure } from "@/hooks/useDisclosure";
import { cn } from "@/lib/utils";
import { Device, Preset } from "@pluto/interfaces";
import { validateDomain, validateTCPPort } from "@pluto/utils";
import axios from "axios";
import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { AlertInterface, AlertStatus } from "../Alert/interfaces";
import { DeviceStatusBadge } from "../Badge";
import Button from "../Button/Button";
import { Checkbox } from "../Checkbox/Checkbox";
import { ArrowIcon, ArrowRightUpIcon } from "../icons/ArrowIcon";
import { RestartIcon } from "../icons/RestartIcon";
import { Input } from "../Input/Input";
import Link from "../Link/Link";
import { SaveAndRestartModal } from "../Modal";
import { RestartModal } from "../Modal/RestartModal";
import { RadioButtonValues } from "../Modal/SaveAndRestartModal";
import { SelectPresetModal } from "../Modal/SelectPresetModal";
import { RadioButton } from "../RadioButton";
import { Select } from "../Select/Select";

interface DeviceSettingsAccordionProps {
  fetchedDevices: Device[] | undefined;
  alert?: AlertInterface;
  setAlert: React.Dispatch<React.SetStateAction<AlertInterface | undefined>>;
  onOpenAlert: () => void;
}

interface AccordionItemProps {
  device: Device;
  presets: Preset[];
  alert?: AlertInterface;
  setAlert: React.Dispatch<React.SetStateAction<AlertInterface | undefined>>;
  onOpenAlert: () => void;
  handleCheckboxChange: (mac: string, isChecked: boolean) => void;
  checkedItems: { mac: String; value: boolean }[];
}

enum RadioButtonStatus {
  PRESET = "preset",
  CUSTOM = "custom",
}

interface StratumUser {
  workerName: string;
  stratumUser: string;
}

export const DeviceSettingsAccordion: React.FC<DeviceSettingsAccordionProps> = ({
  fetchedDevices,
  alert,
  setAlert,
  onOpenAlert,
}) => {
  const { isOpen: isOpenModal, onOpen: onOpenModal, onClose: onCloseModal } = useDisclosure();

  const [isSelectPoolPresetOpen, setIsSelectPoolPresetModalOpen] = useState(false);

  const [devices, setDevices] = useState<Device[]>(fetchedDevices || []);

  const [checkedFetchedItems, setCheckedFetchedItems] = useState<{ mac: string; value: boolean }[]>(
    []
  );

  const [presets, setPresets] = useState<Preset[]>([]);

  const [openMacs, setOpenMacs] = useState<string[]>([]);

  const allChecked =
    checkedFetchedItems.length > 0 && checkedFetchedItems.every((item) => item.value);

  useEffect(() => {
    setDevices(fetchedDevices || []);
    setCheckedFetchedItems([]);
    setOpenMacs([]);
  }, [fetchedDevices]);

  useEffect(() => {
    fetchPresets();
  }, []);

  const fetchPresets = async () => {
    try {
      const response = await fetch("/api/presets");
      if (response.ok) {
        const data: { data: Preset[] } = await response.json();
        setPresets(data.data);
      } else {
        console.error("Failed to fetch presets");
      }
    } catch (error) {
      console.error("Error fetching presets", error);
    }
  };

  const handleAllCheckbox = useCallback(
    (value: boolean) => {
      const newValues = Array.from({ length: devices.length }, (_, i) => ({
        mac: devices[i].mac,
        value: value,
      }));
      setCheckedFetchedItems(newValues);

      if (value) {
        setOpenMacs([]);
      }
    },
    [devices]
  );

  const handleRestartSelected = useCallback(
    async (e: { preventDefault: () => void }) => {
      e.preventDefault();
      onCloseModal();

      // setCheckedFetchedItems([]);

      const handleRestart = (mac: string) => axios.post(`/api/devices/${mac}/system/restart`);

      try {
        if (checkedFetchedItems && checkedFetchedItems.length > 0) {
          await Promise.all(
            checkedFetchedItems.filter((d) => d.value).map((d) => handleRestart(d.mac))
          );

          setAlert({
            status: AlertStatus.SUCCESS,
            title: "Restart Successful",
            message:
              "All devices have been restarted successfully. The eventual new settings have been applied, and the miners are back online.",
          });

          onOpenAlert();
        } else {
          setAlert({
            status: AlertStatus.WARNING,
            title: "No Devices Available",
            message: "There are no registered devices to restart at this moment.",
          });
          onOpenAlert();
        }
      } catch (error) {
        let errorMessage = "An error occurred while attempting to restart the devices.";

        if (axios.isAxiosError(error)) {
          errorMessage = error.response?.data?.message || error.message;
        }

        setAlert({
          status: AlertStatus.ERROR,
          title: "Restart Failed",
          message: `${errorMessage} Please try again or contact support if the issue persists.`,
        });
        onOpenAlert();
      }
    },
    [checkedFetchedItems, onOpenAlert, setAlert]
  );

  const handleCloseSuccessfully = async (uuid: string) => {
    setIsSelectPoolPresetModalOpen(false);

    const handleSavePreset = (mac: string, d: Device) =>
      axios.patch<{ message: string; data: Device }>(`/api/devices/${mac}/system`, d);

    const handleChangesOnImprintedDevices = (mac: string, d: Device) =>
      axios.patch<{ message: string; data: Device }>(`/api/devices/imprint/${mac}`, {
        device: d,
      });

    try {
      if (devices) {
        await Promise.all(
          devices.reduce((acc: Array<Promise<any>>, device: Device) => {
            const isChecked = checkedFetchedItems.some(
              (item) => item.mac === device.mac && item.value === true
            );
            if (isChecked) {
              acc.push(
                (async () => {
                  const {
                    data: { data: updatedDestDevice },
                  } = await handleSavePreset(device.mac, { ...device, presetUuid: uuid });

                  const {
                    data: { data: updatedDevice },
                  } = await handleChangesOnImprintedDevices(
                    updatedDestDevice.mac,
                    updatedDestDevice
                  );

                  return updatedDevice ? { ...device, ...updatedDevice } : device;
                })()
              );
            } else {
              acc.push(Promise.resolve(device));
            }
            return acc;
          }, [])
        ).then((updatedDevices) => {
          setDevices(updatedDevices);
        });
      }

      setAlert({
        status: AlertStatus.SUCCESS,
        title: "Save Successful",
        message: "All the selected devices have been successfully saved.",
      });
      onOpenAlert(); // Aprire l'alert per mostrare il messaggio di successo
    } catch (error) {
      let errorMessage = "An error occurred while saving devices.";

      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.message || error.message;
      }

      setAlert({
        status: AlertStatus.ERROR,
        title: "Save Failed",
        message: `${errorMessage} Please try again.`,
      });
      onOpenAlert(); // Aprire l'alert per mostrare il messaggio di errore
    }
  };

  const handleCheckboxChange = useCallback((mac: string, isChecked: boolean) => {
    setCheckedFetchedItems((prevItems) => {
      // Controlla se l'elemento con il MAC esiste già
      const existingItem = prevItems.find((item) => item.mac === mac);

      if (existingItem) {
        // Se esiste, aggiorna il valore
        return prevItems.map((item) => (item.mac === mac ? { ...item, value: isChecked } : item));
      } else {
        // Se non esiste, aggiungi un nuovo elemento
        return [...prevItems, { mac, value: isChecked }];
      }
    });

    // Chiudi l'accordion se la checkbox è selezionata
    if (isChecked) {
      setOpenMacs([]); // Chiude l'accordion
    }
  }, []);
  const selectedCount = checkedFetchedItems.filter((d) => d.value === true).length;
  const canBulkAct = selectedCount > 1;

  return (
    <>
      <div className="flex flex-col gap-4">
	        <div className="flex flex-col gap-4 tablet:flex-row tablet:items-center tablet:justify-between">
	          <label className="flex shrink-0 items-center gap-2">
	            <input
	              type="checkbox"
	              id="select-all-devices"
	              name="select-all-devices"
	              className="h-4 w-4 rounded-none border border-input bg-background accent-primary"
	              checked={allChecked}
	              onChange={(e) => handleAllCheckbox(e.target.checked)}
	            />
	            <span className="flex items-center gap-1 whitespace-nowrap font-body text-sm">
	              {selectedCount === 0 ? (
	                <span className="text-muted-foreground">Select all</span>
	              ) : (
                <>
                  <span className="font-medium text-foreground">{selectedCount}</span>
                  <span className="text-muted-foreground">/{devices.length}</span>
                  <span className="ml-1 font-accent text-xs uppercase text-muted-foreground">
                    selected
                  </span>
                </>
	              )}
	            </span>
	          </label>

	          <div className="flex w-full flex-wrap items-center justify-between gap-4 mobileL:justify-end tablet:w-auto tablet:flex-1 tablet:justify-end">
	            <Button
	              onClick={() => setIsSelectPoolPresetModalOpen(true)}
	              variant="text"
              icon={<ArrowRightUpIcon color="currentColor" />}
              disabled={!canBulkAct}
              label="Select Pool Preset"
              transform="capitalize"
            />
            <Button
              onClick={onOpenModal}
              variant="outlined"
              icon={<RestartIcon color="currentColor" />}
              disabled={!canBulkAct}
              label="Restart selected devices"
              transform="capitalize"
            />
          </div>
        </div>

        <div className="border border-border bg-card text-card-foreground">
          <div className="hidden items-center justify-between gap-4 border-b border-border bg-muted px-4 py-3 tablet:flex">
            <div className="flex flex-[8] items-center gap-3">
              <div className="hidden w-4 tablet:block" aria-hidden="true" />
              <span className="select-none text-xs leading-none text-primary opacity-0" aria-hidden="true">
                ▾
              </span>
              <span className="font-accent text-xs font-semibold uppercase text-muted-foreground">
                Hostname
              </span>
            </div>
            <div className="flex flex-[5] items-center justify-end gap-4">
              <span className="font-accent text-xs font-semibold uppercase text-muted-foreground">
                Status
              </span>
              <span className="hidden w-24 shrink-0 tablet:inline-flex" aria-hidden="true" />
            </div>
          </div>

          <div className="flex flex-col">
            {devices.map((device, index) => {
              const isOpen = openMacs.includes(device.mac);

              return (
                <details
                  key={`device-settings-${device.mac}`}
                  open={isOpen}
                  onToggle={(e) => {
                    const open = (e.currentTarget as HTMLDetailsElement).open;
                    setOpenMacs((prev) =>
                      open ? Array.from(new Set([...prev, device.mac])) : prev.filter((m) => m !== device.mac)
                    );
                  }}
                  className={cn("bg-card text-card-foreground", index > 0 ? "border-t border-border" : "")}
                >
                  <AccordionItem
                    key={device.mac}
                    device={device}
                    presets={presets}
                    setAlert={setAlert}
                    alert={alert}
                    onOpenAlert={onOpenAlert}
                    handleCheckboxChange={handleCheckboxChange}
                    checkedItems={checkedFetchedItems}
                    isAccordionOpen={isOpen}
                  />
                </details>
              );
            })}
          </div>
        </div>
      </div>

      <Modal open={isOpenModal} onClose={onCloseModal}>
        <div className="w-full max-w-xl border border-border bg-card p-4 text-card-foreground">
          <div className="flex items-start justify-between gap-6">
            <h2 className="font-heading text-lg font-medium">Restart the selected devices?</h2>
            <button
              type="button"
              onClick={onCloseModal}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Keep in mind that restarting devices may result in the loss of an entire block of
            transactions.
          </p>
          <div className="mt-6 flex items-center justify-end gap-4">
            <Button variant="outlined" onClick={onCloseModal} label="Cancel" />
            <Button type="submit" variant="primary" onClick={handleRestartSelected} label="Restart" />
          </div>
        </div>
      </Modal>
      <SelectPresetModal
        isOpen={isSelectPoolPresetOpen}
        onClose={() => setIsSelectPoolPresetModalOpen(false)}
        devices={devices.filter((device) =>
          checkedFetchedItems.some((item) => item.mac === device.mac && item.value === true)
        )}
        presets={presets}
        onCloseSuccessfully={handleCloseSuccessfully}
      />
    </>
  );
};

const AccordionItem: React.FC<AccordionItemProps & { isAccordionOpen: boolean }> = ({
  device: deviceInfo,
  presets,
  setAlert,
  onOpenAlert,
  handleCheckboxChange,
  checkedItems,
  isAccordionOpen,
}) => {
  const [device, setDevice] = useState<Device>({
    ...deviceInfo,
    info: deviceInfo.info,
  });

  const [deviceError, setDeviceError] = useState<Record<string, string>>({
    hostname: "",
    workerName: "",
    stratumURL: "",
    stratumPort: "",
    stratumUser: "",
    stratumPassword: "",
    fanspeed: "",
  });

  const [isSaveAndRestartModalOpen, setIsSaveAndRestartModalOpen] = useState(false);
  const [isRestartModalOpen, setIsRestartModalOpen] = useState(false);

  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);

  const [isPresetRadioButtonSelected, setIsPresetRadioButtonSelected] = useState<boolean>(
    deviceInfo?.presetUuid ? true : false
  );
  const [stratumUser, setStratumUser] = useState<StratumUser>({
    workerName: "",
    stratumUser: "",
  });

  const { isConnected, socket } = useSocket();

  useEffect(() => {
    if (presets && deviceInfo) {
      let foundPreset = presets.find((p) => p.uuid === deviceInfo?.presetUuid);

      setSelectedPreset(foundPreset || presets[0]);
    }
  }, [presets, deviceInfo]);

  useEffect(() => {
    if (device) {
      const currentDeviceStratumUser = device.info.stratumUser;
      const dotIndex = currentDeviceStratumUser.indexOf(".");

      setStratumUser({
        workerName:
          dotIndex === -1 || currentDeviceStratumUser.substring(dotIndex + 1).length === 0
            ? device.info.hostname
            : currentDeviceStratumUser.substring(dotIndex + 1),
        stratumUser:
          dotIndex === -1
            ? currentDeviceStratumUser
            : currentDeviceStratumUser.substring(0, dotIndex),
      });
    }
  }, []);

  const handleSaveOrSaveAndRestartDeviceSettings = useCallback(
    async (shouldRestart: boolean) => {
      try {
        const deviceToUpdate = selectedPreset
          ? {
              ...device,
              presetUuid: selectedPreset.uuid,
              info: {
                ...device.info,
                stratumUser: `${selectedPreset.configuration.stratumUser}.${stratumUser.workerName}`,
              },
            }
          : device;

        const {
          data: { data: updatedDestDevice },
        } = await axios.patch<{ message: string; data: Device }>(
          `/api/devices/${deviceToUpdate.mac}/system`,
          deviceToUpdate
        );
        const {
          data: { data: updatedDevice },
        } = await axios.patch<{ message: string; data: Device }>(
          `/api/devices/imprint/${device.mac}`,
          {
            device: updatedDestDevice,
          }
        );

        if (updatedDevice) {
          setDevice(updatedDevice);

          setAlert({
            status: AlertStatus.SUCCESS,
            title: "Save Successful",
            message: `The settings for device ${device.mac} have been successfully saved.`,
          });
          onOpenAlert(); // Aprire l'alert per mostrare il messaggio di successo

          // Se il salvataggio è andato a buon fine e serve il restart, esegui subito il restart
          if (shouldRestart) {
            handleRestartDevice(true);
          }
        }
      } catch (error) {
        let errorMessage = "An error occurred while saving the device settings.";

        if (axios.isAxiosError(error)) {
          errorMessage = error.response?.data?.message || error.message;
        }

        setAlert({
          status: AlertStatus.ERROR,
          title: "Save Failed",
          message: `${errorMessage} Please try again.`,
        });
        onOpenAlert(); // Aprire l'alert per mostrare il messaggio di errore
      }
    },
    [device, stratumUser.workerName]
  );

  const validatePercentage = (value: string) => {
    return parseInt(value) <= 100 && parseInt(value) >= 0;
  };

  const validateFieldByName = (name: string, value: string) => {
    switch (name) {
      case "stratumURL":
        return validateDomain(value, { allowIP: true });
      case "stratumPort": {
        const numericRegex = /^\d+$/;
        return validateTCPPort(numericRegex.test(value) ? Number(value) : -1);
      }
      case "stratumUser":
        // return validateBitcoinAddress(value);
        return !value.includes(".");
      case "fanspeed":
        return validatePercentage(value);
      case "workerName": {
        const regex = /^[a-zA-Z0-9]+$/;
        return regex.test(value);
      }
      default:
        return true;
    }
  };

  const validateField = useCallback(
    (name: string, value: string) => {
      const label =
        value === ""
          ? `${name} is required.`
          : validateFieldByName(name, value)
          ? ""
          : `${name} is not correct.`;

      setDeviceError((prevDevice: any) => ({
        ...prevDevice,
        [name]: label,
      }));
    },
    [validateFieldByName]
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;

      validateField(name, value);

      const isCheckbox = type === "checkbox";

      const updatedDevice = {
        ...device,
        info: {
          ...device.info,
          [name]: isCheckbox
            ? (e.target as HTMLInputElement).checked
              ? 1
              : 0
            : name === "stratumPort"
            ? parseInt(value.replace(/\D/g, ""), 10) || 0 // Mantieni solo numeri nell'input
            : ["wifiPass", "stratumPassword"].includes(name)
            ? value
            : parseInt(value) || value,
        },
      };

      setDevice(updatedDevice);
    },
    [device, validateField]
  );

  const handleChangeOnStratumUser = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;

      validateField(name, value);

      const editedStratumUser = { ...stratumUser, [name]: value };
      setStratumUser(editedStratumUser);

      const updatedDevice = {
        ...device,
        info: {
          ...device.info,
          stratumUser: `${editedStratumUser.stratumUser}.${editedStratumUser.workerName}`,
        },
      };

      setDevice(updatedDevice);
    },
    [device, stratumUser]
  );

  const handleRadioButtonChange = (value: string) => {
    setIsPresetRadioButtonSelected(value === RadioButtonStatus.PRESET ? true : false);

    if (value === RadioButtonStatus.CUSTOM) {
      if (device.presetUuid) {
        setDevice({
          ...device,
          presetUuid: null,
        });
      }
      return;
    }

    if (value === RadioButtonStatus.PRESET && selectedPreset) {
      setDevice({
        ...device,
        presetUuid: selectedPreset.uuid,
        info: {
          ...device.info,
          stratumUser: `${selectedPreset.configuration.stratumUser}.${stratumUser.workerName}`,
        },
      });
    }
  };

  const handleRestartDevice = useCallback(
    async (hasSaveBeenPerformedAlso: boolean) => {
      const handleRestart = (mac: string) => axios.post(`/api/devices/${mac}/system/restart`);

      try {
        await handleRestart(device.mac);

        setAlert({
          status: AlertStatus.SUCCESS,
          title: `${hasSaveBeenPerformedAlso ? "Save and " : ""}Restart went successfully`,
          message: `The device has been ${
            hasSaveBeenPerformedAlso ? "saved and " : ""
          }restarted successfully. ${
            hasSaveBeenPerformedAlso
              ? "The new settings have been applied, and the miner is back online."
              : ""
          }`,
        });

        onOpenAlert();
      } catch (error) {
        let errorMessage = "An error occurred while attempting to restart the device.";

        if (axios.isAxiosError(error)) {
          errorMessage = error.response?.data?.message || error.message;
        }

        setAlert({
          status: AlertStatus.ERROR,
          title: "Restart Failed",
          message: `${errorMessage} Please try again or contact support if the issue persists.`,
        });
        onOpenAlert();
        setIsRestartModalOpen(false);
      }
    },
    [device.mac, onOpenAlert, setAlert]
  );

  const handleChangeOnSelectPreset = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const preset = presets.find((p) => p.uuid === e.target.value);
      if (preset) {
        setSelectedPreset(preset);

        const updatedDevice = {
          ...device,
          presetUuid: preset.uuid,
          info: {
            ...device.info,
            stratumUser: `${preset.configuration.stratumUser}.${stratumUser.workerName}`,
          },
        };

        setDevice(updatedDevice);
      }
    },
    [presets]
  );

  useEffect(() => {
    const listener = (e: Device) => {
      setDevice((prevDevice) => {
        if (!prevDevice || prevDevice.mac !== e.mac) return prevDevice;
        // Solo aggiorna i dati se l'accordion è aperto
        if (isAccordionOpen) {
          return { ...prevDevice, tracing: e.tracing }; // Esegui solo l'aggiornamento della proprietà di interesse
        }
        return {
          ...e,
          info: {
            ...e.info,
            frequencyOptions:
              Array.isArray((e.info as any)?.frequencyOptions) &&
              (e.info as any).frequencyOptions.length > 0
                ? (e.info as any).frequencyOptions
                : (prevDevice.info as any)?.frequencyOptions || [],
            coreVoltageOptions:
              Array.isArray((e.info as any)?.coreVoltageOptions) &&
              (e.info as any).coreVoltageOptions.length > 0
                ? (e.info as any).coreVoltageOptions
                : (prevDevice.info as any)?.coreVoltageOptions || [],
          },
        };
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
  }, [isAccordionOpen, isConnected, socket]);

  const hasEmptyFields = (obj: any): boolean => {
    for (const key in obj) {
      if (typeof obj[key] === "object" && obj[key] !== null) {
        if (hasEmptyFields(obj[key])) return true; // Ricorsione per oggetti annidati
      } else if (obj[key] === "") {
        return true;
      }
    }
    return false;
  };

  const hasErrorFields = (obj: Record<string, string>): boolean => {
    for (const [key, value] of Object.entries(obj)) {
      if (value === "") continue;

      if (key === "fanspeed" && device.info.autofanspeed !== 0) {
        continue;
      }

      return true;
    }

    return false;
  };

  const isDeviceValid = useCallback(() => {
    return hasEmptyFields(device) || hasErrorFields(deviceError);
  }, [device, deviceError]);

  const handleSaveAndRestartModalClose = async (value: string) => {
    // Funzione di callback per gestire il valore restituito dalla modale
    if (value !== "") {
      const shouldRestart = value === RadioButtonValues.SAVE_AND_RESTART ? true : false;
      await handleSaveOrSaveAndRestartDeviceSettings(shouldRestart);
    }
    setIsSaveAndRestartModalOpen(false);
  };

  const handleRestartModalClose = useCallback(async (value: boolean) => {
    // Funzione di callback per gestire il valore restituito dalla modale
    if (value) {
      handleRestartDevice(false);
    }
    setIsRestartModalOpen(false);
  }, []);

  const handleRestartOpenModal = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsRestartModalOpen(true);
  };

  return (
    <>
      <summary className="flex cursor-pointer items-center justify-between gap-4 bg-card px-4 py-3 hover:bg-muted">
        <div className="flex flex-[8] items-center gap-3">
          <div className="hidden tablet:block" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              className="h-4 w-4 rounded-none border border-input bg-background accent-primary"
              checked={Boolean(checkedItems.find((d) => d.mac === device.mac)?.value)}
              onChange={(e) => handleCheckboxChange(device.mac, e.target.checked)}
            />
          </div>
          <span className="text-primary">▾</span>
          <div className="flex items-center gap-2">
            <span className="font-accent text-sm font-normal capitalize">{device.info.hostname}</span>
            <span className="hidden tablet:inline text-sm text-muted-foreground">-</span>
            <span className="hidden tablet:inline">
              <Link
                href={`http://${device.ip}`}
                isExternal={true}
                label={device.ip}
                fontSize={"14px"}
                fontWeight={400}
                textDecoration="underline"
                isDisabled={device.tracing ? false : true}
                fontFamily={"accent"}
                className="text-muted-foreground"
              />
            </span>
          </div>
        </div>

        <div className="flex flex-[5] items-center justify-between gap-4 tablet:justify-end">
          <DeviceStatusBadge status={device.tracing ? "online" : "offline"} />
          <button
            type="button"
            className="hidden items-center gap-2 font-accent text-sm font-medium uppercase text-foreground underline tablet:inline-flex"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleRestartOpenModal(e);
            }}
          >
            <RestartIcon color="currentColor" />
            Restart
          </button>
          <div className="tablet:hidden" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              className="h-4 w-4 rounded-none border border-input bg-background accent-primary"
              checked={Boolean(checkedItems.find((d) => d.mac === device.mac)?.value)}
              onChange={(e) => handleCheckboxChange(device.mac, e.target.checked)}
            />
          </div>
        </div>
      </summary>

      <div className="border-t border-border bg-card p-4">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <p className="font-heading text-sm font-bold uppercase">General</p>
            <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
              <Input
                label="Hostname"
                name="hostname"
                id={`${device.mac}-hostname`}
                placeholder="hostname"
                defaultValue={device.info.hostname}
                onChange={handleChange}
                error={deviceError.hostname}
              />
              <Input
                label="Worker Name"
                name="workerName"
                id={`${device.mac}-workerName`}
                placeholder="worker name"
                defaultValue={stratumUser.workerName}
                onChange={handleChangeOnStratumUser}
                error={deviceError.workerName}
              />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <p className="font-heading text-sm font-bold uppercase">Hardware settings</p>
            <div className="flex flex-col gap-4 desktop:flex-row">
              <div className="flex flex-col gap-4 tablet:flex-row desktop:flex-[2]">
                <Select
                  id={`${device.mac}-frequency`}
                  label="Frequency"
                  name="frequency"
                  onChange={handleChange}
                  value={device.info.frequency}
                  defaultValue={device.info.frequency}
                  optionValues={device.info.frequencyOptions}
                  allowCustom={true}
                />
                <Select
                  id={`${device.mac}-coreVoltage`}
                  label="Core Voltage"
                  name="coreVoltage"
                  onChange={handleChange}
                  value={device.info.coreVoltage}
                  defaultValue={device.info.coreVoltage}
                  optionValues={device.info.coreVoltageOptions}
                  allowCustom={true}
                />
              </div>

              <div className="flex flex-col gap-4 desktop:flex-[3]">
                <p className="font-body text-xs font-semibold uppercase text-muted-foreground">
                  Advanced Hardware Settings
                </p>
                <div className="flex flex-col gap-4 tablet:flex-row tablet:flex-wrap tablet:items-center">
                  <Checkbox
                    id={`${device.mac}-flipscreen`}
                    name="flipscreen"
                    label="Flip Screen"
                    defaultChecked={device.info.flipscreen === 1}
                    onChange={handleChange}
                  />
                  <Checkbox
                    id={`${device.mac}-invertfanpolarity`}
                    name="invertfanpolarity"
                    label="Invert Fan Polarity"
                    defaultChecked={device.info.invertfanpolarity === 1}
                    onChange={handleChange}
                  />
                  <Checkbox
                    id={`${device.mac}-autofanspeed`}
                    name="autofanspeed"
                    label="Automatic Fan Control"
                    defaultChecked={device.info.autofanspeed === 1}
                    onChange={handleChange}
                  />
                  <div className="w-full tablet:max-w-[200px]">
                    <Input
                      name="fanspeed"
                      id={`${device.mac}-fanspeed`}
                      placeholder=""
                      type="number"
                      defaultValue={device.info.fanspeed || 0}
                      onChange={handleChange}
                      isDisabled={device.info.autofanspeed === 1}
                      rightAddon={"%"}
                      error={deviceError.fanspeed}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <p className="font-heading text-sm font-bold uppercase">Pool settings</p>

            <div className="flex flex-wrap gap-6">
              <RadioButton
                id={`${device.mac}-${RadioButtonStatus.PRESET}`}
                name={`${device.mac}-pool-mode`}
                value={RadioButtonStatus.PRESET}
                label="Preset"
                disabled={presets.length === 0}
                checked={isPresetRadioButtonSelected}
                onChange={handleRadioButtonChange}
              />
              <RadioButton
                id={`${device.mac}-${RadioButtonStatus.CUSTOM}`}
                name={`${device.mac}-pool-mode`}
                value={RadioButtonStatus.CUSTOM}
                label="Custom"
                checked={!isPresetRadioButtonSelected}
                onChange={handleRadioButtonChange}
              />
            </div>

            {isPresetRadioButtonSelected ? (
              <div className="flex flex-col gap-4">
                {selectedPreset ? (
                  <>
                    <Select
                      id={`${device.mac}-preset`}
                      label="Select preset"
                      name="preset"
                      onChange={(val) => handleChangeOnSelectPreset(val)}
                      value={selectedPreset.uuid}
                      optionValues={presets.map((preset) => ({
                        value: preset.uuid,
                        label: preset.name,
                      }))}
                    />
                    <div className="flex flex-col gap-4 tablet:flex-row">
                      <div className="flex-1">
                        <Input
                          isDisabled={true}
                          type="text"
                          label="Stratum URL"
                          name="stratumURL"
                          id={`${selectedPreset.uuid}-stratumUrl`}
                          defaultValue={selectedPreset.configuration.stratumURL}
                        />
                      </div>
                      <div className="flex-1">
                        <Input
                          isDisabled={true}
                          type="number"
                          label="Stratum Port"
                          name="stratumPort"
                          id={`${selectedPreset.uuid}-stratumPort`}
                          defaultValue={selectedPreset.configuration.stratumPort}
                        />
                      </div>
                      <div className="flex-[2]">
                        <Input
                          isDisabled={true}
                          type="text"
                          label="Stratum User"
                          name="stratumUser"
                          id={`${selectedPreset.uuid}-stratumUser`}
                          defaultValue={selectedPreset.configuration.stratumUser}
                          rightAddon={`.${stratumUser.workerName}`}
                        />
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2 desktop:grid-cols-6">
                <div className="desktop:col-span-2">
                  <Input
                    type="text"
                    label="Stratum URL"
                    name="stratumURL"
                    id={`${device.mac}-stratumUrl`}
                    placeholder="Add your stratum URL"
                    defaultValue={device.info.stratumURL}
                    onChange={handleChange}
                    error={deviceError.stratumURL}
                  />
                </div>
                <div className="desktop:col-span-2">
                  <Input
                    type="number"
                    label="Stratum Port"
                    name="stratumPort"
                    id={`${device.mac}-stratumPort`}
                    placeholder="Add your stratum port"
                    defaultValue={device.info.stratumPort}
                    onChange={handleChange}
                    error={deviceError.stratumPort}
                  />
                </div>
                <div className="desktop:col-span-2">
                  <Input
                    type="text"
                    label="Stratum User"
                    name="stratumUser"
                    id={`${device.mac}-stratumUser`}
                    placeholder="Add your stratum user"
                    defaultValue={stratumUser.stratumUser}
                    onChange={handleChangeOnStratumUser}
                    rightAddon={`.${stratumUser.workerName}`}
                    error={deviceError.stratumUser}
                  />
                </div>
                <div className="desktop:col-span-2">
                  <Input
                    type="password"
                    label="Stratum Password"
                    name="stratumPassword"
                    id={`${device.mac}-stratumPassword`}
                    placeholder="Add your stratum password"
                    defaultValue={device.info.stratumPassword}
                    error={deviceError.stratumPassword}
                    onChange={handleChange}
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <Button
              variant="primary"
              rightIcon={<ArrowIcon color="currentColor" />}
              onClick={() => setIsSaveAndRestartModalOpen(true)}
              disabled={isDeviceValid()}
              label="Save"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-border bg-muted px-4 py-2 tablet:hidden">
        <div className="flex items-center gap-2 font-accent">
          <span className="text-sm font-medium">IP</span>
          <span className="text-sm font-medium text-muted-foreground">-</span>
          <Link
            href={`http://${device.ip}`}
            isExternal={true}
            label={device.ip}
            fontSize={"14px"}
            fontWeight={400}
            textDecoration="underline"
            isDisabled={device.tracing ? false : true}
            fontFamily={"accent"}
            className="text-muted-foreground"
          />
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 font-accent text-sm font-medium capitalize underline"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleRestartOpenModal(e);
          }}
        >
          <RestartIcon color="currentColor" />
          Restart
        </button>
      </div>
      <RestartModal isOpen={isRestartModalOpen} onClose={handleRestartModalClose} />
      <SaveAndRestartModal
        isOpen={isSaveAndRestartModalOpen}
        onClose={handleSaveAndRestartModalClose}
      />
    </>
  );
};
