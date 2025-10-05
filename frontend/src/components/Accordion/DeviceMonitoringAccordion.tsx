/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { useSocket } from "@/providers/SocketProvider";
import { formatDetailedTime } from "@/utils/formatTime";
import {
  AccordionButton,
  AccordionIcon,
  AccordionPanel,
  Accordion as ChakraAccordion,
  AccordionItem as ChakraAccordionItem,
  Link as ChakraLink,
  Divider,
  Flex,
  Heading,
  Text,
  useToken,
} from "@chakra-ui/react";
import { Device } from "@pluto/interfaces";
import NextLink from "next/link";
import { useEffect, useState } from "react";
import { DeviceStatusBadge } from "../Badge";
import { ArrowLeftSmallIcon } from "../icons/ArrowIcon";

interface DeviceMonitoringAccordionProps {
  devices: Device[] | undefined;
}

interface AccordionItemProps {
  device: Device;
}

export const DeviceMonitoringAccordion: React.FC<DeviceMonitoringAccordionProps> = ({
  devices: deviceList,
}) => {
  const [devices, setDevices] = useState<Device[]>(deviceList || []);

  const { isConnected, socket } = useSocket();

  useEffect(() => {
    const listener = (e: Device) => {
      setDevices((prevDevices) => {
        if (!prevDevices) return prevDevices;

        // Trova l'indice del dispositivo da aggiornare
        const deviceIndex = prevDevices.findIndex((device) => device.mac === e.mac);

        if (deviceIndex === -1) {
          // Se il dispositivo non è trovato, opzionalmente puoi aggiungerlo
          return prevDevices;
        }

        // Crea una nuova lista di dispositivi con l'aggiornamento
        const updatedDevices = [...prevDevices];
        updatedDevices[deviceIndex] = {
          ...updatedDevices[deviceIndex], // Mantieni i dati esistenti
          ...e, // Aggiorna con i nuovi dati da e
        };

        return updatedDevices;
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
  }, [isConnected, socket, devices]);

  return (
    <>
      {devices && devices.length > 0 ? (
        <ChakraAccordion
          allowMultiple
          as={Flex}
          flexDir={"column"}
          backgroundColor={"td-bg"}
          borderWidth={"1px"}
          borderColor={"border-color"}
        >
          {devices?.map((device, index) => (
            <ChakraAccordionItem
              key={`device-settings-${device.mac}`} // Prefisso specifico per ogni device
              borderTopWidth={index > 0 ? "1px" : "0"}
              borderBottomWidth={"0!important"}
            >
              <AccordionItem key={device.mac} device={device} />
            </ChakraAccordionItem>
          ))}
        </ChakraAccordion>
      ) : (
        <Text textAlign={"center"}>No device found</Text>
      )}
    </>
  );
};

const AccordionItem: React.FC<AccordionItemProps> = ({ device }) => {
  const [textColor] = useToken("colors", ["body-text"]);
  const [headerBg] = useToken("colors", ["th-bg"]);
  return (
    <>
      <AccordionButton
        p={"1rem"}
        justifyContent={"space-between"}
        _hover={{ backgroundColor: "none" }}
        backgroundColor={headerBg}
      >
        <Flex>
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
        </Flex>
        <ChakraLink
          as={NextLink}
          href={`monitoring/${device.info.hostname}`}
          onClick={(e) => e.stopPropagation()}
        >
          <ArrowLeftSmallIcon color={textColor} />
        </ChakraLink>
      </AccordionButton>
      <AccordionPanel p={0} pb={4} as={Flex} flexDir={"column"} alignItems={"flex-start"}>
        <Divider borderColor={"border-color"} />

        <Flex flexDirection={"column"} gap={"0.5rem"} w={"100%"} p={"1rem"}>
          <Flex justify={"space-between"}>
            <Text
              fontWeight={500}
              textTransform={"capitalize"}
              fontSize={"sm"}
              fontFamily={"heading"}
            >
              Hash rate
            </Text>
            <Text fontWeight={400} fontSize={"sm"} fontFamily={"body"}>
              {(device.info.hashRate_10m || device.info.hashRate)?.toFixed(2)} GH/s
            </Text>
          </Flex>
          <Flex justify={"space-between"}>
            <Text
              fontWeight={500}
              textTransform={"capitalize"}
              fontSize={"sm"}
              fontFamily={"heading"}
            >
              Shares
            </Text>
            <Text fontWeight={400} fontSize={"sm"} fontFamily={"body"}>
              {device.info.sharesAccepted} |{" "}
              <Text as={"label"} color={"primary-color"}>
                {device.info.sharesRejected}
              </Text>
            </Text>
          </Flex>
          <Flex justify={"space-between"}>
            <Text
              fontWeight={500}
              textTransform={"capitalize"}
              fontSize={"sm"}
              fontFamily={"heading"}
            >
              Power
            </Text>
            <Text fontWeight={400} fontSize={"sm"} fontFamily={"body"}>
              {device.info.power.toFixed(2)} W
            </Text>
          </Flex>
          <Flex justify={"space-between"}>
            <Text
              fontWeight={500}
              textTransform={"capitalize"}
              fontSize={"sm"}
              fontFamily={"heading"}
            >
              Temp.
            </Text>
            <Text fontWeight={400} fontSize={"sm"} fontFamily={"body"}>
              {device.info.temp}°C
            </Text>
          </Flex>
          <Flex justify={"space-between"}>
            <Text
              fontWeight={500}
              textTransform={"capitalize"}
              fontSize={"sm"}
              fontFamily={"heading"}
            >
              Difficulty
            </Text>
            <Text fontWeight={400} fontSize={"sm"} fontFamily={"body"}>
              {device.info.bestSessionDiff}
            </Text>
          </Flex>
          <Flex justify={"space-between"}>
            <Text
              fontWeight={500}
              textTransform={"capitalize"}
              fontSize={"sm"}
              fontFamily={"heading"}
            >
              Best Difficulty
            </Text>
            <Text fontWeight={400} fontSize={"sm"} fontFamily={"body"}>
              {device.info.bestDiff}
            </Text>
          </Flex>
          <Flex justify={"space-between"}>
            <Text
              fontWeight={500}
              textTransform={"capitalize"}
              fontSize={"sm"}
              fontFamily={"heading"}
            >
              Uptime
            </Text>
            <Text fontWeight={400} fontSize={"sm"} fontFamily={"body"}>
              {formatDetailedTime(device.info.uptimeSeconds)}
            </Text>
          </Flex>
        </Flex>
      </AccordionPanel>
    </>
  );
};
