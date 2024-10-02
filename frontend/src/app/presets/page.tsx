"use client";
import { PresetAccordion } from "@/components/Accordion";
import Alert from "@/components/Alert/Alert";
import { AlertInterface, AlertStatus } from "@/components/Alert/interfaces";
import Button from "@/components/Button/Button";
import { AddNewPresetModal, BasicModal } from "@/components/Modal";
import {
  Accordion,
  Box,
  Container,
  Flex,
  Heading,
  Spinner,
  Text,
  useDisclosure,
  VStack,
} from "@chakra-ui/react";
import { Device, Preset } from "@pluto/interfaces";
import axios from "axios";
import React, { MouseEvent, useCallback, useEffect, useState } from "react";

const PresetsListingPage: React.FC = () => {
  const [presets, setPresets] = useState<Preset[] | null>(null);
  const maxNumberOfPresets = 7;

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

  // Recupera i preset tramite le API
  const fetchPresets = async () => {
    try {
      const response = await fetch("/api/presets");
      if (response.ok) {
        const data: { data: Preset[] } = await response.json();
        // setPresets(data.data);
        return data.data;
      } else {
        console.error("Failed to fetch presets");
      }
    } catch (error) {
      console.error("Error fetching presets", error);
    }
  };

  const fetchAssociatedDevices = async (presetId: string) => {
    try {
      const response = await axios.get(`/api/devices/presets/${presetId}`);
      const discoveredDevices: Device[] = response.data.data;
      return discoveredDevices;
    } catch (error) {
      console.error("Error discovering preset devices:", error);
      throw error;
    }
  };

  const fetchPresetsWithAssociatedDevices = async () => {
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
      throw error;
    }
  };

  useEffect(() => {
    fetchPresetsWithAssociatedDevices();
  }, [alert]);

  const closeAlert = useCallback(() => {
    setAlert(undefined);
    onCloseAlert();
  }, [onCloseAlert]);

  const openDeleteConfirmationModal = (presetUuid: string) => {
    setSelectedPresetUuid(presetUuid);
    onDeletePresetModalOpen();
  };

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
                presetUuid: null,
              },
            });
          });
        }

        setAlert({
          status: AlertStatus.SUCCESS,
          title: "Preset Deleted Successfully!",
          message: `Your preset has been correctly deleted.`,
        });
        onOpenAlert();
      } catch (error) {
        setAlert({
          status: AlertStatus.ERROR,
          title: "Error deleting preset",
          message: `An error occured while deleting the preset.`,
        });
        onOpenAlert();
      }
    }
  }, [closeAlert, onDeletePresetModalClose, onOpenAlert, selectedPresetUuid]);

  const handleNewPreset = useCallback(
    (presetUuid?: string) => (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (presetUuid) {
        setSelectedPresetUuid(presetUuid);
      } else setSelectedPresetUuid(undefined);
      onNewPresetModalOpen();
    },
    []
  );

  const onNewPresetModalCloseSuccessfully = async () => {
    onNewPresetModalClose();
    setAlert({
      status: AlertStatus.SUCCESS,
      title: "Preset Saved Successfully!",
      message: `Your preset has been correctly saved.`,
    });
    onOpenAlert();
    fetchPresets();
  };

  return (
    <Container flex="1" maxW="container.2xl" h={"100%"}>
      {alert && (
        <Alert isOpen={isOpenAlert} onOpen={onOpenAlert} onClose={closeAlert} content={alert} />
      )}
      <Box p={8}>
        <Flex justify="space-between" align="center" mb={8}>
          <Heading>Pool Presets</Heading>
          {presets && presets.length > 0 && (
            <Flex>
              <Button
                variant="primaryPurple"
                onClick={handleNewPreset()}
                disabled={presets.length >= maxNumberOfPresets}
              >
                Add a New Preset
              </Button>
            </Flex>
          )}
        </Flex>

        {presets ? (
          <>
            {presets.length > 0 ? (
              <Accordion allowMultiple as={Flex} flexDir={"column"} gap={"1rem"}>
                {presets.map((preset, index) => (
                  <PresetAccordion
                    index={index}
                    key={`preset-${preset.uuid}`} // Prefisso specifico per ogni preset
                    preset={preset}
                    onDuplicate={handleNewPreset}
                    onDelete={openDeleteConfirmationModal}
                    isDuplicateDisabled={presets.length >= maxNumberOfPresets}
                  />
                ))}
              </Accordion>
            ) : (
              <VStack gap={"1rem"}>
                <Text textAlign={"center"}>
                  Looks like you haven&apos;t added a preset pool yet!
                  <br />
                  You can add up to 7 Preset.
                </Text>
                <Flex>
                  <Button variant="primaryPurple" onClick={onNewPresetModalOpen}>
                    Add a Pool Preset
                  </Button>
                </Flex>
              </VStack>
            )}
          </>
        ) : (
          <Spinner />
        )}

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
      </Box>
    </Container>
  );
};

export default PresetsListingPage;
