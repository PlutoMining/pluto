/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import {
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Divider,
  Flex,
  Heading,
  Text,
  useToken,
} from "@chakra-ui/react";
import { Preset } from "@pluto/interfaces";
import { isStratumV2URL } from "@pluto/utils";
import { MouseEvent } from "react";
import { HostnameBadge } from "../Badge";
import Button from "../Button/Button";
import { DeleteIcon } from "../icons/DeleteIcon";
import { DuplicateIcon } from "../icons/DuplicateIcon";
import { Input } from "../Input";

interface PresetProps {
  preset: Preset;
  onDuplicate: (uuid: string) => (e: MouseEvent<HTMLButtonElement>) => void;
  onDelete: (uuid: string) => void;
  isDuplicateDisabled: boolean;
  index: number;
}

export const PresetAccordion: React.FC<PresetProps> = ({
  preset,
  onDuplicate,
  onDelete,
  index,
  isDuplicateDisabled,
}) => {
  const [borderColor] = useToken("colors", ["border-color"]);
  const [textColor] = useToken("colors", ["body-text"]);
  const [accentColor] = useToken("colors", ["cta-bg"]);

  return (
    <AccordionItem
      key={`preset-${preset.uuid}`} // Prefisso specifico per il preset
      backgroundColor={"td-bg"}
      borderWidth={"1px"}
      borderColor={borderColor}
    >
      <AccordionButton p={"1rem"} _hover={{ backgroundColor: "none" }} bg={"th-bg"}>
        <Flex
          gap={"0.5rem"}
          alignItems={"center"}
          fontFamily={"heading"}
          fontWeight={"600"}
          color={textColor}
        >
          <AccordionIcon color={accentColor} />
          <Heading fontFamily={"accent"} fontSize={"md"} fontWeight={"400"}>
            #{++index}
          </Heading>
          <Heading fontFamily={"accent"} fontSize={"md"} fontWeight={"400"}>
            {preset.name}
          </Heading>
        </Flex>
      </AccordionButton>
      <AccordionPanel p={0} as={Flex} flexDir={"column"} alignItems={"flex-start"}>
        <Divider borderColor={"border-color"} />
        <Flex flexDirection={"column"} gap={"1rem"} p={"1rem"} w={"100%"}>
          <Text fontFamily={"heading"} fontWeight={"600"} textTransform={"uppercase"}>
            Settings
          </Text>
          <Flex gap={"1rem"} flexDir={{ base: "column", tablet: "row" }}>
            <Flex flex={1}>
              <Input
                isDisabled={true}
                type="text"
                label="Stratum URL"
                name="stratumURL"
                id={`${preset.uuid}-stratumUrl`}
                defaultValue={preset.configuration.stratumURL}
              />
            </Flex>
            {(preset.configuration.stratumProtocolVersion !== "v2" && 
              !isStratumV2URL(preset.configuration.stratumURL || "")) && (
              <Flex flex={1}>
                <Input
                  isDisabled={true}
                  type="number"
                  label="Stratum Port"
                  name="stratumPort"
                  id={`${preset.uuid}-stratumPort`}
                  defaultValue={preset.configuration.stratumPort}
                />
              </Flex>
            )}
            {(preset.configuration.stratumProtocolVersion === "v2" || 
              isStratumV2URL(preset.configuration.stratumURL || "")) && (
              <Flex flex={1}>
                <Input
                  isDisabled={true}
                  type="text"
                  label="Authority Key (V2)"
                  name="stratumAuthorityKey"
                  id={`${preset.uuid}-stratumAuthorityKey`}
                  defaultValue={preset.configuration.stratumAuthorityKey}
                />
              </Flex>
            )}
            <Flex flex={2}>
              <Input
                isDisabled={true}
                type="text"
                label="Stratum User"
                name="stratumUser"
                id={`${preset.uuid}-stratumUser`}
                defaultValue={preset.configuration.stratumUser}
              />
            </Flex>
          </Flex>
          {(preset.configuration.stratumProtocolVersion === "v2" || 
            isStratumV2URL(preset.configuration.stratumURL || "")) && (
            <Text fontSize="xs" color="gray.500">
              Protocol: Stratum V2
            </Text>
          )}
          {preset.configuration.stratumProtocolVersion === "v1" && (
            <Text fontSize="xs" color="gray.500">
              Protocol: Stratum V1
            </Text>
          )}
          <Text fontFamily={"accent"} fontWeight={"600"} textTransform={"uppercase"}>
            Associated Devices
          </Text>

          {preset.associatedDevices && preset.associatedDevices.length > 0 ? (
            <Flex gap={"1rem"} flexWrap={"wrap"}>
              {preset.associatedDevices?.map((device, i) => (
                <HostnameBadge
                  key={`hostname-badge-${i}`}
                  mac={device.mac}
                  hostname={device.info.hostname}
                  ip={device.ip}
                  tracing={device.tracing || false}
                />
              ))}
            </Flex>
          ) : (
            <Text textAlign={"center"} fontSize={"12px"}>
              No associated device
            </Text>
          )}
        </Flex>
      </AccordionPanel>
      <Divider borderColor={borderColor} />
      <Flex alignItems={"center"} p={"0.5rem 1rem"} gap={"1rem"}>
        <Button
          variant="text"
          onClick={onDuplicate(preset.uuid)}
          icon={<DuplicateIcon h={"18"} />}
          disabled={isDuplicateDisabled}
          label="Duplicate"
        ></Button>
        <Button
          variant="text"
          onClick={() => onDelete(preset.uuid)}
          disabled={preset.associatedDevices && preset.associatedDevices.length > 0}
          icon={<DeleteIcon h={"18"} />}
          label="Delete"
        ></Button>
      </Flex>
    </AccordionItem>
  );
};
