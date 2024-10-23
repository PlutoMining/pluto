import {
  Box,
  Flex,
  Heading,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  useTheme,
} from "@chakra-ui/react";
import React, { ChangeEvent, useCallback, useEffect, useState } from "react";
import { Badge } from "../Badge";
import { Device, Preset } from "@pluto/interfaces";
import { Select } from "../Select";
import Button from "../Button/Button";
import { ArrowIcon } from "../icons/ArrowIcon";

interface SelectPresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: Device[];
  presets: Preset[];
  onCloseSuccessfully: (uuid: string) => void;
}

export const SelectPresetModal: React.FC<SelectPresetModalProps> = ({
  isOpen,
  onClose,
  devices,
  presets,
  onCloseSuccessfully,
}) => {
  const theme = useTheme();

  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);

  useEffect(() => {
    if (presets && presets.length > 0) {
      setSelectedPreset(presets[0]);
    }
  }, [presets]);

  const handleChangeOnSelectPreset = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const preset = presets.find((p) => p.uuid === e.target.value);
      if (preset) {
        setSelectedPreset(preset);
      }
    },
    [selectedPreset]
  );

  const handleAction = useCallback(() => {
    if (selectedPreset) {
      onCloseSuccessfully(selectedPreset.uuid);
    } else {
      console.log("No preset selected");
    }
  }, [onCloseSuccessfully, selectedPreset]);

  return (
    <Modal onClose={onClose} size={"full)"} isOpen={isOpen}>
      <ModalOverlay />
      <ModalContent
        bg={theme.colors.greyscale[0]}
        borderRadius={"1rem"}
        height={"calc(100% - 8rem)"}
        overflow={"scroll"}
      >
        <Box
          maxW="container.desktop"
          margin={"0 auto"}
          p={"2rem"}
          alignContent={"flex-start"}
          w={"100%"}
        >
          <ModalHeader p={"0 0 1rem 0"} fontFamily={"heading"} fontWeight={400} fontSize={"2rem"}>
            Pool Preset
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody overflow={"scroll"} p={0}>
            <Flex flexDir={"column"} gap={"1rem"}>
              <Heading fontSize="14px" fontWeight={500}>
                Selected Devices
              </Heading>
              <Flex gap={"1rem"} flexWrap={"wrap"}>
                {devices.map((device) => (
                  <Badge
                    key={device.mac}
                    title={device.info.hostname}
                    color={theme.colors.greyscale[200]}
                  ></Badge>
                ))}
              </Flex>
              <Text fontSize={"13px"} fontWeight={400} fontFamily={"heading"}>
                The selected Pool Preset will be applied to all the selected devices.
              </Text>

              <Select
                id={"select-preset"}
                label="Select Pool Preset"
                name="preset"
                onChange={(val) => handleChangeOnSelectPreset(val)}
                value={selectedPreset?.name || undefined}
                optionValues={presets.map((preset) => ({ value: preset.uuid, label: preset.name }))}
              />

              <Flex gap={"1rem"}>
                <Button variant="secondary" onClick={onClose} label="Cancel"></Button>
                <Button
                  variant="primaryPurple"
                  rightIcon={<ArrowIcon color="#fff" />}
                  onClick={handleAction}
                  label="Save"
                ></Button>
              </Flex>
            </Flex>
          </ModalBody>
        </Box>
      </ModalContent>
    </Modal>
  );
};
