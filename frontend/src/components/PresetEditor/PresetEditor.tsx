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
import type { Preset } from "@pluto/interfaces";
import type { MinerConfigModelInput } from "@pluto/pyasic-bridge-client";
import { validateDomain } from "@pluto/utils";
import axios from "axios";
import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";

function validateFieldByName(name: string, value: string) {
  switch (name) {
    case "poolUrl":
      // Allow full stratum URLs like `stratum+tcp://host:port`
      // by validating only the hostname/IP portion.
      {
        const trimmed = value.trim();
        if (!trimmed) return true;

        // Strip known stratum scheme if present.
        let hostPart = trimmed.replace(/^stratum\+tcp:\/\//i, "");

        // Drop path, if any.
        if (hostPart.includes("/")) {
          hostPart = hostPart.split("/")[0];
        }

        // Drop port, if any.
        if (hostPart.includes(":")) {
          hostPart = hostPart.split(":")[0];
        }

        return validateDomain(hostPart, { allowIP: true });
      }
    case "poolUser":
      return !value.includes(".");
    default:
      return true;
  }
}

interface PresetFormState {
  name: string;
  poolUrl: string;
  poolUser: string;
  poolPassword: string;
}

interface PresetFormErrors {
  name: string;
  poolUrl: string;
  poolUser: string;
  poolPassword: string;
}

function formToConfig(form: PresetFormState): MinerConfigModelInput {
  return {
    pools: {
      groups: [
        {
          pools: [
            {
              url: form.poolUrl || undefined,
              user: form.poolUser || undefined,
              password: form.poolPassword || undefined,
            },
          ],
        },
      ],
    },
  };
}

function configToForm(config?: MinerConfigModelInput): Pick<PresetFormState, "poolUrl" | "poolUser" | "poolPassword"> {
  const pool = config?.pools?.groups?.[0]?.pools?.[0];
  return {
    poolUrl: pool?.url ?? "",
    poolUser: pool?.user ?? "",
    poolPassword: pool?.password ?? "",
  };
}

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

  const [formErrors, setFormErrors] = useState<PresetFormErrors>({
    name: "",
    poolUrl: "",
    poolUser: "",
    poolPassword: "",
  });

  const [form, setForm] = useState<PresetFormState>({
    name: "",
    poolUrl: "",
    poolUser: "",
    poolPassword: "",
  });

  const [presets, setPresets] = useState<Preset[]>();

  const fetchPreset = useCallback(async () => {
    try {
      const response = await fetch("/api/presets");
      if (response.ok) {
        const data: { data: Preset[] } = await response.json();
        setPresets(data.data);
        const found = data.data.find((p) => p.uuid === presetId);
        if (found) {
          const poolFields = configToForm(found.configuration);
          setForm((prev) => ({
            ...prev,
            name: "", // Name is always blank for duplicated presets
            ...poolFields,
          }));
        }
      } else {
        console.error("Failed to fetch presets");
      }
    } catch (error) {
      console.error("Error fetching presets", error);
    }
  }, [presetId]);

  useEffect(() => {
    if (presetId) {
      void fetchPreset();
    }
  }, [presetId, fetchPreset]);

  const validateField = useCallback((name: string, value: string) => {
    let label =
      value === ""
        ? `${name} is required.`
        : validateFieldByName(name, value)
        ? ""
        : `${name} is not correct.`;

    if (name === "name") {
      const existing = presets?.find((p) => p.name === value);
      if (existing) {
        label = `A preset called "${existing.name}" already exists.`;
      }
    }

    setFormErrors((prev) => ({ ...prev, [name]: label }));
  }, [presets]);

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    validateField(name, value);
    setForm((prev) => ({ ...prev, [name]: value }));
  }, [validateField]);

  const handleSavePreset = useCallback(() => {
    const uuid = uuidv4();
    const newPreset: Partial<Preset> = {
      uuid,
      name: form.name,
      configuration: formToConfig(form),
    };

    setIsSaveLoading(true);
    const promise = axios.post("/api/presets", newPreset);

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
  }, [onCloseSuccessfullyModal, onOpenAlert, form]);

  const closeAlert = useCallback(() => {
    setAlert(undefined);
    onCloseAlert();
  }, [onCloseAlert]);

  const hasEmptyFields = (): boolean => {
    return !form.name || !form.poolUrl || !form.poolUser;
  };

  const hasErrors = (): boolean => {
    return Object.values(formErrors).some((v) => v !== "");
  };

  const isPresetInvalid = () => {
    return hasEmptyFields() || hasErrors();
  };

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
              name="name"
              id="presetName"
              placeholder="Enter preset name"
              defaultValue={form.name}
              onChange={handleChange}
              error={formErrors.name}
            />

            <div className="flex flex-col gap-4">
              <p className="font-heading text-sm font-medium">Settings</p>
              <div className="grid grid-cols-1 gap-8 tablet:grid-cols-2 desktop:grid-cols-3">
                <Input
                  label="Pool URL"
                  name="poolUrl"
                  id="poolUrl"
                  placeholder="stratum+tcp://pool:3333"
                  defaultValue={form.poolUrl}
                  onChange={handleChange}
                  error={formErrors.poolUrl}
                />
                <Input
                  label="Pool User"
                  name="poolUser"
                  id="poolUser"
                  placeholder="Add your pool user"
                  defaultValue={form.poolUser}
                  onChange={handleChange}
                  error={formErrors.poolUser}
                />
                <Input
                  label="Pool Password"
                  name="poolPassword"
                  type="password"
                  id="poolPassword"
                  placeholder="Add your pool password"
                  defaultValue={form.poolPassword}
                  onChange={handleChange}
                  error={formErrors.poolPassword}
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
              disabled={isPresetInvalid()}
            />
          </div>
        </form>
      </div>
    </>
  );
};
