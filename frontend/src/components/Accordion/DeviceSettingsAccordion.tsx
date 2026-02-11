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
import type { DiscoveredMiner, Preset } from "@pluto/interfaces";
import type { MinerConfigModelInput } from "@pluto/pyasic-bridge-client";
import { validateDomain, validateTCPPort } from "@pluto/utils";
import {
  getHostname,
  getStratumUrl,
  getStratumPort,
  getStratumUser,
  getStratumPassword,
} from "@/utils/minerDataHelpers";
import {
  buildMinerConfigFromFormWithModel,
  parseStratumUrl,
  type StratumFormState,
} from "@/utils/deviceConfigHelpers";
import { MinerSettingsFactory, type MinerSettingsModel } from "@/utils/minerSettingsFactory";
import axios from "axios";
import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { AlertInterface, AlertStatus } from "../Alert/interfaces";
import { DeviceStatusBadge } from "../Badge";
import Button from "../Button/Button";
import { ArrowIcon, ArrowRightUpIcon } from "../icons/ArrowIcon";
import { RestartIcon } from "../icons/RestartIcon";
import { Input } from "../Input/Input";
import Link from "../Link/Link";
import { SaveAndRestartModal } from "../Modal";
import { RestartModal } from "../Modal/RestartModal";
import { RadioButtonValues } from "../Modal/SaveAndRestartModal";
import { SelectPresetModal } from "../Modal/SelectPresetModal";
import { RadioButton } from "../RadioButton";
import { ExtraConfigFieldRenderer } from "@/components/ExtraConfigFields";
import { getOrderedExtraConfigFields } from "@/utils/schemaFormHelpers";
import { Select } from "../Select/Select";

interface DeviceSettingsAccordionProps {
  fetchedDevices: DiscoveredMiner[] | undefined;
  alert?: AlertInterface;
  setAlert: React.Dispatch<React.SetStateAction<AlertInterface | undefined>>;
  onOpenAlert: () => void;
}

interface AccordionItemProps {
  device: DiscoveredMiner;
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

type FanModeFormState = {
  mode: string;
  speed?: number;
  minimum_fans?: number;
};

export const DeviceSettingsAccordion: React.FC<DeviceSettingsAccordionProps> = ({
  fetchedDevices,
  alert,
  setAlert,
  onOpenAlert,
}) => {
  const { isOpen: isOpenModal, onOpen: onOpenModal, onClose: onCloseModal } = useDisclosure();

  const [isSelectPoolPresetOpen, setIsSelectPoolPresetModalOpen] = useState(false);

  const [devices, setDevices] = useState<DiscoveredMiner[]>(fetchedDevices || []);

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
    [checkedFetchedItems, onCloseModal, onOpenAlert, setAlert]
  );

