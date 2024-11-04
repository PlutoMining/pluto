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
  useToken,
} from "@chakra-ui/react";
import React, { ChangeEvent, useCallback, useEffect, useState } from "react";
import { Badge, HostnameBadge } from "../Badge";
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
  const [bgColor] = useToken("colors", ["item-bg"]);
  const [borderColor] = useToken("colors", ["border-color"]);
  const [textColor] = useToken("colors", ["body-text"]);
  const [primaryColor] = useToken("colors", ["primary-color"]);

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
      <ModalOverlay boxShadow={"0px -39px 39px 0px #00988817"} />
      <ModalContent
        bg={bgColor}
        borderRadius={0}
        height={{
          base: "calc(100% - 8.5rem)",
          tablet: "calc(100% - 10.5rem)",
          tabletL: "calc(100% - 9.5rem)",
        }}
        top={"1.5rem"}
        overflow={"scroll"}
        borderColor={borderColor}
        borderTopWidth={"1px"}
        borderBottomWidth={"1px"}
      >
        <Box
          maxW="container.desktop"
          margin={"0 auto"}
          p={{ base: "1rem", tablet: "2rem" }}
          alignContent={"flex-start"}
          w={"100%"}
        >
          <ModalHeader p={"0 0 1rem 0"} fontFamily={"heading"} fontWeight={400} fontSize={"2rem"}>
            Pool Preset
          </ModalHeader>
          <ModalCloseButton color={primaryColor} />
          <ModalBody overflow={"scroll"} p={0}>
            <Flex flexDir={"column"} gap={"1rem"}>
              <Heading fontSize="sm" fontWeight={500}>
                Selected Devices
              </Heading>
              <Flex gap={"1rem"} flexWrap={"wrap"}>
                {devices.map((device) => (
                  <HostnameBadge
                    mac={device.mac}
                    hostname={device.info.hostname}
                    ip={device.ip}
                    tracing={device.tracing || false}
                  />
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
                defaultValue={selectedPreset?.name || undefined}
                optionValues={presets.map((preset) => ({ value: preset.uuid, label: preset.name }))}
              />

              <Flex gap={"1rem"}>
                <Button variant="outlined" onClick={onClose} label="Cancel"></Button>
                <Button
                  variant="primary"
                  rightIcon={<ArrowIcon color={bgColor} />}
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
