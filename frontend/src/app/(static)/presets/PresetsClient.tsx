"use client";
/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
 */

import { PresetAccordion } from "@/components/Accordion";
import Alert from "@/components/Alert/Alert";
import { AlertInterface, AlertStatus } from "@/components/Alert/interfaces";
import Button from "@/components/Button/Button";
import { AddNewPresetModal, BasicModal } from "@/components/Modal";
import { CircularProgressWithDots } from "@/components/ProgressBar/CircularProgressWithDots";
import { useDisclosure } from "@/hooks/useDisclosure";
import { Device, Preset } from "@pluto/interfaces";
import axios from "axios";
import React, { MouseEvent, useCallback, useEffect, useState } from "react";

export default function PresetsClient() {
  const [presets, setPresets] = useState<Preset[] | null>(null);

  const [alert, setAlert] = useState<AlertInterface>();
  const {
    isOpen: isOpenAlert,
    onOpen: onOpenAlert,
    onClose: onCloseAlert,
  } = useDisclosure({ defaultIsOpen: false });

  const {
    isOpen: isNewPresetModalOpen,
    onOpen: onNewPresetModalOpen,
    onClose: onNewPresetModalClose,
  } = useDisclosure();

  const {
    isOpen: isDeletePresetModalOpen,
    onOpen: onDeletePresetModalOpen,
    onClose: onDeletePresetModalClose,
  } = useDisclosure();

  const [selectedPresetUuid, setSelectedPresetUuid] = useState<string | undefined>(undefined);

  const fetchPresets = useCallback(async () => {
  const fetchPresets = useCallback(async () => {
    try {
      const response = await fetch("/api/presets");
      if (response.ok) {
        const data: { data: Preset[] } = await response.json();
        return data.data;
      } else {
        console.error("Failed to fetch presets");
      }
    } catch (error) {
      console.error("Error fetching presets", error);
    }
  }, []);
  }, []);

  const fetchAssociatedDevices = useCallback(async (presetId: string) => {
  const fetchAssociatedDevices = useCallback(async (presetId: string) => {
    try {
      const response = await axios.get(`/api/devices/presets/${presetId}`);
      const discoveredDevices: Device[] = response.data.data;
      return discoveredDevices;
    } catch (error) {
      console.error("Error discovering preset devices:", error);
      return [];
    }
  }, []);
  }, []);

  const fetchPresetsWithAssociatedDevices = useCallback(async () => {
  const fetchPresetsWithAssociatedDevices = useCallback(async () => {
    try {
      const presets = await fetchPresets();

      const updatedPresets = await Promise.all(
        presets?.map(async (preset) => {
          const associatedDevices = await fetchAssociatedDevices(preset.uuid);
          return { ...preset, associatedDevices };
        }) || []
      );

      setPresets(updatedPresets);
    } catch (error) {
      console.error("Error during presets' update:", error);
      setPresets([]);
    }
  }, [fetchPresets, fetchAssociatedDevices]);

  useEffect(() => {
    void fetchPresetsWithAssociatedDevices();
  }, [alert, fetchPresetsWithAssociatedDevices]);

  const closeAlert = useCallback(() => {
    setAlert(undefined);
    onCloseAlert();
  }, [onCloseAlert]);

  const openDeleteConfirmationModal = useCallback((presetUuid: string) => {
    setSelectedPresetUuid(presetUuid);
    onDeletePresetModalOpen();
  }, [onDeletePresetModalOpen]);

  const handleDeletePreset = useCallback(async () => {
    onDeletePresetModalClose();
    closeAlert();

    if (selectedPresetUuid) {
      try {
        await axios.delete(`/api/presets/${encodeURIComponent(selectedPresetUuid)}`);

        const devices = presets?.find((p) => p.uuid === selectedPresetUuid)?.associatedDevices;
        if (devices) {
          devices.forEach(async (d) => {
            await axios.patch(`/api/devices/imprint/${d.mac}`, {
              device: {
                ...d,
                presetUuid: null,
              },
            });
          });
        }

        setAlert({
          status: AlertStatus.SUCCESS,
          title: "Preset Deleted Successfully!",
          message: "Your preset has been correctly deleted.",
        });
        onOpenAlert();
      } catch (_error) {
        setAlert({
          status: AlertStatus.ERROR,
          title: "Error deleting preset",
          message: "An error occured while deleting the preset.",
        });
        onOpenAlert();
      }
    }
  }, [closeAlert, onDeletePresetModalClose, onOpenAlert, presets, selectedPresetUuid]);

  const handleNewPreset = useCallback(
    (presetUuid?: string) => (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (presetUuid) {
        setSelectedPresetUuid(presetUuid);
      } else setSelectedPresetUuid(undefined);
      onNewPresetModalOpen();
    },
    [onNewPresetModalOpen]
  );

  const onNewPresetModalCloseSuccessfully = async () => {
    onNewPresetModalClose();
    setAlert({
      status: AlertStatus.SUCCESS,
      title: "Preset Saved Successfully!",
      message: "Your preset has been correctly saved.",
    });
    onOpenAlert();
    fetchPresets();
  };

  return (
    <div className="flex-1 py-6">
      <div className="mx-auto w-full max-w-[var(--pluto-content-max)] px-4 md:px-8">
        {alert ? (
          <Alert isOpen={isOpenAlert} onOpen={onOpenAlert} onClose={closeAlert} content={alert} />
        ) : null}

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-end">
          {presets && presets.length > 0 ? (
            <Button
              variant="primary"
              onClick={handleNewPreset()}
              label="Add a New Preset"
              className="w-full md:w-auto"
            />
          ) : null}
        </div>

        <div className="mt-8">
        {presets ? (
          presets.length > 0 ? (
            <div className="flex flex-col gap-4">
              {presets.map((preset, index) => (
                <PresetAccordion
                  index={index}
                  key={`preset-${preset.uuid}`}
                  preset={preset}
                  onDuplicate={handleNewPreset}
                  onDelete={openDeleteConfirmationModal}
                  isDuplicateDisabled={false}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                Looks like you haven&apos;t added a preset pool yet!
              </p>
              <Button variant="primary" onClick={onNewPresetModalOpen} label="Add a Pool Preset" />
            </div>
          )
        ) : (
          <div className="mx-auto my-8 flex w-full flex-col items-center">
            <CircularProgressWithDots />
          </div>
        )}
        </div>

        <AddNewPresetModal
          isOpen={isNewPresetModalOpen}
          onClose={onNewPresetModalClose}
          onCloseSuccessfully={onNewPresetModalCloseSuccessfully}
          presetId={selectedPresetUuid}
        />

        <BasicModal
          isOpen={isDeletePresetModalOpen}
          onClose={onDeletePresetModalClose}
          primaryActionLabel="Proceed and Delete"
          primaryAction={handleDeletePreset}
          title="Are you sure?"
          body="If you proceed, the Preset Pool will be permanently deleted."
          secondaryActionLabel="Cancel"
        />
      </div>
    </div>
  );
}