  const handleCloseSuccessfully = async (uuid: string) => {
    setIsSelectPoolPresetModalOpen(false);

    const preset = presets.find((p) => p.uuid === uuid);
    if (!preset) {
      setAlert({
        status: AlertStatus.ERROR,
        title: "Preset Not Found",
        message: "The selected preset could not be found.",
      });
      onOpenAlert();
      return;
    }

    const handleSavePreset = (mac: string, config: MinerConfigModelInput) =>
      axios.patch<{ message: string; data: DiscoveredMiner }>(`/api/devices/${mac}/system`, config);

    const handleChangesOnImprintedDevices = (mac: string, d: DiscoveredMiner) =>
      axios.patch<{ message: string; data: DiscoveredMiner }>(`/api/devices/imprint/${mac}`, {
        device: d,
      });

    try {
      if (devices) {
        await Promise.all(
          devices.reduce((acc: Array<Promise<DiscoveredMiner>>, device: DiscoveredMiner) => {
            const isChecked = checkedFetchedItems.some(
              (item) => item.mac === device.mac && item.value === true
            );
            if (isChecked) {
              acc.push(
                (async () => {
                  // Build MinerConfigModelInput from preset, merging with worker name
                  const presetConfig = preset.configuration as MinerConfigModelInput;
                  const poolConfig = presetConfig.pools?.groups?.[0]?.pools?.[0];
                  
                  // Get worker name from device hostname
                  const workerName = getHostname(device.minerData);
                  
                  // Build config with worker name appended to user
                  const config: MinerConfigModelInput = {
                    pools: {
                      groups: [
                        {
                          pools: [
                            {
                              url: poolConfig?.url || "",
                              user: poolConfig?.user ? `${poolConfig.user}.${workerName}` : workerName,
                              password: poolConfig?.password || "",
                            },
                          ],
                        },
                      ],
                    },
                  };

                  const {
                    data: { data: updatedDestDevice },
                  } = await handleSavePreset(device.mac, config);

                  const updatedDeviceWithPreset: DiscoveredMiner = {
                    ...updatedDestDevice,
                    presetUuid: uuid,
                  };

                  const {
                    data: { data: updatedDevice },
                  } = await handleChangesOnImprintedDevices(
                    updatedDestDevice.mac,
                    updatedDeviceWithPreset
                  );

                  return updatedDevice || device;
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
	        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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

	          <div className="flex w-full flex-wrap items-center justify-between gap-4 sm:justify-end md:w-auto md:flex-1 md:justify-end">
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
          <div className="hidden items-center justify-between gap-4 border-b border-border bg-muted px-4 py-3 md:flex">
            <div className="flex flex-[8] items-center gap-3">
              <div className="hidden w-4 md:block" aria-hidden="true" />
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
              <span className="hidden w-24 shrink-0 md:inline-flex" aria-hidden="true" />
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
  const [device, setDevice] = useState<DiscoveredMiner>(deviceInfo);

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

  const [fanModeState, setFanModeState] = useState<FanModeFormState>(() => {
    const fanMode = (deviceInfo.minerData as any)?.config?.fan_mode as
      | { mode?: string; speed?: number; minimum_fans?: number }
      | undefined;
    return {
      mode: fanMode?.mode ?? "normal",
      speed: typeof fanMode?.speed === "number" ? fanMode.speed : undefined,
      minimum_fans:
        typeof fanMode?.minimum_fans === "number" ? fanMode.minimum_fans : undefined,
    };
  });

  // Form state for stratum/pool config
  const [stratumFormState, setStratumFormState] = useState<StratumFormState>(() => ({
    stratumURL: getStratumUrl(deviceInfo.minerData),
    stratumPort: getStratumPort(deviceInfo.minerData),
    stratumUser: getStratumUser(deviceInfo.minerData),
    stratumPassword: getStratumPassword(deviceInfo.minerData),
    workerName: getHostname(deviceInfo.minerData),
  }));

  // Miner-specific settings model (always returns a model, uses default for unknown types)
  const [minerSettingsModel, setMinerSettingsModel] = useState<MinerSettingsModel>(() =>
    MinerSettingsFactory.createModelForMiner(deviceInfo)
  );

  const { isConnected, socket } = useSocket();

  useEffect(() => {
    if (presets && deviceInfo) {
      let foundPreset = presets.find((p) => p.uuid === deviceInfo?.presetUuid);

      setSelectedPreset(foundPreset || presets[0]);
    }
  }, [presets, deviceInfo]);

  useEffect(() => {
    if (device) {
      const currentDeviceStratumUser = getStratumUser(device.minerData);
      const hostname = getHostname(device.minerData);
      
      // Worker name defaults to hostname if not found in stratumUser
      setStratumUser({
        workerName: hostname,
        stratumUser: currentDeviceStratumUser,
      });

      // Update form state from device.minerData
      setStratumFormState({
        stratumURL: getStratumUrl(device.minerData),
        stratumPort: getStratumPort(device.minerData),
        stratumUser: currentDeviceStratumUser,
        stratumPassword: getStratumPassword(device.minerData),
        workerName: hostname,
      });

      const fanMode = (device.minerData as any)?.config?.fan_mode as
        | { mode?: string; speed?: number; minimum_fans?: number }
        | undefined;
      setFanModeState({
        mode: fanMode?.mode ?? "normal",
        speed: typeof fanMode?.speed === "number" ? fanMode.speed : undefined,
        minimum_fans:
          typeof fanMode?.minimum_fans === "number" ? fanMode.minimum_fans : undefined,
      });

      // Update miner-specific settings model
      const model = MinerSettingsFactory.createModelForMiner(device);
      setMinerSettingsModel(model);
    }
  }, [device]);

  const handleSaveOrSaveAndRestartDeviceSettings = useCallback(
    async (shouldRestart: boolean) => {
      try {
        // Build MinerConfigModelInput from form state
        let config: MinerConfigModelInput;

        if (selectedPreset && isPresetRadioButtonSelected) {
          // Use preset configuration, merge with worker name and miner-specific extra_config
          const presetConfig = selectedPreset.configuration as MinerConfigModelInput;
          const poolConfig = presetConfig.pools?.groups?.[0]?.pools?.[0];
          const modelExtraConfig = minerSettingsModel.toExtraConfig();
          
          config = {
            pools: {
              groups: [
                {
                  quota: 1,
                  pools: [
                    {
                      url: poolConfig?.url || "",
                      user: poolConfig?.user ? `${poolConfig.user}.${stratumFormState.workerName}` : stratumFormState.workerName,
                      password: poolConfig?.password || "",
                    },
                  ],
                },
              ],
            },
            // Merge extra_config from preset and miner-specific model
            extra_config: {
              ...presetConfig.extra_config,
              ...modelExtraConfig,
            },
          };
        } else {
          // Build from form state using miner-specific model
          // minerSettingsModel is always defined (default model for unknown types)
          const existingExtraConfig = device.minerData.config?.extra_config as
            | Record<string, unknown>
            | null
            | undefined;
          config = buildMinerConfigFromFormWithModel(stratumFormState, minerSettingsModel, existingExtraConfig);
        }

        // Attach fan_mode from form state (if a mode is selected)
        if (fanModeState.mode) {
          const fanMode: any = { mode: fanModeState.mode };
          if (fanModeState.mode === "manual" && typeof fanModeState.speed === "number") {
            fanMode.speed = fanModeState.speed;
          }
          if (typeof fanModeState.minimum_fans === "number") {
            fanMode.minimum_fans = fanModeState.minimum_fans;
          }
          config.fan_mode = fanMode;
        }

        // Send MinerConfigModelInput to backend
        const {
          data: { data: updatedDestDevice },
        } = await axios.patch<{ message: string; data: DiscoveredMiner }>(
          `/api/devices/${device.mac}/system`,
          config
        );

        // Update device with presetUuid if preset was selected
        const updatedDeviceWithPreset: DiscoveredMiner = {
          ...updatedDestDevice,
          presetUuid: selectedPreset && isPresetRadioButtonSelected ? selectedPreset.uuid : device.presetUuid,
        };

        const {
          data: { data: updatedDevice },
        } = await axios.patch<{ message: string; data: DiscoveredMiner }>(
          `/api/devices/imprint/${device.mac}`,
          {
            device: updatedDeviceWithPreset,
          }
        );

        if (updatedDevice) {
          setDevice(updatedDevice);

          setAlert({
            status: AlertStatus.SUCCESS,
            title: "Save Successful",
            message: `The settings for device ${device.mac} have been successfully saved.`,
          });
          onOpenAlert();

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
        onOpenAlert();
      }
    },
    // handleRestartDevice is defined later but is stable (useCallback)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      device,
      onOpenAlert,
      selectedPreset,
      setAlert,
      isPresetRadioButtonSelected,
      stratumFormState,
      minerSettingsModel,
      fanModeState,
    ]
  );

  const validatePercentage = (value: string) => {
    return parseInt(value) <= 100 && parseInt(value) >= 0;
  };

  const validateFieldByName = useCallback((name: string, value: string) => {
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
  }, []);

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

      const numericFields = new Set([
        "stratumPort",
        "fanspeed",
        "autoscreenoff",
        "overheat_temp",
      ]);

      const nextValue = (() => {
        if (isCheckbox) {
          return (e.target as HTMLInputElement).checked ? 1 : 0;
        }

        // Keep string fields as strings. The previous implementation used
        // `parseInt(value) || value`, which turns IPs like "192.168.0.252" into
        // the number 192 (because parseInt stops at the first dot).
        if (!numericFields.has(name)) {
          return value;
        }

        const raw = name === "stratumPort" ? value.replace(/\D/g, "") : value;
        const parsed = parseInt(raw, 10);
        return Number.isNaN(parsed) ? value : parsed;
      })();

      // Update form state based on field name
      if (name === "stratumURL" || name === "stratumPort" || name === "stratumPassword") {
        setStratumFormState((prev) => ({
          ...prev,
          [name]: nextValue,
        }));
      } else if (minerSettingsModel.getExtraConfigFields().includes(name)) {
        minerSettingsModel.updateField(name, typeof nextValue === "number" ? nextValue : nextValue);
        setMinerSettingsModel({ ...minerSettingsModel });
      } else if (name === "hostname") {
        // Hostname is stored in minerData, but we can update it in form state for workerName
        setStratumFormState((prev) => ({
          ...prev,
          workerName: typeof nextValue === "string" ? nextValue : prev.workerName,
        }));
      }
    },
    [validateField, minerSettingsModel]
  );

  const handleChangeOnStratumUser = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;

      validateField(name, value);

      if (name === "stratumUser") {
        setStratumFormState((prev) => ({
          ...prev,
          stratumUser: value,
        }));
        setStratumUser((prev) => ({
          ...prev,
          stratumUser: value,
        }));
      } else if (name === "workerName") {
        setStratumFormState((prev) => ({
          ...prev,
          workerName: value,
        }));
        setStratumUser((prev) => ({
          ...prev,
          workerName: value,
        }));
      }
    },
    [validateField]
  );

  const handleExtraConfigChange = useCallback(
    (fieldName: string, value: unknown) => {
      minerSettingsModel.updateField(fieldName, value);
      setMinerSettingsModel({ ...minerSettingsModel });
    },
    [minerSettingsModel]
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
      const presetConfig = selectedPreset.configuration as MinerConfigModelInput;
      const poolConfig = presetConfig.pools?.groups?.[0]?.pools?.[0];
      
      // Update form state with preset values
      if (poolConfig) {
        const parsedUrl = parseStratumUrl(poolConfig.url || "");
        setStratumFormState((prev) => ({
          ...prev,
          stratumURL: parsedUrl.url,
          stratumPort: parsedUrl.port,
          stratumUser: poolConfig.user || "",
          stratumPassword: poolConfig.password || "",
        }));
      }

      setDevice({
        ...device,
        presetUuid: selectedPreset.uuid,
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

        const presetConfig = preset.configuration as MinerConfigModelInput;
        const poolConfig = presetConfig.pools?.groups?.[0]?.pools?.[0];
        
        // Update form state with preset values
        if (poolConfig) {
          const parsedUrl = parseStratumUrl(poolConfig.url || "");
          setStratumFormState((prev) => ({
            ...prev,
            stratumURL: parsedUrl.url,
            stratumPort: parsedUrl.port,
            stratumUser: poolConfig.user || "",
            stratumPassword: poolConfig.password || "",
          }));
        }

        setDevice({
          ...device,
          presetUuid: preset.uuid,
        });
      }
    },
    [device, presets]
  );

  useEffect(() => {
    const listener = (e: DiscoveredMiner) => {
      setDevice((prevDevice) => {
        if (!prevDevice || prevDevice.mac !== e.mac) return prevDevice;
        // Solo aggiorna i dati se l'accordion è aperto
        if (isAccordionOpen) {
          return { ...prevDevice, tracing: e.tracing }; // Esegui solo l'aggiornamento della proprietà di interesse
        }
        // Update device with new minerData, but preserve dropdown options state
        return {
          ...e,
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

  const hasEmptyFields = useCallback((obj: any): boolean => {
    for (const key in obj) {
      if (typeof obj[key] === "object" && obj[key] !== null) {
        if (hasEmptyFields(obj[key])) return true; // Ricorsione per oggetti annidati
      } else if (obj[key] === "") {
        return true;
      }
    }
    return false;
  }, []);

  const hasErrorFields = useCallback(
    (obj: Record<string, string>): boolean => {
      for (const [key, value] of Object.entries(obj)) {
        if (value === "") continue;

        const formState = minerSettingsModel.getFormState();
        if (key === "fanspeed" && (formState as any).autofanspeed !== 0) {
          continue;
        }

        return true;
      }

      return false;
    },
    [minerSettingsModel]
  );

  const isDeviceValid = useCallback(() => {
    // Check if form state has empty required fields
    const hasEmptyStratumFields =
      !stratumFormState.stratumURL ||
      !stratumFormState.stratumUser;
    return hasEmptyStratumFields || hasErrorFields(deviceError);
  }, [stratumFormState, deviceError, hasErrorFields]);

  const handleSaveAndRestartModalClose = async (value: string) => {
    // Funzione di callback per gestire il valore restituito dalla modale
    if (value !== "") {
      const shouldRestart = value === RadioButtonValues.SAVE_AND_RESTART ? true : false;
      await handleSaveOrSaveAndRestartDeviceSettings(shouldRestart);
    }
    setIsSaveAndRestartModalOpen(false);
  };

  const handleRestartModalClose = useCallback(
    async (value: boolean) => {
      // Funzione di callback per gestire il valore restituito dalla modale
      if (value) {
        handleRestartDevice(false);
      }
      setIsRestartModalOpen(false);
    },
    [handleRestartDevice]
  );

  const handleRestartOpenModal = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsRestartModalOpen(true);
  };

  return (
    <>
      <summary className="flex cursor-pointer items-center justify-between gap-4 bg-card px-4 py-3 hover:bg-muted">
        <div className="flex flex-[8] items-center gap-3">
          <div className="hidden md:block" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              className="h-4 w-4 rounded-none border border-input bg-background accent-primary"
              checked={Boolean(checkedItems.find((d) => d.mac === device.mac)?.value)}
              onChange={(e) => handleCheckboxChange(device.mac, e.target.checked)}
            />
          </div>
          <span className="text-primary">▾</span>
          <div className="flex items-center gap-2">
            <span className="font-accent text-sm font-normal capitalize">{getHostname(device.minerData)}</span>
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

        <div className="flex flex-[5] items-center justify-between gap-4 md:justify-end">
          <DeviceStatusBadge status={device.tracing ? "online" : "offline"} />
          <button
            type="button"
            className="hidden items-center gap-2 font-accent text-sm font-medium uppercase text-foreground underline md:inline-flex"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleRestartOpenModal(e);
            }}
          >
            <RestartIcon color="currentColor" />
            Restart
          </button>
          <div className="md:hidden" onClick={(e) => e.stopPropagation()}>
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Hostname"
                name="hostname"
                id={`${device.mac}-hostname`}
                placeholder="hostname"
                defaultValue={getHostname(device.minerData)}
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
            <p className="font-heading text-sm font-bold uppercase">Fan settings</p>
            <div className="grid grid-cols-1 gap-4 tablet:grid-cols-4">
              <Select
                id={`${device.mac}-fanMode`}
                label="Fan Mode"
                name="fanMode"
                value={fanModeState.mode}
                optionValues={[
                  { value: "normal", label: "Normal" },
                  { value: "manual", label: "Manual" },
                  { value: "immersion", label: "Immersion" },
                ]}
                onChange={(e) => {
                  const mode = e.target.value;
                  setFanModeState((prev) => ({
                    ...prev,
                    mode,
                  }));
                }}
              />
              <Input
                label="Fan Speed (%)"
                name="fanSpeed"
                id={`${device.mac}-fanSpeed`}
                type="number"
                value={fanModeState.speed ?? ""}
                onChange={(e) => {
                  const raw = e.target.value;
                  const n = parseInt(raw, 10);
                  setFanModeState((prev) => ({
                    ...prev,
                    speed: Number.isFinite(n) ? n : undefined,
                  }));
                }}
                isDisabled={fanModeState.mode !== "manual"}
                rightAddon="%"
              />
              <Input
                label="Minimum Fans"
                name="minFans"
                id={`${device.mac}-minFans`}
                type="number"
                value={fanModeState.minimum_fans ?? ""}
                onChange={(e) => {
                  const raw = e.target.value;
                  const n = parseInt(raw, 10);
                  setFanModeState((prev) => ({
                    ...prev,
                    minimum_fans: Number.isFinite(n) ? n : undefined,
                  }));
                }}
              />
              {(() => {
                const formState = minerSettingsModel.getFormState() as Record<string, unknown>;
                const hasMinFanSpeed = formState.min_fan_speed !== undefined;
                const schemaProps = (minerSettingsModel.jsonSchema?.properties || {}) as Record<
                  string,
                  Record<string, unknown>
                >;
                if (!hasMinFanSpeed || !schemaProps.min_fan_speed) return null;
                return (
                  <ExtraConfigFieldRenderer
                    fieldName="min_fan_speed"
                    fieldSchema={schemaProps.min_fan_speed}
                    value={formState.min_fan_speed}
                    onChange={handleExtraConfigChange}
                    deviceMac={device.mac}
                    error={deviceError.min_fan_speed}
                  />
                );
              })()}
            </div>
          </div>

          {(() => {
            const minerType = MinerSettingsFactory.normalizeMinerType(device);
            const extraConfigFields = getOrderedExtraConfigFields(
              (minerSettingsModel.jsonSchema || {}) as Record<string, unknown>,
              minerType
            );
            if (extraConfigFields.length === 0) return null;
            const formState = minerSettingsModel.getFormState() as Record<string, unknown>;
            const schemaProps = (minerSettingsModel.jsonSchema?.properties || {}) as Record<
              string,
              Record<string, unknown>
            >;

            const renderField = (fieldName: string) => {
              if (!schemaProps[fieldName]) return null;
              return (
                <ExtraConfigFieldRenderer
                  key={fieldName}
                  fieldName={fieldName}
                  fieldSchema={schemaProps[fieldName]}
                  value={formState[fieldName]}
                  onChange={handleExtraConfigChange}
                  deviceMac={device.mac}
                  error={deviceError[fieldName]}
                />
              );
            };

            const isBitaxeLike = MinerSettingsFactory.isBitaxe(minerType);

            if (isBitaxeLike) {
              return (
                <div className="flex flex-col gap-4">
                  <p className="font-heading text-sm font-bold uppercase">Hardware settings</p>
                  <div className="flex flex-col gap-4">
                    {/* Row 1: selects */}
                    <div className="grid grid-cols-1 gap-4 tablet:grid-cols-4">
                      {renderField("frequency")}
                      {renderField("core_voltage")}
                      {renderField("rotation")}
                      {renderField("display_timeout")}
                    </div>

                    {/* Row 2: checkboxes + stats */}
                    <div className="grid grid-cols-1 gap-4 tablet:grid-cols-4">
                      {renderField("overheat_mode")}
                      {renderField("overclock_enabled")}
                      {renderField("invertscreen")}
                      {renderField("stats_frequency")}
                    </div>
                  </div>
                </div>
              );
            }

            // Generic layout for other miner types: multi-column grid
            return (
              <div className="flex flex-col gap-4">
                <p className="font-heading text-sm font-bold uppercase">Hardware settings</p>
                <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2 desktop:grid-cols-3">
                  {extraConfigFields.map((fieldName) => renderField(fieldName))}
                </div>
              </div>
            );
          })()}

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
                    <div className="flex flex-col gap-4 md:flex-row">
                      <div className="flex-1">
                        <Input
                          isDisabled={true}
                          type="text"
                          label="Pool URL"
                          name="stratumURL"
                          id={`${selectedPreset.uuid}-stratumUrl`}
                          defaultValue={
                            (selectedPreset.configuration as MinerConfigModelInput).pools?.groups?.[0]?.pools?.[0]
                              ?.url || ""
                          }
                        />
                      </div>
                      <div className="flex-1">
                        <Input
                          isDisabled={true}
                          type="number"
                          label="Pool Port"
                          name="stratumPort"
                          id={`${selectedPreset.uuid}-stratumPort`}
                          defaultValue={
                            getStratumPort({
                              config: { pools: (selectedPreset.configuration as MinerConfigModelInput).pools },
                            } as any) || undefined
                          }
                        />
                      </div>
                      <div className="flex-[2]">
                        <Input
                          isDisabled={true}
                          type="text"
                          label="Pool User"
                          name="stratumUser"
                          id={`${selectedPreset.uuid}-stratumUser`}
                          defaultValue={
                            (selectedPreset.configuration as MinerConfigModelInput).pools?.groups?.[0]?.pools?.[0]
                              ?.user || ""
                          }
                          rightAddon={`.${stratumFormState.workerName}`}
                        />
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
                <div className="xl:col-span-2">
                  <Input
                    type="text"
                    label="Pool URL"
                    name="stratumURL"
                    id={`${device.mac}-stratumUrl`}
                    placeholder="Add your pool URL"
                    defaultValue={stratumFormState.stratumURL}
                    onChange={handleChange}
                    error={deviceError.stratumURL}
                  />
                </div>
                <div className="xl:col-span-2">
                  <Input
                    type="number"
                    label="Pool Port"
                    name="stratumPort"
                    id={`${device.mac}-stratumPort`}
                    placeholder="Add your pool port"
                    defaultValue={stratumFormState.stratumPort}
                    onChange={handleChange}
                    error={deviceError.stratumPort}
                  />
                </div>
                <div className="xl:col-span-2">
                  <Input
                    type="text"
                    label="Pool User"
                    name="stratumUser"
                    id={`${device.mac}-stratumUser`}
                    placeholder="Add your pool user"
                    defaultValue={stratumFormState.stratumUser}
                    onChange={handleChangeOnStratumUser}
                    rightAddon={`.${stratumFormState.workerName}`}
                    error={deviceError.stratumUser}
                  />
                </div>
                <div className="xl:col-span-2">
                  <Input
                    type="password"
                    label="Pool Password"
                    name="stratumPassword"
                    id={`${device.mac}-stratumPassword`}
                    placeholder="Add your pool password"
                    defaultValue={stratumFormState.stratumPassword}
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

      <div className="flex items-center justify-between gap-4 border-t border-border bg-muted px-4 py-2 md:hidden">
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
