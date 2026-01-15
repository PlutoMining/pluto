"use client";
/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import Alert from "@/components/Alert/Alert";
import { AlertInterface, AlertStatus } from "@/components/Alert/interfaces";
import Button from "@/components/Button/Button";
import { Input } from "@/components/Input/Input";
import { useDisclosure } from "@/hooks/useDisclosure";
import { Preset } from "@pluto/interfaces";
import { validateDomain, validateTCPPort } from "@pluto/utils";
import axios from "axios";
import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";

export const PresetEditor = ({
  presetId,
  onCloseModal,
  onCloseSuccessfullyModal,
}: {
  presetId?: string;
  onCloseModal: () => void;
  onCloseSuccessfullyModal: () => void;
}) => {
  const {
    isOpen: isOpenAlert,
    onOpen: onOpenAlert,
    onClose: onCloseAlert,
  } = useDisclosure({ defaultIsOpen: false });

  const [alert, setAlert] = useState<AlertInterface>();
  const [isSaveLoading, setIsSaveLoading] = useState<boolean>(false);

  const [presetErrors, setPresetErrors] = useState<Partial<Preset>>({
    name: "",
    configuration: {
      stratumURL: "",
      stratumPort: "",
      stratumUser: "",
      stratumPassword: "",
    },
  });

  const [preset, setPreset] = useState<Partial<Preset>>({
    uuid: presetId,
    name: "",
    configuration: {
      stratumURL: "",
      stratumPort: "",
      stratumUser: "",
      stratumPassword: "",
    },
  });

  const [presets, setPresets] = useState<Preset[]>();

  // Carica il preset se un presetId è fornito
  useEffect(() => {
    if (preset.uuid) {
      fetchPreset();
    }
  }, [preset.uuid]);

  const fetchPreset = async () => {
    try {
      const response = await fetch("/api/presets");
      if (response.ok) {
        const data: { data: Preset[] } = await response.json();
        setPresets(data.data);
        const newData = data.data.find((p: { uuid: string }) => p.uuid === preset.uuid);
        if (newData) {
          setPreset((prevPreset) => ({
            ...prevPreset,
            ...newData,
            name: "",
            configuration: {
              ...prevPreset.configuration,
              ...newData.configuration,
            },
          }));
        }
      } else {
        console.error("Failed to fetch presets");
      }
    } catch (error) {
      console.error("Error fetching presets", error);
    }
  };

  const validateFieldByName = (name: string, value: string) => {
    switch (name) {
      case "stratumURL":
        return validateDomain(value, { allowIP: true });
      case "stratumPort":
        const numericRegex = /^\d+$/;
        return validateTCPPort(numericRegex.test(value) ? Number(value) : -1);
      case "stratumUser":
        // return validateBitcoinAddress(value);
        return !value.includes(".");
      default:
        return true;
    }
  };

  const validateField = (name: string, value: string) => {
    let label =
      value === ""
        ? `${name} is required.`
        : validateFieldByName(name, value)
        ? ""
        : `${name} is not correct.`;

    if (name === "presetName") {
      const preset = presets?.find((p) => p.name === value);
      if (preset) {
        label = `A preset called "${preset.name}" already exists.`;
      }
      setPresetErrors((prevPreset) => ({
        ...prevPreset,
        name: label,
      }));
    } else {
      setPresetErrors((prevPreset) => ({
        ...prevPreset,
        configuration: {
          ...prevPreset.configuration,
          [name]: label,
        },
      }));
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    validateField(name, value);

    if (name === "presetName") {
      setPreset((prevPreset) => ({
        ...prevPreset,
        name: value,
      }));
    } else {
      setPreset((prevPreset) => ({
        ...prevPreset,
        configuration: {
          ...prevPreset.configuration,
          [name]: value,
        },
      }));
    }
  };

  const handleSavePreset = useCallback(() => {
    const uuid = uuidv4();
    const updatedPreset = {
      ...preset,
      uuid,
    };

    // console.log(updatedPreset);

    setIsSaveLoading(true);
    const promise = axios.post("/api/presets", updatedPreset);

    promise
      .then(() => {
        onCloseSuccessfullyModal();
      })
      .catch((error) => {
        console.error("Failed to save preset:", error);
        setAlert({
          status: AlertStatus.ERROR,
          title: "Error Saving Preset",
          message: "An error occurred while saving the preset. Please try again.",
        });
        onOpenAlert();
      })
      .finally(() => {
        setIsSaveLoading(false);
      });
  }, [preset, onOpenAlert]);

  const closeAlert = () => {
    setAlert(undefined);
    onCloseAlert();
  };

  const hasEmptyFields = (obj: any, excludeKeys: string[]): boolean => {
    for (const key in obj) {
      if (excludeKeys.includes(key)) {
        continue;
      }

      if (typeof obj[key] === "object" && obj[key] !== null) {
        if (hasEmptyFields(obj[key], excludeKeys)) return true; // Ricorsione per oggetti annidati
      } else if (obj[key] === "") {
        return true;
      }
    }
    return false;
  };

  const hasErrorFields = (obj: any): boolean => {
    for (const key in obj) {
      if (typeof obj[key] === "object" && obj[key] !== null) {
        if (hasErrorFields(obj[key])) return true; // Ricorsione per oggetti annidati
      } else if (obj[key] !== "") {
        return true;
      }
    }
    return false;
  };

  const isPresetValid = useCallback(() => {
    return hasEmptyFields(preset, ["uuid"]) || hasErrorFields(presetErrors);
  }, [preset, presetErrors]);

  return (
    <>
      {alert && (
        <Alert isOpen={isOpenAlert} onOpen={onOpenAlert} onClose={closeAlert} content={alert} />
      )}

      <div className="pt-4">
        <form className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <Input
              label="Pool Preset Name"
              name="presetName"
              id="presetName"
              placeholder="Enter preset name"
              defaultValue={preset.name}
              onChange={handleChange}
              error={presetErrors.name}
            />

            <div className="flex flex-col gap-4">
              <p className="font-heading text-sm font-medium">Settings</p>
              <div className="grid grid-cols-1 gap-8 tablet:grid-cols-2 desktop:grid-cols-4">
                <Input
                  label="Stratum URL"
                  name="stratumURL"
                  id="stratumURL"
                  placeholder="stratumURL"
                  defaultValue={preset.configuration?.stratumURL}
                  onChange={handleChange}
                  error={presetErrors.configuration?.stratumURL}
                />
                <Input
                  label="Stratum Port"
                  name="stratumPort"
                  id="stratumPort"
                  placeholder="stratumPort"
                  defaultValue={preset.configuration?.stratumPort}
                  onChange={handleChange}
                  error={presetErrors.configuration?.stratumPort}
                />
                <Input
                  label="Stratum User"
                  name="stratumUser"
                  id="stratumUser"
                  placeholder="stratumUser"
                  defaultValue={preset.configuration?.stratumUser}
                  onChange={handleChange}
                  error={presetErrors.configuration?.stratumUser}
                />
                <Input
                  label="Stratum Password"
                  name="stratumPassword"
                  type="password"
                  id="stratumPassword"
                  placeholder="stratumPassword"
                  defaultValue={preset.configuration?.stratumPassword}
                  onChange={handleChange}
                  error={presetErrors.configuration?.stratumPassword}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            {onCloseModal && <Button variant="outlined" onClick={onCloseModal} label="Cancel" />}
            <Button
              isLoading={isSaveLoading}
              variant="primary"
              onClick={handleSavePreset}
              label="Save Preset"
              disabled={isPresetValid()}
            />
          </div>
        </form>
      </div>
    </>
  );
};
