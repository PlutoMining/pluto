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
  AccordionPanel,
  Accordion as ChakraAccordion,
  AccordionItem as ChakraAccordionItem,
  Divider,
  Flex,
  Heading,
  Link,
  Text,
} from "@chakra-ui/react";
import { Device } from "@pluto/interfaces";
import { DeviceStatusBadge } from "../Badge";
import { getMinerName } from "@/utils/minerMap";
import { formatDetailedTime } from "@/utils/formatTime";

interface DeviceAccordionProps {
  devices: Device[];
  removeFunction: (deviceId: string) => void;
}

interface AccordionItemProps {
  device: Device;
  removeFunction: (deviceId: string) => void;
}

export const DeviceAccordion: React.FC<DeviceAccordionProps> = ({ devices, removeFunction }) => {
  return (
    <>
      {devices && devices.length > 0 ? (
        <ChakraAccordion
          allowMultiple
          as={Flex}
          flexDir={"column"}
          backgroundColor={"td-bg"}
          borderColor={"border-color"}
        >
          {devices?.map((device, index) => (
            <ChakraAccordionItem
              key={`device-settings-${device.mac}`} // Prefisso specifico per ogni device
              borderTopWidth={index > 0 ? "1px" : "0"}
              borderBottomWidth={"0!important"}
            >
              <AccordionItem key={device.mac} device={device} removeFunction={removeFunction} />
            </ChakraAccordionItem>
          ))}
        </ChakraAccordion>
      ) : (
        <Text textAlign={"center"}>No device found</Text>
      )}
    </>
  );
};

const AccordionItem: React.FC<AccordionItemProps> = ({ device, removeFunction }) => {
  return (
    <>
      <AccordionButton
        p={"1rem"}
        justifyContent={"space-between"}
        _hover={{ backgroundColor: "none" }}
        bg={"th-bg"}
      >
        <Flex gap={"1rem"} alignItems={"center"}>
          <AccordionIcon />
          <Heading
            fontSize={"sm"}
            fontWeight={600}
            textTransform={"capitalize"}
            fontFamily={"body"}
          >
            {device.info.hostname}
          </Heading>
          <DeviceStatusBadge status={device.tracing ? "online" : "offline"} />
        </Flex>

        {/* Pass the device ID to the removeRegisteredDevice function */}
        <Link
          fontFamily={"accent"}
          fontWeight={500}
          textDecoration={"underline"}
          textTransform={"uppercase"}
          fontSize={"14px"}
          onClick={() => removeFunction(device.mac)}
        >
          Remove
        </Link>
      </AccordionButton>
      <AccordionPanel p={0} as={Flex} flexDir={"column"} alignItems={"flex-start"}>
        <Divider borderColor={"border-color"} />
        <Flex flexDirection={"column"} gap={"0.5rem"} w={"100%"} p={"1rem"}>
          <Flex justify={"space-between"}>
            <Text fontWeight={500} textTransform={"capitalize"} fontSize={"sm"} fontFamily={"body"}>
              Data added
            </Text>
            <Text fontWeight={400} fontSize={"sm"} fontFamily={"accent"}>
              {new Date(device.createdAt!).toLocaleDateString()}
            </Text>
          </Flex>
          <Flex justify={"space-between"}>
            <Text fontWeight={500} textTransform={"capitalize"} fontSize={"sm"} fontFamily={"body"}>
              IP
            </Text>
            <Text fontWeight={400} fontSize={"sm"} fontFamily={"accent"}>
              {device.ip}
            </Text>
          </Flex>
          <Flex justify={"space-between"}>
            <Text fontWeight={500} textTransform={"capitalize"} fontSize={"sm"} fontFamily={"body"}>
              Miner
            </Text>
            <Text fontWeight={400} fontSize={"sm"} fontFamily={"accent"}>
              {getMinerName(device.info.boardVersion) || device.info?.deviceModel}
            </Text>
          </Flex>
          <Flex justify={"space-between"}>
            <Text fontWeight={500} textTransform={"capitalize"} fontSize={"sm"} fontFamily={"body"}>
              ASIC
            </Text>
            <Text fontWeight={400} fontSize={"sm"} fontFamily={"accent"}>
              {device.info.ASICModel}
            </Text>
          </Flex>
          <Flex justify={"space-between"}>
            <Text fontWeight={500} textTransform={"capitalize"} fontSize={"sm"} fontFamily={"body"}>
              FW v.
            </Text>
            <Text fontWeight={400} fontSize={"sm"} fontFamily={"accent"}>
              {device.info.version}
            </Text>
          </Flex>
          <Flex justify={"space-between"}>
            <Text fontWeight={500} textTransform={"capitalize"} fontSize={"sm"} fontFamily={"body"}>
              Uptime
            </Text>
            <Text fontWeight={400} fontSize={"sm"} fontFamily={"accent"}>
              {formatDetailedTime(device.info.uptimeSeconds)}
            </Text>
          </Flex>
        </Flex>
      </AccordionPanel>
    </>
  );
};
