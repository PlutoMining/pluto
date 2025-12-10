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
import { Box, Flex, SimpleGrid, Text, useDisclosure, useToken, VStack } from "@chakra-ui/react";
import { Preset } from "@pluto/interfaces";
import { validateDomain, validateTCPPort, validateStratumV2URL, validateBase58Check, isStratumV2URL, parseStratumURL, buildStratumV2URL } from "@pluto/utils";
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
      stratumProtocolVersion: "",
      stratumAuthorityKey: "",
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
      stratumProtocolVersion: "v1",
      stratumAuthorityKey: "",
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
          // Auto-detect protocol version if not set
          const protocolVersion = newData.configuration?.stratumProtocolVersion || 
            (isStratumV2URL(newData.configuration?.stratumURL || "") ? "v2" : "v1");
          
          setPreset((prevPreset) => ({
            ...prevPreset,
            ...newData,
            name: "",
            configuration: {
              ...prevPreset.configuration,
              ...newData.configuration,
              stratumProtocolVersion: protocolVersion,
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
        // Support both V1 and V2 formats
        if (isStratumV2URL(value)) {
          return validateStratumV2URL(value);
        }
        return validateDomain(value, { allowIP: true });
      case "stratumPort":
        const numericRegex = /^\d+$/;
        return validateTCPPort(numericRegex.test(value) ? Number(value) : -1);
      case "stratumUser":
        // return validateBitcoinAddress(value);
        return !value.includes(".");
      case "stratumAuthorityKey":
        return validateBase58Check(value);
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

    // Auto-detect protocol version when URL changes
    if (name === "stratumURL" && isStratumV2URL(value)) {
      try {
        const parsed = parseStratumURL(value);
        setPreset((prevPreset) => ({
          ...prevPreset,
          configuration: {
            ...prevPreset.configuration,
            stratumURL: value,
            stratumProtocolVersion: "v2",
            stratumAuthorityKey: parsed.authorityKey || prevPreset.configuration?.stratumAuthorityKey || "",
            stratumPort: parsed.port || prevPreset.configuration?.stratumPort || "",
          },
        }));
      } catch (error) {
        // If parsing fails, just update URL and let validation handle it
        setPreset((prevPreset) => ({
          ...prevPreset,
          configuration: {
            ...prevPreset.configuration,
            stratumURL: value,
            stratumProtocolVersion: "v2",
          },
        }));
      }
    } else if (name === "stratumURL") {
      // V1 URL detected
      setPreset((prevPreset) => ({
        ...prevPreset,
        configuration: {
          ...prevPreset.configuration,
          stratumURL: value,
          stratumProtocolVersion: "v1",
        },
      }));
    }

    validateField(name, value);

    if (name === "presetName") {
      setPreset((prevPreset) => ({
        ...prevPreset,
        name: value,
      }));
    } else if (name !== "stratumURL") {
      // stratumURL is already handled above
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

      <Box p={0} pt={"1rem"}>
        <Flex as="form" flexDir={"column"} gap={"2rem"}>
          <VStack spacing={4} align="stretch">
            <Input
              label="Pool Preset Name"
              name="presetName"
              id="presetName"
              placeholder="Enter preset name"
              defaultValue={preset.name}
              onChange={handleChange}
              error={presetErrors.name}
            />
            <VStack align={"stretch"} spacing={4}>
              <Text fontFamily={"heading"} fontWeight={500} fontSize={"14px"}>
                Settings
              </Text>
              <SimpleGrid columns={{ mobile: 1, tablet: 2, desktop: 4 }} spacing={8}>
                <Input
                  label="Stratum URL"
                  name="stratumURL"
                  id="stratumURL"
                  placeholder={
                    preset.configuration?.stratumProtocolVersion === "v2"
                      ? "stratum2+tcp://pool.com:port/authority_key"
                      : "pool.com or stratum+tcp://pool.com:port"
                  }
                  defaultValue={preset.configuration?.stratumURL}
                  onChange={handleChange}
                  error={presetErrors.configuration?.stratumURL}
                />
                {preset.configuration?.stratumProtocolVersion !== "v2" && (
                  <Input
                    label="Stratum Port"
                    name="stratumPort"
                    id="stratumPort"
                    placeholder="stratumPort"
                    defaultValue={preset.configuration?.stratumPort}
                    onChange={handleChange}
                    error={presetErrors.configuration?.stratumPort}
                  />
                )}
                {preset.configuration?.stratumProtocolVersion === "v2" && (
                  <Input
                    label="Authority Key (V2)"
                    name="stratumAuthorityKey"
                    id="stratumAuthorityKey"
                    placeholder="Base58-check encoded authority key"
                    defaultValue={preset.configuration?.stratumAuthorityKey}
                    onChange={handleChange}
                    error={presetErrors.configuration?.stratumAuthorityKey}
                  />
                )}
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
              </SimpleGrid>
              {preset.configuration?.stratumProtocolVersion === "v2" && (
                <Text fontSize="xs" color="gray.500">
                  Protocol: Stratum V2 (URL includes port and authority key)
                </Text>
              )}
              {preset.configuration?.stratumProtocolVersion === "v1" && (
                <Text fontSize="xs" color="gray.500">
                  Protocol: Stratum V1
                </Text>
              )}
            </VStack>
          </VStack>
          <Flex gap={"1rem"}>
            {onCloseModal && <Button variant="outlined" onClick={onCloseModal} label="Cancel" />}
            <Button
              isLoading={isSaveLoading}
              variant="primary"
              onClick={handleSavePreset}
              label="Save Preset"
              disabled={isPresetValid()}
            />
          </Flex>
        </Flex>
      </Box>
    </>
  );
};
